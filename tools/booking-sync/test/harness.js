'use strict';
/**
 * Loads the Apps Script sources into a vm context with fake Google services, so the sync logic can be exercised
 * with node --test. Nothing here talks to Google.
 */
process.env.TZ = 'Europe/London';

const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const SRC_DIR = path.join(__dirname, '..', 'src');
const SRC_FILES = ['dates.js', 'channels.js', 'config.js', 'ical.js', 'calendarSync.js', 'alerts.js', 'gmailEnrich.js', 'main.js'];

const EVENT_COLORS = {
  PALE_BLUE: '1', PALE_GREEN: '2', MAUVE: '3', PALE_RED: '4', YELLOW: '5', ORANGE: '6',
  CYAN: '7', GRAY: '8', BLUE: '9', GREEN: '10', RED: '11',
};

const FEED_URLS = {
  airbnb: 'https://www.airbnb.co.uk/calendar/ical/12345.ics?s=airbnbsecret',
  booking: 'https://ical.booking.com/v1/export?t=bookingsecret',
};
const CALENDAR_ID = 'abc123@group.calendar.google.com';
const OWNER_EMAIL = 'owner@example.com';

function pad(n) {
  return (n < 10 ? '0' : '') + n;
}

function isoDate(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function localMidnight(key) {
  const p = key.split('-').map(Number);
  return new Date(p[0], p[1] - 1, p[2]);
}

/** Builds a feed body the way Airbnb and Booking.com send them: CRLF, DATE values, escaped text. */
function icalFeed(events, prodid) {
  const compact = (key) => key.replace(/-/g, '');
  const lines = ['BEGIN:VCALENDAR', 'PRODID:' + (prodid || '-//Test//EN'), 'VERSION:2.0', 'CALSCALE:GREGORIAN'];
  events.forEach((e) => {
    lines.push('BEGIN:VEVENT');
    lines.push('DTEND;VALUE=DATE:' + compact(e.end));
    lines.push('DTSTART;VALUE=DATE:' + compact(e.start));
    lines.push('UID:' + e.uid);
    lines.push('SUMMARY:' + e.summary);
    if (e.description) lines.push('DESCRIPTION:' + e.description.replace(/\n/g, '\\n'));
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

class MockEvent {
  constructor(state, title, start, end, options) {
    this.state = state;
    this.id = 'evt-' + ++state.eventSeq;
    this.title = title;
    this.start = new Date(start.getTime());
    this.end = new Date(end.getTime());
    this.description = (options && options.description) || '';
    this.tags = {};
    this.color = '';
    this.deleted = false;
    this.allDay = true;
    this.writes = 0;
  }
  boundary(date) {
    // Optionally imitate a CalendarApp that hands back UTC midnight rather than local midnight.
    if (!this.state.allDayDatesAsUtc) return new Date(date.getTime());
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  }
  getId() { return this.id; }
  getTitle() { return this.title; }
  setTitle(t) { this.writes++; this.title = t; return this; }
  getDescription() { return this.description; }
  setDescription(d) { this.writes++; this.description = d; return this; }
  isAllDayEvent() { return this.allDay; }
  getAllDayStartDate() { return this.boundary(this.start); }
  getAllDayEndDate() { return this.boundary(this.end); }
  setAllDayDates(s, e) { this.writes++; this.start = new Date(s.getTime()); this.end = new Date(e.getTime()); return this; }
  getTag(k) { return Object.prototype.hasOwnProperty.call(this.tags, k) ? this.tags[k] : null; }
  setTag(k, v) { this.writes++; this.tags[k] = String(v); return this; }
  getAllTagKeys() { return Object.keys(this.tags); }
  deleteTag(k) { this.writes++; delete this.tags[k]; return this; }
  getColor() { return this.color; }
  setColor(c) { this.writes++; this.color = String(c); return this; }
  deleteEvent() { this.writes++; this.deleted = true; }
}

class MockCalendar {
  constructor(state) {
    this.state = state;
  }
  getEvents(start, end) {
    this.state.calendarReads++;
    return this.state.events.filter((e) => !e.deleted && e.start.getTime() < end.getTime() && e.end.getTime() > start.getTime());
  }
  createAllDayEvent(title, start, end, options) {
    const event = new MockEvent(this.state, title, start, end, options);
    this.state.events.push(event);
    return event;
  }
}

/** Copies a value out of the vm realm so strict deep equality works against literals. */
function plain(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function createHarness(options) {
  options = options || {};
  const state = {
    now: options.now || new Date(2026, 8, 23, 10, 30, 0),
    properties: Object.assign(
      { TARGET_CALENDAR_ID: CALENDAR_ID, AIRBNB_ICAL_URL: FEED_URLS.airbnb, BOOKING_ICAL_URL: FEED_URLS.booking },
      options.properties || {}
    ),
    feeds: {},
    fetches: [],
    events: [],
    eventSeq: 0,
    calendarReads: 0,
    allDayDatesAsUtc: Boolean(options.allDayDatesAsUtc),
    emails: [],
    triggers: [],
    lockBusy: false,
    logs: [],
    gmailSearches: [],
    threads: [],
    labels: {},
  };
  const calendar = new MockCalendar(state);
  const log = (level) => (...args) => state.logs.push({ level, message: args.map(String).join(' ') });

  const globals = {
    console: { log: log('log'), info: log('log'), warn: log('warn'), error: log('error') },
    UrlFetchApp: {
      fetch(url, opts) {
        state.fetches.push({ url, opts });
        const reply = state.feeds[url];
        if (!reply) throw new Error('Unexpected fetch: ' + url);
        if (reply.throws) throw new Error(reply.throws);
        return {
          getResponseCode: () => (reply.code === undefined ? 200 : reply.code),
          getContentText: () => reply.body || '',
        };
      },
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => (Object.prototype.hasOwnProperty.call(state.properties, k) ? state.properties[k] : null),
        setProperty(k, v) { state.properties[k] = String(v); return this; },
        deleteProperty(k) { delete state.properties[k]; return this; },
        getProperties: () => Object.assign({}, state.properties),
        setProperties(o) { Object.assign(state.properties, o); return this; },
      }),
    },
    CalendarApp: {
      EventColor: EVENT_COLORS,
      getCalendarById: (id) => (id === CALENDAR_ID ? calendar : null),
    },
    MailApp: { sendEmail: (message) => { state.emails.push(message); } },
    LockService: {
      getScriptLock: () => ({ tryLock: () => !state.lockBusy, releaseLock: () => {} }),
    },
    ScriptApp: {
      newTrigger(handler) {
        const trigger = { getHandlerFunction: () => handler };
        return { timeBased: () => ({ everyMinutes: (n) => { trigger.minutes = n; return { create: () => { state.triggers.push(trigger); return trigger; } }; } }) };
      },
      getProjectTriggers: () => state.triggers.slice(),
      deleteTrigger: (t) => { state.triggers = state.triggers.filter((x) => x !== t); },
    },
    Session: {
      getEffectiveUser: () => ({ getEmail: () => OWNER_EMAIL }),
      getScriptTimeZone: () => 'Europe/London',
    },
    GmailApp: {
      search: (query) => { state.gmailSearches.push(query); return state.threads; },
      getUserLabelByName: (name) => state.labels[name] || null,
      createLabel: (name) => { state.labels[name] = { getName: () => name }; return state.labels[name]; },
    },
  };

  const context = vm.createContext(globals);
  SRC_FILES.forEach((file) => {
    vm.runInContext(fs.readFileSync(path.join(SRC_DIR, file), 'utf8'), context, { filename: file });
  });
  const VmDate = vm.runInContext('Date', context);
  context.nowDate = () => new VmDate(state.now.getTime());

  const h = {
    state,
    context,
    FEED_URLS,
    CALENDAR_ID,
    OWNER_EMAIL,
    /** Calls a top-level function from the sources by name. */
    run(name, ...args) {
      return vm.runInContext(name, context).apply(null, args);
    },
    /** Like run, but returns a copy of the result usable with deepEqual. */
    data(name, ...args) {
      return plain(h.run(name, ...args));
    },
    value(name) {
      return vm.runInContext(name, context);
    },
    setNow(date) {
      state.now = date;
    },
    feed(channel, events, prodid) {
      state.feeds[FEED_URLS[channel]] = { code: 200, body: icalFeed(events, prodid) };
    },
    feedRaw(channel, reply) {
      state.feeds[FEED_URLS[channel]] = reply;
    },
    config(overrides) {
      return h.run('getConfig', overrides || {});
    },
    sync(overrides) {
      return h.run('syncCalendar', h.config(overrides));
    },
    /** Seeds an event as if an earlier run (or a person) had created it. */
    seedEvent(spec) {
      const event = calendar.createAllDayEvent(spec.title || 'seed', localMidnight(spec.start), localMidnight(spec.end), {
        description: spec.description || '',
      });
      Object.keys(spec.tags || {}).forEach((k) => event.setTag(k, spec.tags[k]));
      if (spec.color) event.setColor(spec.color);
      if (spec.allDay === false) event.allDay = false;
      event.writes = 0;
      return event;
    },
    events() {
      return state.events
        .filter((e) => !e.deleted)
        .sort((a, b) => a.start - b.start || a.title.localeCompare(b.title))
        .map((e) => ({
          title: e.title,
          start: isoDate(e.start),
          end: isoDate(e.end),
          color: e.color,
          description: e.description,
          tags: Object.assign({}, e.tags),
          data: e.tags.syncData ? JSON.parse(e.tags.syncData) : null,
        }));
    },
    totalWrites() {
      return state.events.reduce((sum, e) => sum + e.writes, 0);
    },
    logs(level) {
      return state.logs.filter((l) => !level || l.level === level).map((l) => l.message);
    },
  };
  return h;
}

module.exports = { createHarness, plain, icalFeed, EVENT_COLORS, FEED_URLS, CALENDAR_ID, OWNER_EMAIL };
