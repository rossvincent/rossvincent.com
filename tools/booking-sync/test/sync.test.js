'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHarness, plain, EVENT_COLORS } = require('./harness.js');

// "Today" for every test is Wednesday 23 September 2026.
const AIRBNB_DESCRIPTION =
  'Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMABCDEFGH\nPhone Number (Last 4 Digits): 1234';

function airbnbEvents() {
  return [
    { uid: 'res-1@airbnb.com', start: '2026-09-28', end: '2026-10-03', summary: 'Reserved', description: AIRBNB_DESCRIPTION },
    { uid: 'block-1@airbnb.com', start: '2026-10-10', end: '2026-10-12', summary: 'Airbnb (Not available)' },
  ];
}

function bookingEvents() {
  return [{ uid: 'bk-1@booking.com', start: '2026-11-01', end: '2026-11-05', summary: 'CLOSED - Not available' }];
}

function setup(options) {
  const h = createHarness(options);
  h.feed('airbnb', airbnbEvents());
  h.feed('booking', bookingEvents());
  return h;
}

test('first run creates one event per feed entry with the right title, dates, colour and tags', () => {
  const h = setup();
  const ctx = h.sync();
  assert.deepEqual(plain(ctx.stats.airbnb), { feed: 2, created: 2, updated: 0, unchanged: 0, deleted: 0, keptPast: 0 });
  assert.deepEqual(plain(ctx.stats.booking), { feed: 1, created: 1, updated: 0, unchanged: 0, deleted: 0, keptPast: 0 });

  const events = h.events();
  assert.deepEqual(
    events.map((e) => [e.title, e.start, e.end, e.color]),
    [
      ['\u{1F3E0} Airbnb – Reserved', '2026-09-28', '2026-10-03', EVENT_COLORS.RED],
      ['⛔ Blocked', '2026-10-10', '2026-10-12', EVENT_COLORS.GRAY],
      ['\u{1F3E8} Booking.com – Reserved', '2026-11-01', '2026-11-05', EVENT_COLORS.BLUE],
    ]
  );

  const reserved = events[0];
  assert.equal(reserved.tags.sourceUid, 'res-1@airbnb.com');
  assert.equal(reserved.tags.channel, 'airbnb');
  assert.deepEqual(reserved.data, {
    channel: 'airbnb',
    feedStatus: 'reserved',
    summary: 'Reserved',
    checkIn: '2026-09-28',
    checkOut: '2026-10-03',
    reservationUrl: 'https://www.airbnb.com/hosting/reservations/details/HMABCDEFGH',
    reference: 'HMABCDEFGH',
    phoneLast4: '1234',
  });
  assert.equal(
    reserved.description,
    [
      'Channel: Airbnb',
      'Status: Reserved',
      'Check-in: Mon 28 Sep 2026',
      'Check-out: Sat 3 Oct 2026 (5 nights)',
      'Reference: HMABCDEFGH',
      'Reservation: https://www.airbnb.com/hosting/reservations/details/HMABCDEFGH',
      'Phone (last 4 digits): 1234',
      '',
      'Synced by booking-sync. Edits made here are overwritten on the next run.',
    ].join('\n')
  );
  assert.match(events[1].description, /Status: Blocked by hand on Airbnb/);
  assert.match(events[1].description, /Feed summary: Airbnb \(Not available\)/);
  assert.match(events[2].description, /Status: Unconfirmed\. The Booking\.com feed does not say/);
  assert.equal(events[2].data.feedStatus, 'unconfirmed');
});

test('a second run against the same feeds writes nothing', () => {
  const h = setup();
  h.sync();
  const writesAfterFirstRun = h.totalWrites();
  const ctx = h.sync();
  assert.equal(h.totalWrites(), writesAfterFirstRun);
  assert.equal(h.events().length, 3);
  assert.deepEqual(plain(ctx.stats.airbnb), { feed: 2, created: 0, updated: 0, unchanged: 2, deleted: 0, keptPast: 0 });
  assert.equal(ctx.stats.airbnb.unchanged, 2);
  assert.equal(ctx.stats.booking.unchanged, 1);
  assert.deepEqual(plain(ctx.changes), []);
});

test('changed dates in the feed move the event and touch nothing else', () => {
  const h = setup();
  h.sync();
  const writes = h.totalWrites();
  const moved = airbnbEvents();
  moved[0].end = '2026-10-05';
  h.feed('airbnb', moved);
  const ctx = h.sync();
  assert.equal(ctx.stats.airbnb.updated, 1);
  assert.equal(ctx.stats.airbnb.unchanged, 1);
  const reserved = h.events()[0];
  assert.equal(reserved.end, '2026-10-05');
  assert.match(reserved.description, /Check-out: Mon 5 Oct 2026 \(7 nights\)/);
  assert.equal(reserved.data.checkOut, '2026-10-05');
  // dates, description and sync data: three writes, no title or colour write
  assert.equal(h.totalWrites(), writes + 3);
  assert.match(ctx.changes[0], /^UPDATE \[airbnb\] .*dates 2026-09-28\.\.2026-10-03 to 2026-09-28\.\.2026-10-05; description; sync data$/);
});

test('an upcoming event whose UID left the feed is deleted; past and in-progress ones are kept', () => {
  const h = setup();
  h.seedEvent({ title: 'old stay', start: '2026-09-01', end: '2026-09-05', tags: { sourceUid: 'past@airbnb.com', channel: 'airbnb', syncData: '{}' } });
  h.seedEvent({ title: 'current stay', start: '2026-09-21', end: '2026-09-25', tags: { sourceUid: 'now@airbnb.com', channel: 'airbnb', syncData: '{}' } });
  h.seedEvent({ title: 'gone', start: '2026-12-01', end: '2026-12-03', tags: { sourceUid: 'gone@airbnb.com', channel: 'airbnb', syncData: '{}' } });
  h.seedEvent({ title: 'starts today', start: '2026-09-23', end: '2026-09-25', tags: { sourceUid: 'today@airbnb.com', channel: 'airbnb', syncData: '{}' } });
  const ctx = h.sync();
  assert.equal(ctx.stats.airbnb.deleted, 2);
  assert.equal(ctx.stats.airbnb.keptPast, 2);
  const titles = h.events().map((e) => e.title);
  assert.ok(titles.includes('old stay'));
  assert.ok(titles.includes('current stay'));
  assert.ok(!titles.includes('gone'));
  assert.ok(!titles.includes('starts today'));
  assert.ok(h.logs('log').some((m) => /No longer in feed but already started, left alone: 2026-09-21\.\.2026-09-25 "current stay"/.test(m)));
});

test('a failed feed skips creation and deletion for that channel only, and counts as a failure', () => {
  const h = setup();
  h.sync();
  h.feedRaw('airbnb', { code: 500, body: 'Server error' });
  h.feed('booking', []);
  const ctx = h.sync();
  assert.equal(ctx.feeds.airbnb.ok, false);
  assert.equal(ctx.feeds.airbnb.error, 'HTTP 500');
  assert.deepEqual(plain(ctx.stats.airbnb), { feed: 0, created: 0, updated: 0, unchanged: 0, deleted: 0, keptPast: 0 });
  assert.equal(h.events().filter((e) => e.tags.channel === 'airbnb').length, 2);
  assert.equal(h.state.properties['state.airbnb.failures'], '1');
  assert.equal(h.state.properties['state.airbnb.lastError'], 'HTTP 500');
  assert.ok(h.logs('warn').some((m) => /\[airbnb\] HTTP 500\. Nothing created or deleted/.test(m)));
});

test('a 200 that is not an iCalendar document is treated as a failed feed', () => {
  const h = setup();
  h.sync();
  h.feedRaw('airbnb', { code: 200, body: '<!doctype html><html><body>Please sign in</body></html>' });
  const ctx = h.sync();
  assert.equal(ctx.feeds.airbnb.ok, false);
  assert.match(ctx.feeds.airbnb.error, /not an iCalendar feed/);
  assert.equal(h.events().filter((e) => e.tags.channel === 'airbnb').length, 2);
});

test('a feed that parses to zero events skips deletion while upcoming events exist, and is fine otherwise', () => {
  const h = setup();
  h.sync();
  h.feed('booking', []);
  let ctx = h.sync();
  assert.equal(ctx.stats.booking.deleted, 0);
  assert.equal(h.events().length, 3);
  assert.equal(h.state.properties['state.booking.failures'], '1');
  assert.ok(h.logs('warn').some((m) => /\[booking\] Feed parsed to zero events while 1 upcoming Booking\.com event\(s\)/.test(m)));

  // Once nothing upcoming remains for the channel, an empty feed is simply an empty feed.
  h.state.events.filter((e) => e.tags.channel === 'booking').forEach((e) => { e.deleted = true; });
  ctx = h.sync();
  assert.equal(ctx.feeds.booking.ok, true);
  assert.equal(h.state.properties['state.booking.failures'], undefined);
});

test('dry run logs every change with a DRY RUN prefix and writes nothing at all', () => {
  const h = setup({ properties: { DRY_RUN: 'true' } });
  h.seedEvent({ title: 'gone', start: '2026-12-01', end: '2026-12-03', tags: { sourceUid: 'gone@airbnb.com', channel: 'airbnb', syncData: '{}' } });
  h.feedRaw('booking', { code: 500 });
  const propertiesBefore = JSON.stringify(h.state.properties);
  const ctx = h.sync();
  assert.equal(ctx.config.dryRun, true);
  assert.equal(ctx.stats.airbnb.created, 2);
  assert.equal(ctx.stats.airbnb.deleted, 1);
  assert.equal(h.events().length, 1);
  assert.equal(h.totalWrites(), 0);
  assert.equal(JSON.stringify(h.state.properties), propertiesBefore);
  assert.equal(h.state.emails.length, 0);
  assert.ok(ctx.changes.every((line) => line.startsWith('DRY RUN ')));
  assert.equal(ctx.changes.length, 3);
  assert.ok(h.logs('log').some((m) => /\[booking-sync\] Dry run finished\. airbnb: 2 in feed, created 2, updated 0, unchanged 0, deleted 1 \| booking: feed failed \(HTTP 500\)/.test(m)));
});

test('the dryRun entry point forces a dry run even when DRY_RUN is unset', () => {
  const h = setup();
  const ctx = h.run('dryRun');
  assert.equal(ctx.config.dryRun, true);
  assert.equal(h.events().length, 0);
});

test('events without a sourceUid tag are never touched or deleted', () => {
  const h = setup();
  const manual = h.seedEvent({ title: 'Cleaner booked', start: '2026-10-03', end: '2026-10-04' });
  h.sync();
  assert.equal(manual.deleted, false);
  assert.equal(manual.writes, 0);
  assert.equal(h.events().length, 4);
  assert.ok(h.logs('log').some((m) => /1 event\(s\) on the calendar have no sourceUid tag/.test(m)));
});

test('INCLUDE_CHECKOUT_DAY extends every block through the checkout day', () => {
  const h = setup({ properties: { INCLUDE_CHECKOUT_DAY: 'true' } });
  h.sync();
  const reserved = h.events()[0];
  assert.equal(reserved.start, '2026-09-28');
  assert.equal(reserved.end, '2026-10-04');
  assert.match(reserved.description, /Check-out: Sat 3 Oct 2026 \(5 nights\)/);
});

test('guest details from email survive feed updates, and a cancelled event is not deleted when it leaves the feed', () => {
  const h = setup();
  h.sync();
  const event = h.state.events.find((e) => e.tags.sourceUid === 'res-1@airbnb.com');
  const data = JSON.parse(event.tags.syncData);
  Object.assign(data, { guestName: 'Sarah Marks', guestCount: 4, bookingRef: 'HMABCDEFGH', emailStatus: 'confirmed', emailDate: '2026-09-20' });
  event.setTag('syncData', JSON.stringify(data));

  const moved = airbnbEvents();
  moved[0].end = '2026-10-04';
  h.feed('airbnb', moved);
  h.sync();
  const reserved = h.events()[0];
  assert.equal(reserved.title, '\u{1F3E0} Sarah M. (4) – Airbnb');
  assert.equal(reserved.end, '2026-10-04');
  assert.equal(reserved.data.guestName, 'Sarah Marks');
  assert.equal(reserved.data.emailStatus, 'confirmed');
  assert.match(reserved.description, /Status: Reserved, confirmed by email on Sun 20 Sep 2026/);
  assert.match(reserved.description, /Guest: Sarah Marks, 4 guests/);

  const ctxBefore = h.sync();
  const record = h.run('findEventForEmail', ctxBefore, 'airbnb', '2026-09-28', '2026-10-04');
  h.run('applyEmailToEvent', ctxBefore, record, { type: 'cancellation' }, '2026-09-22');
  h.feed('airbnb', [moved[1]]);
  const ctx = h.sync();
  assert.equal(ctx.stats.airbnb.deleted, 0);
  assert.equal(h.events().length, 3);
  assert.ok(h.logs('log').some((m) => /Left cancelled event in place/.test(m)));
  // The cancelled marker keeps its title even though the feed no longer mentions the booking.
  assert.ok(h.events().some((e) => e.title === '❌ Cancelled – Sarah M. (4) – Airbnb'));
});

test('an unrecognised Airbnb summary is shown in grey with the raw summary and logged', () => {
  const h = setup();
  h.feed('airbnb', [{ uid: 'odd@airbnb.com', start: '2026-10-20', end: '2026-10-22', summary: 'Pending' }]);
  h.sync();
  const odd = h.events().find((e) => e.tags.sourceUid === 'odd@airbnb.com');
  assert.equal(odd.title, '\u{1F3E0} Airbnb – Pending');
  assert.equal(odd.color, EVENT_COLORS.GRAY);
  assert.match(odd.description, /Status: Unknown entry from the Airbnb feed/);
  assert.ok(h.logs('warn').some((m) => /Unrecognised summary "Pending"/.test(m)));
});

test('two calendar events sharing a UID are reported and only the first is updated', () => {
  const h = setup();
  h.seedEvent({ title: 'a', start: '2026-09-28', end: '2026-10-03', tags: { sourceUid: 'res-1@airbnb.com', channel: 'airbnb' } });
  h.seedEvent({ title: 'b', start: '2026-09-28', end: '2026-10-03', tags: { sourceUid: 'res-1@airbnb.com', channel: 'airbnb' } });
  h.sync();
  const titles = h.events().filter((e) => e.tags.sourceUid === 'res-1@airbnb.com').map((e) => e.title);
  assert.deepEqual(titles.sort(), ['b', '\u{1F3E0} Airbnb – Reserved'].sort());
  assert.ok(h.logs('warn').some((m) => /2 calendar events share UID res-1@airbnb.com/.test(m)));
});

test('a tracked event that was turned into a timed event by hand is left alone', () => {
  const h = setup();
  const changed = h.seedEvent({ title: 'timed', start: '2026-09-28', end: '2026-10-03', allDay: false, tags: { sourceUid: 'res-1@airbnb.com', channel: 'airbnb' } });
  h.sync();
  assert.equal(changed.writes, 0);
  assert.equal(changed.deleted, false);
  // The feed entry then counts as missing, so a fresh event is created next to it.
  assert.equal(h.events().filter((e) => e.tags.sourceUid === 'res-1@airbnb.com').length, 2);
});

test('all-day boundaries read back as UTC midnight still compare equal to the feed dates', () => {
  const h = setup({ allDayDatesAsUtc: true });
  h.sync();
  const writes = h.totalWrites();
  const ctx = h.sync();
  assert.equal(ctx.stats.airbnb.unchanged, 2);
  assert.equal(h.totalWrites(), writes);
});

test('the calendar read window grows to cover feed entries far in the future', () => {
  const h = setup();
  h.feed('airbnb', [{ uid: 'far@airbnb.com', start: '2029-06-01', end: '2029-06-08', summary: 'Reserved' }]);
  h.sync();
  const writes = h.totalWrites();
  h.sync();
  assert.equal(h.totalWrites(), writes);
  assert.equal(h.events().filter((e) => e.tags.sourceUid === 'far@airbnb.com').length, 1);
});

test('a channel with no URL is skipped without touching its events', () => {
  const h = setup({ properties: { BOOKING_ICAL_URL: '' } });
  h.seedEvent({ title: 'booking stays', start: '2026-12-01', end: '2026-12-03', tags: { sourceUid: 'x@booking.com', channel: 'booking', syncData: '{}' } });
  const ctx = h.sync();
  assert.equal(ctx.feeds.booking.configured, false);
  assert.equal(h.events().filter((e) => e.title === 'booking stays').length, 1);
  assert.equal(h.state.fetches.length, 1);
});

test('missing configuration and a missing calendar fail loudly', () => {
  const h = createHarness({ properties: { TARGET_CALENDAR_ID: '', AIRBNB_ICAL_URL: '', BOOKING_ICAL_URL: '' } });
  assert.throws(() => h.config(), /Missing Script Properties: TARGET_CALENDAR_ID, AIRBNB_ICAL_URL or BOOKING_ICAL_URL/);

  const h2 = setup({ properties: { TARGET_CALENDAR_ID: 'nope@group.calendar.google.com' } });
  assert.throws(() => h2.sync(), /Calendar not found: nope@group.calendar.google.com/);
});

test('describeConfig masks the feed URLs', () => {
  const h = setup();
  const lines = h.run('describeConfig', h.config());
  assert.equal(lines[0], 'Airbnb feed: www.airbnb.co.uk/…cret');
  assert.equal(lines[1], 'Booking.com feed: ical.booking.com/…cret');
  assert.ok(lines.some((l) => l === 'Alerts to: owner@example.com (repeat every 24 h while broken)'));
});

test('a description that Calendar has marked up with HTML is not rewritten', () => {
  const h = setup();
  h.sync();
  const event = h.state.events.find((e) => e.tags.sourceUid === 'res-1@airbnb.com');
  event.description = event.description
    .replace(/\n/g, '<br>')
    .replace('https://www.airbnb.com/hosting/reservations/details/HMABCDEFGH', '<a href="https://www.airbnb.com/hosting/reservations/details/HMABCDEFGH">https://www.airbnb.com/hosting/reservations/details/HMABCDEFGH</a>');
  const writes = h.totalWrites();
  const ctx = h.sync();
  assert.equal(ctx.stats.airbnb.unchanged, 2);
  assert.equal(h.totalWrites(), writes);
  assert.equal(h.run('sameText', 'a &amp; b\r\n', 'a & b'), true);
  assert.equal(h.run('sameText', 'Check-out: Sat', 'Check-out: Sun'), false);
});
