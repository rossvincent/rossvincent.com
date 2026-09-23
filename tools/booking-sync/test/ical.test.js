'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./harness.js');

const h = createHarness();

const AIRBNB_FEED = [
  'BEGIN:VCALENDAR',
  'PRODID:-//Airbnb Inc//Hosting Calendar 0.8.8//EN',
  'CALSCALE:GREGORIAN',
  'VERSION:2.0',
  'BEGIN:VEVENT',
  'DTEND;VALUE=DATE:20261003',
  'DTSTART;VALUE=DATE:20260928',
  'UID:1414f3a1b2c3d4e5-9f8e7d6c5b4a3210@airbnb.com',
  'SUMMARY:Reserved',
  'DESCRIPTION:Reservation URL: https://www.airbnb.com/hosting/reservations/de',
  ' tails/HMABCDEFGH\\nPhone Number (Last 4 Digits): 1234',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'DTEND;VALUE=DATE:20261012',
  'DTSTART;VALUE=DATE:20261010',
  'UID:block-1@airbnb.com',
  'SUMMARY:Airbnb (Not available)',
  'END:VEVENT',
  'END:VCALENDAR',
  '',
].join('\r\n');

test('parses an Airbnb feed: CRLF, folded lines and escaped newlines', () => {
  const { events, warnings } = h.data('parseIcal', AIRBNB_FEED);
  assert.deepEqual(warnings, []);
  assert.equal(events.length, 2);
  assert.deepEqual(events[0], {
    uid: '1414f3a1b2c3d4e5-9f8e7d6c5b4a3210@airbnb.com',
    start: '2026-09-28',
    end: '2026-10-03',
    summary: 'Reserved',
    description:
      'Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMABCDEFGH\nPhone Number (Last 4 Digits): 1234',
  });
  assert.equal(events[1].summary, 'Airbnb (Not available)');
  assert.equal(events[1].description, '');
});

test('parses a Booking.com style feed with LF endings and extra properties', () => {
  const text = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Booking.com//iCal//EN',
    'BEGIN:VEVENT',
    'DTSTAMP:20260901T000000Z',
    'DTSTART;VALUE=DATE:20261101',
    'DTEND;VALUE=DATE:20261105',
    'SUMMARY:CLOSED - Not available',
    'UID:abc123@booking.com',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\n');
  const { events, warnings } = h.data('parseIcal', text);
  assert.deepEqual(warnings, []);
  assert.deepEqual(events, [
    { uid: 'abc123@booking.com', start: '2026-11-01', end: '2026-11-05', summary: 'CLOSED - Not available', description: '' },
  ]);
});

test('unescapes commas, semicolons and backslashes in text values', () => {
  const text = 'BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:x\nDTSTART;VALUE=DATE:20260101\nDTEND;VALUE=DATE:20260102\nSUMMARY:One\\, two\; three \\\\ four\nEND:VEVENT\nEND:VCALENDAR';
  const { events } = h.data('parseIcal', text);
  assert.equal(events[0].summary, 'One, two; three \\ four');
});

test('a missing DTEND means a one-day entry, and a DTEND on or before DTSTART is corrected with a warning', () => {
  const text = [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT', 'UID:a', 'DTSTART;VALUE=DATE:20260301', 'SUMMARY:Reserved', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:b', 'DTSTART;VALUE=DATE:20260301', 'DTEND;VALUE=DATE:20260301', 'SUMMARY:Reserved', 'END:VEVENT',
    'END:VCALENDAR',
  ].join('\n');
  const { events, warnings } = h.data('parseIcal', text);
  assert.equal(events[0].end, '2026-03-02');
  assert.equal(events[1].end, '2026-03-02');
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /UID b: DTEND 2026-03-01 is not after DTSTART/);
});

test('entries without a UID or with a malformed start are skipped, duplicates keep the first', () => {
  const text = [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT', 'DTSTART;VALUE=DATE:20260301', 'DTEND;VALUE=DATE:20260302', 'SUMMARY:No uid', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:bad', 'DTSTART;VALUE=DATE:20261399', 'SUMMARY:Bad date', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:dup', 'DTSTART;VALUE=DATE:20260401', 'DTEND;VALUE=DATE:20260403', 'SUMMARY:First', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:dup', 'DTSTART;VALUE=DATE:20260501', 'DTEND;VALUE=DATE:20260503', 'SUMMARY:Second', 'END:VEVENT',
    'END:VCALENDAR',
  ].join('\n');
  const { events, warnings } = h.data('parseIcal', text);
  assert.deepEqual(events.map((e) => e.uid + ':' + e.summary), ['dup:First']);
  assert.equal(warnings.length, 3);
  assert.match(warnings[0], /no UID/);
  assert.match(warnings[1], /malformed DTSTART/);
  assert.match(warnings[2], /Duplicate UID dup/);
});

test('date-time values are reduced to their date with a warning', () => {
  const text = 'BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:t\nDTSTART;TZID=Europe/London:20260615T150000\nDTEND;VALUE=DATE-TIME:20260618T100000Z\nSUMMARY:Timed\nEND:VEVENT\nEND:VCALENDAR';
  const { events, warnings } = h.data('parseIcal', text);
  assert.equal(events[0].start, '2026-06-15');
  assert.equal(events[0].end, '2026-06-18');
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /DTEND is not a DATE value/);
});

test('an unfinished VEVENT at the end of the feed is ignored with a warning', () => {
  const text = 'BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:a\nDTSTART;VALUE=DATE:20260301\nDTEND;VALUE=DATE:20260302\nSUMMARY:Reserved\nEND:VEVENT\nBEGIN:VEVENT\nUID:half\nDTSTART;VALUE=DATE:20260401';
  const { events, warnings } = h.data('parseIcal', text);
  assert.equal(events.length, 1);
  assert.match(warnings[0], /ended inside a VEVENT/);
});

test('parseIcalLine keeps a colon inside a quoted parameter value', () => {
  const prop = h.data('parseIcalLine', 'ATTENDEE;CN="Smith: J";ROLE=CHAIR:mailto:j@example.com');
  assert.equal(prop.name, 'ATTENDEE');
  assert.deepEqual(prop.params, { CN: 'Smith: J', ROLE: 'CHAIR' });
  assert.equal(prop.value, 'mailto:j@example.com');
  assert.equal(h.data('parseIcalLine', 'no separator here'), null);
});

test('parseIcalDate rejects impossible dates', () => {
  assert.equal(h.run('parseIcalDate', '20260229'), null);
  assert.equal(h.run('parseIcalDate', '20280229'), '2028-02-29');
  assert.equal(h.run('parseIcalDate', '2026-09-15'), null);
});

test('fetchIcal reports non-200, exceptions and non-iCal bodies as failures', () => {
  const url = h.FEED_URLS.airbnb;
  h.feedRaw('airbnb', { code: 403, body: 'Forbidden' });
  assert.deepEqual(h.data('fetchIcal', url), { ok: false, error: 'HTTP 403' });

  h.feedRaw('airbnb', { throws: 'DNS error' });
  assert.deepEqual(h.data('fetchIcal', url), { ok: false, error: 'Fetch failed: DNS error' });

  h.feedRaw('airbnb', { code: 200, body: '<html>Sign in</html>' });
  assert.match(h.data('fetchIcal', url).error, /not an iCalendar feed/);

  h.feedRaw('airbnb', { code: 200, body: AIRBNB_FEED });
  const ok = h.data('fetchIcal', url);
  assert.equal(ok.ok, true);
  assert.equal(ok.text, AIRBNB_FEED);
  const last = h.state.fetches[h.state.fetches.length - 1];
  assert.equal(last.opts.muteHttpExceptions, true);
});
