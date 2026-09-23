/**
 * Phase 1: mirror the channel feeds into the target calendar.
 *
 * Every event this script creates carries three tags, which is how a later run finds it again:
 *   sourceUid  the UID of the feed entry it came from
 *   channel    airbnb or booking
 *   syncData   JSON with everything needed to redraw the title and description: the feed fields, plus the guest
 *              details that the Gmail step (Phase 2) adds later
 * Events on the calendar without a sourceUid tag are not ours and are never touched, so notes can be added by hand.
 *
 * The run is idempotent: a second run against an unchanged feed makes no writes.
 */

const TAG = { sourceUid: 'sourceUid', channel: 'channel', data: 'syncData' };

/** How far around today the calendar is read. Widened automatically when a feed reaches further. */
const LOOKBACK_DAYS = 365;
const LOOKAHEAD_DAYS = 730;

/** Fields that come from the feed and are rewritten on every run. */
const FEED_FIELDS = ['channel', 'feedStatus', 'summary', 'checkIn', 'checkOut', 'reservationUrl', 'reference', 'phoneLast4'];
/** Fields that come from email (Phase 2) and survive feed updates. */
const EMAIL_FIELDS = ['guestName', 'guestCount', 'bookingRef', 'payout', 'emailStatus', 'emailDate'];

const SYNC_FOOTER = 'Synced by booking-sync. Edits made here are overwritten on the next run.';

/**
 * Runs one sync of every configured feed into the target calendar.
 * Returns the run context (feeds, existing events, stats) for the later steps and for tests.
 */
function syncCalendar(config) {
  const calendar = CalendarApp.getCalendarById(config.targetCalendarId);
  if (!calendar) {
    throw new Error(
      'Calendar not found: ' + config.targetCalendarId + '. Check TARGET_CALENDAR_ID and that this account can edit it.'
    );
  }

  const ctx = {
    config,
    calendar,
    today: todayKey(),
    feeds: {},
    existing: [],
    byUid: {},
    stats: {},
    changes: [],
    unmatched: [],
  };

  CHANNEL_KEYS.forEach((key) => {
    ctx.stats[key] = { feed: 0, created: 0, updated: 0, unchanged: 0, deleted: 0, keptPast: 0 };
    const url = config.feedUrls[key];
    ctx.feeds[key] = url ? loadFeed(CHANNELS[key], url) : { configured: false, ok: false, events: [] };
  });

  const span = calendarWindow(ctx);
  ctx.existing = loadTrackedEvents(calendar, span.start, span.end);
  ctx.byUid = groupByUid(ctx.existing);

  CHANNEL_KEYS.forEach((key) => {
    const channel = CHANNELS[key];
    const feed = ctx.feeds[key];
    const label = channel.name + ' feed';
    if (!feed.configured) return;
    if (!feed.ok) {
      console.warn('[' + key + '] ' + feed.error + '. Nothing created or deleted for this channel this run.');
      recordFailure(ctx.config, key, label, feed.error);
      return;
    }
    ctx.stats[key].feed = feed.events.length;
    if (feed.events.length === 0) {
      const upcoming = ctx.existing.filter((r) => r.channel === key && r.start >= ctx.today);
      if (upcoming.length) {
        const message =
          'Feed parsed to zero events while ' + upcoming.length + ' upcoming ' + channel.name +
          ' event(s) are on the calendar. Deletion skipped; check the feed.';
        console.warn('[' + key + '] ' + message);
        recordFailure(ctx.config, key, label, message);
        return;
      }
    }
    upsertChannel(ctx, channel, feed.events);
    deleteStaleEvents(ctx, channel, feed.events);
    recordSuccess(ctx.config, key, label);
  });

  logRunSummary(ctx);
  return ctx;
}

/** Fetches, parses and classifies one feed. Never throws. */
function loadFeed(channel, url) {
  const fetched = fetchIcal(url);
  if (!fetched.ok) return { configured: true, ok: false, error: fetched.error, events: [] };
  let parsed;
  try {
    parsed = parseIcal(fetched.text);
  } catch (e) {
    return { configured: true, ok: false, error: 'Parse failed: ' + (e && e.message ? e.message : String(e)), events: [] };
  }
  parsed.warnings.forEach((w) => console.warn('[' + channel.key + '] ' + w));
  const events = parsed.events.map((entry) => feedEventFrom(channel, entry));
  events
    .filter((fe) => fe.feedStatus === 'unknown')
    .forEach((fe) => console.warn('[' + channel.key + '] Unrecognised summary "' + fe.summary + '" (UID ' + fe.uid + '); shown in grey'));
  return { configured: true, ok: true, events, warnings: parsed.warnings };
}

/** A parsed feed entry plus what the channel knows about it. */
function feedEventFrom(channel, entry) {
  return Object.assign(
    {
      uid: entry.uid,
      channel: channel.key,
      feedStatus: channel.classify(entry.summary),
      summary: entry.summary,
      checkIn: entry.start,
      checkOut: entry.end,
    },
    channel.extract(entry.description || '')
  );
}

/** The span of calendar to read: a generous window around today, stretched to cover whatever the feeds contain. */
function calendarWindow(ctx) {
  let start = addDays(ctx.today, -LOOKBACK_DAYS);
  let end = addDays(ctx.today, LOOKAHEAD_DAYS);
  CHANNEL_KEYS.forEach((key) => {
    ctx.feeds[key].events.forEach((fe) => {
      if (fe.checkIn < start) start = fe.checkIn;
      if (fe.checkOut > end) end = fe.checkOut;
    });
  });
  return { start: dateFromKey(start), end: dateFromKey(addDays(end, 1)) };
}

/** Reads the events this script owns (those with a sourceUid tag) into plain records. */
function loadTrackedEvents(calendar, startDate, endDate) {
  const records = [];
  let ignored = 0;
  calendar.getEvents(startDate, endDate).forEach((event) => {
    const uid = event.getTag(TAG.sourceUid);
    if (!uid) {
      ignored++;
      return;
    }
    if (!event.isAllDayEvent()) {
      console.warn('Tracked event "' + event.getTitle() + '" is not all-day; it was changed by hand and is left alone');
      return;
    }
    records.push({
      event,
      uid,
      channel: event.getTag(TAG.channel) || '',
      start: allDayDateKey(event.getAllDayStartDate()),
      end: allDayDateKey(event.getAllDayEndDate()),
      title: event.getTitle() || '',
      description: event.getDescription() || '',
      color: String(event.getColor() || ''),
      model: parseSyncData(event.getTag(TAG.data)),
    });
  });
  if (ignored) console.log(ignored + ' event(s) on the calendar have no sourceUid tag and are left alone');
  return records;
}

function parseSyncData(json) {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    return {};
  }
}

function groupByUid(records) {
  const byUid = {};
  records.forEach((r) => {
    (byUid[r.uid] = byUid[r.uid] || []).push(r);
  });
  return byUid;
}

/** Creates or updates one calendar event per feed entry. */
function upsertChannel(ctx, channel, feedEvents) {
  feedEvents.forEach((fe) => {
    const matches = ctx.byUid[fe.uid] || [];
    if (matches.length > 1) {
      console.warn('[' + channel.key + '] ' + matches.length + ' calendar events share UID ' + fe.uid + '; updating the first, delete the others by hand');
    }
    const record = matches[0];
    const model = Object.assign(pickFields(fe, FEED_FIELDS), pickFields(record ? record.model : {}, EMAIL_FIELDS));
    const desired = desiredEvent(model, ctx.config);
    if (record) updateEvent(ctx, record, desired);
    else createEvent(ctx, fe.uid, desired);
  });
}

/**
 * Removes upcoming events whose UID has left the feed. Past and in-progress events are never deleted, and neither
 * are events an email has marked cancelled (in "mark" mode they stay as the record of the cancellation).
 */
function deleteStaleEvents(ctx, channel, feedEvents) {
  const inFeed = {};
  feedEvents.forEach((fe) => {
    inFeed[fe.uid] = true;
  });
  ctx.existing
    .filter((r) => r.channel === channel.key && !inFeed[r.uid] && !r.deleted)
    .forEach((r) => {
      const where = r.start + '..' + r.end + ' "' + r.title + '"';
      if (r.model.emailStatus === 'cancelled') {
        console.log('[' + channel.key + '] Left cancelled event in place: ' + where);
        return;
      }
      if (r.start < ctx.today) {
        ctx.stats[channel.key].keptPast++;
        console.log('[' + channel.key + '] No longer in feed but already started, left alone: ' + where);
        return;
      }
      ctx.stats[channel.key].deleted++;
      logChange(ctx, channel.key, 'DELETE', where + ' (no longer in feed)');
      r.deleted = true;
      if (ctx.config.dryRun) return;
      r.event.deleteEvent();
    });
}

/** Everything the calendar event should look like for a model. */
function desiredEvent(model, config) {
  const normalised = normaliseModel(model);
  return {
    model: normalised,
    start: normalised.checkIn,
    end: config.includeCheckoutDay ? addDays(normalised.checkOut, 1) : normalised.checkOut,
    title: renderTitle(normalised),
    description: renderDescription(normalised),
    color: colorFor(normalised),
  };
}

function createEvent(ctx, uid, desired) {
  const key = desired.model.channel;
  ctx.stats[key].created++;
  logChange(ctx, key, 'CREATE', desired.start + '..' + desired.end + ' "' + desired.title + '" (UID ' + uid + ')');
  const record = {
    event: null,
    uid,
    channel: key,
    start: desired.start,
    end: desired.end,
    title: desired.title,
    description: desired.description,
    color: String(desired.color),
    model: desired.model,
  };
  if (!ctx.config.dryRun) {
    const event = ctx.calendar.createAllDayEvent(desired.title, dateFromKey(desired.start), dateFromKey(desired.end), {
      description: desired.description,
    });
    event.setTag(TAG.sourceUid, uid);
    event.setTag(TAG.channel, key);
    event.setTag(TAG.data, JSON.stringify(desired.model));
    event.setColor(desired.color);
    record.event = event;
  }
  ctx.existing.push(record);
  (ctx.byUid[uid] = ctx.byUid[uid] || []).push(record);
  return record;
}

/** Applies only the parts of `desired` that differ from what is on the calendar. */
function updateEvent(ctx, record, desired) {
  const key = record.channel;
  const changes = [];
  if (record.start !== desired.start || record.end !== desired.end) {
    changes.push('dates ' + record.start + '..' + record.end + ' to ' + desired.start + '..' + desired.end);
  }
  if (record.title !== desired.title) changes.push('title "' + record.title + '" to "' + desired.title + '"');
  const descriptionChanged = !sameText(record.description, desired.description);
  if (descriptionChanged) changes.push('description');
  if (record.color !== String(desired.color)) changes.push('colour');
  const dataJson = JSON.stringify(desired.model);
  if (JSON.stringify(normaliseModel(record.model)) !== dataJson) changes.push('sync data');

  if (!changes.length) {
    ctx.stats[key].unchanged++;
    return;
  }
  ctx.stats[key].updated++;
  logChange(ctx, key, 'UPDATE', desired.start + '..' + desired.end + ' "' + desired.title + '": ' + changes.join('; '));

  if (!ctx.config.dryRun) {
    const event = record.event;
    if (record.start !== desired.start || record.end !== desired.end) {
      event.setAllDayDates(dateFromKey(desired.start), dateFromKey(desired.end));
    }
    if (record.title !== desired.title) event.setTitle(desired.title);
    if (descriptionChanged) event.setDescription(desired.description);
    if (record.color !== String(desired.color)) event.setColor(desired.color);
    event.setTag(TAG.data, dataJson);
  }
  Object.assign(record, {
    start: desired.start,
    end: desired.end,
    title: desired.title,
    description: desired.description,
    color: String(desired.color),
    model: desired.model,
  });
}

/**
 * Compares text the way Calendar may hand it back: HTML line breaks and tags stripped, entities decoded,
 * whitespace at line ends ignored. Without this a description that Calendar has marked up would be rewritten
 * on every run.
 */
function sameText(a, b) {
  return normaliseText(a) === normaliseText(b);
}

function normaliseText(text) {
  return String(text || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();
}

/** Copies the listed fields that have a value, in a fixed order so JSON comparisons are stable. */
function pickFields(source, fields) {
  const out = {};
  fields.forEach((field) => {
    const value = source ? source[field] : undefined;
    if (value !== undefined && value !== null && value !== '') out[field] = value;
  });
  return out;
}

function normaliseModel(model) {
  return Object.assign(pickFields(model, FEED_FIELDS), pickFields(model, EMAIL_FIELDS));
}

/** "Sarah Marks" becomes "Sarah M."; a lone first name is left as it is. */
function formatGuestName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts.join('');
  return parts[0] + ' ' + parts[parts.length - 1].charAt(0).toUpperCase() + '.';
}

function guestLabel(model) {
  if (!model.guestName) return '';
  return formatGuestName(model.guestName) + (model.guestCount ? ' (' + model.guestCount + ')' : '');
}

/**
 * Titles, per the plan:
 *   🏠 Airbnb – Reserved       🏨 Booking.com – Reserved       ⛔ Blocked
 *   🏠 Sarah M. (4) – Airbnb   once an email has supplied the guest
 *   ❌ Cancelled – Sarah M. (4) – Airbnb
 */
function renderTitle(model) {
  const channel = CHANNELS[model.channel] || { icon: '', name: model.channel };
  const sep = ' – ';
  const guest = guestLabel(model);
  if (model.emailStatus === 'cancelled') return '❌ Cancelled' + sep + (guest ? guest + sep : '') + channel.name;
  if (model.feedStatus === 'blocked') return '⛔ Blocked';
  if (model.feedStatus === 'unknown') return channel.icon + ' ' + channel.name + sep + (model.summary || 'Unknown');
  if (guest) return channel.icon + ' ' + guest + sep + channel.name;
  return channel.icon + ' ' + channel.name + sep + 'Reserved';
}

function statusText(model) {
  const channel = channelName(model.channel);
  if (model.emailStatus === 'cancelled') return 'Cancelled' + (model.emailDate ? ' (email of ' + formatDateKey(model.emailDate) + ')' : '');
  if (model.emailStatus === 'confirmed') return 'Reserved, confirmed by email' + (model.emailDate ? ' on ' + formatDateKey(model.emailDate) : '');
  switch (model.feedStatus) {
    case 'reserved':
      return 'Reserved';
    case 'unconfirmed':
      return 'Unconfirmed. The ' + channel + ' feed does not say whether this is a booking or dates blocked by hand.';
    case 'blocked':
      return 'Blocked by hand on ' + channel;
    default:
      return 'Unknown entry from the ' + channel + ' feed. Check it on ' + channel + '.';
  }
}

function renderDescription(model) {
  const nights = daysBetween(model.checkIn, model.checkOut);
  const lines = [
    'Channel: ' + channelName(model.channel),
    'Status: ' + statusText(model),
    'Check-in: ' + formatDateKey(model.checkIn),
    'Check-out: ' + formatDateKey(model.checkOut) + ' (' + nights + (nights === 1 ? ' night' : ' nights') + ')',
  ];
  if (model.guestName) lines.push('Guest: ' + model.guestName + (model.guestCount ? ', ' + model.guestCount + ' guests' : ''));
  const reference = model.bookingRef || model.reference;
  if (reference) lines.push('Reference: ' + reference);
  if (model.reservationUrl) lines.push('Reservation: ' + model.reservationUrl);
  if (model.phoneLast4) lines.push('Phone (last 4 digits): ' + model.phoneLast4);
  if (model.payout) lines.push('Payout: ' + model.payout);
  if (model.feedStatus === 'blocked' || model.feedStatus === 'unknown') lines.push('Feed summary: ' + (model.summary || ''));
  lines.push('');
  lines.push(SYNC_FOOTER);
  return lines.join('\n');
}

/** Airbnb red, Booking.com blue, everything that is not a live booking grey. */
function colorFor(model) {
  const colors = CalendarApp.EventColor;
  if (model.emailStatus === 'cancelled' || model.feedStatus === 'blocked' || model.feedStatus === 'unknown') return colors.GRAY;
  const channel = CHANNELS[model.channel];
  return channel ? colors[channel.color] : colors.GRAY;
}

function logChange(ctx, channelKey, action, detail) {
  const line = (ctx.config.dryRun ? 'DRY RUN ' : '') + action + ' [' + channelKey + '] ' + detail;
  ctx.changes.push(line);
  console.log(line);
}

function logRunSummary(ctx) {
  const parts = CHANNEL_KEYS.map((key) => {
    const feed = ctx.feeds[key];
    const s = ctx.stats[key];
    if (!feed.configured) return key + ': not configured';
    if (!feed.ok) return key + ': feed failed (' + feed.error + ')';
    return (
      key + ': ' + s.feed + ' in feed, created ' + s.created + ', updated ' + s.updated + ', unchanged ' + s.unchanged +
      ', deleted ' + s.deleted + (s.keptPast ? ', kept ' + s.keptPast + ' past' : '')
    );
  });
  console.log('[booking-sync] ' + (ctx.config.dryRun ? 'Dry run' : 'Run') + ' finished. ' + parts.join(' | '));
}
