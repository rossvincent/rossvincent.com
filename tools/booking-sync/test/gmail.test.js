'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHarness, plain } = require('./harness.js');

function setup(options) {
  const h = createHarness(options);
  h.feed('airbnb', [
    { uid: 'a1@airbnb.com', start: '2026-09-28', end: '2026-10-03', summary: 'Reserved' },
    { uid: 'a2@airbnb.com', start: '2026-10-03', end: '2026-10-06', summary: 'Reserved' },
  ]);
  h.feed('booking', [{ uid: 'b1@booking.com', start: '2026-09-28', end: '2026-10-03', summary: 'CLOSED - Not available' }]);
  return h;
}

test('formatGuestName shortens a full name to first name and initial', () => {
  const h = createHarness();
  assert.equal(h.run('formatGuestName', 'Sarah Marks'), 'Sarah M.');
  assert.equal(h.run('formatGuestName', 'Sarah'), 'Sarah');
  assert.equal(h.run('formatGuestName', 'Sarah M.'), 'Sarah M.');
  assert.equal(h.run('formatGuestName', '  Mary Jane  Watson '), 'Mary W.');
  assert.equal(h.run('formatGuestName', ''), '');
});

test('findEventForEmail prefers exact dates, accepts a single overlap, refuses ambiguity', () => {
  const h = setup();
  const ctx = h.sync();
  assert.equal(h.run('findEventForEmail', ctx, 'airbnb', '2026-09-28', '2026-10-03').uid, 'a1@airbnb.com');
  assert.equal(h.run('findEventForEmail', ctx, 'booking', '2026-09-28', '2026-10-03').uid, 'b1@booking.com');
  // A one-night shift still matches when only one event overlaps.
  assert.equal(h.run('findEventForEmail', ctx, 'airbnb', '2026-10-04', '2026-10-06').uid, 'a2@airbnb.com');
  // Overlapping both Airbnb stays is ambiguous.
  assert.equal(h.run('findEventForEmail', ctx, 'airbnb', '2026-10-01', '2026-10-05'), null);
  assert.equal(h.run('findEventForEmail', ctx, 'airbnb', '2026-12-01', '2026-12-05'), null);
  assert.equal(h.run('findEventForEmail', ctx, 'airbnb', 'soon', '2026-12-05'), null);
});

test('applyEmailToEvent writes the guest details and redraws the title', () => {
  const h = setup();
  const ctx = h.sync();
  const record = h.run('findEventForEmail', ctx, 'booking', '2026-09-28', '2026-10-03');
  h.run('applyEmailToEvent', ctx, record, {
    type: 'confirmation', guestName: 'Sarah Marks', guestCount: 4, bookingRef: '1234567890', payout: '£540.00',
  }, '2026-09-20');
  const event = h.events().find((e) => e.tags.sourceUid === 'b1@booking.com');
  assert.equal(event.title, '\u{1F3E8} Sarah M. (4) – Booking.com');
  assert.match(event.description, /Status: Reserved, confirmed by email on Sun 20 Sep 2026/);
  assert.match(event.description, /Guest: Sarah Marks, 4 guests/);
  assert.match(event.description, /Reference: 1234567890/);
  assert.match(event.description, /Payout: £540\.00/);
  assert.equal(event.data.emailStatus, 'confirmed');
  assert.equal(ctx.stats.booking.updated, 1);
});

test('a cancellation marks the event by default and deletes it in delete mode, but never a stay that has started', () => {
  const h = setup();
  let ctx = h.sync();
  let record = h.run('findEventForEmail', ctx, 'airbnb', '2026-09-28', '2026-10-03');
  h.run('applyEmailToEvent', ctx, record, { type: 'cancellation', guestName: 'Sarah Marks' }, '2026-09-22');
  let event = h.events().find((e) => e.tags.sourceUid === 'a1@airbnb.com');
  assert.equal(event.title, '❌ Cancelled – Sarah M. – Airbnb');
  assert.equal(event.color, '8');
  assert.match(event.description, /Status: Cancelled \(email of Tue 22 Sep 2026\)/);

  const h2 = setup({ properties: { CANCELLATION_MODE: 'delete' } });
  ctx = h2.sync();
  record = h2.run('findEventForEmail', ctx, 'airbnb', '2026-09-28', '2026-10-03');
  h2.run('applyEmailToEvent', ctx, record, { type: 'cancellation' }, '2026-09-22');
  assert.equal(h2.events().some((e) => e.tags.sourceUid === 'a1@airbnb.com'), false);
  assert.equal(ctx.stats.airbnb.deleted, 1);

  // Already started: marked rather than deleted even in delete mode.
  h2.setNow(new Date(2026, 9, 1, 9, 0, 0));
  h2.feed('airbnb', [{ uid: 'a2@airbnb.com', start: '2026-09-30', end: '2026-10-06', summary: 'Reserved' }]);
  ctx = h2.sync();
  record = h2.run('findEventForEmail', ctx, 'airbnb', '2026-09-30', '2026-10-06');
  h2.run('applyEmailToEvent', ctx, record, { type: 'cancellation' }, '2026-10-01');
  event = h2.events().find((e) => e.tags.sourceUid === 'a2@airbnb.com');
  assert.equal(event.title, '❌ Cancelled – Airbnb');
});

test('enrichFromGmail skips channels without a search and never touches Gmail for them', () => {
  const h = setup();
  const ctx = h.sync();
  h.run('enrichFromGmail', ctx);
  assert.deepEqual(h.state.gmailSearches, []);
  assert.ok(h.logs('log').some((m) => /\[gmail\] No email search configured for airbnb yet/.test(m)));
  assert.deepEqual(Object.keys(h.state.labels).sort(), ['booking-sync/processed', 'booking-sync/unmatched']);
});

test('once a search exists, unparsed messages are labelled unmatched and logged instead of being retried', () => {
  const h = setup();
  const ctx = h.sync();
  h.value('EMAIL_SEARCH').airbnb = 'from:(example@airbnb.test)';
  const applied = [];
  h.state.threads = [{
    getMessages: () => [{ getSubject: () => 'Reservation confirmed', getDate: () => new Date(2026, 8, 20, 12, 0, 0) }],
    addLabel: (label) => applied.push(label.getName()),
  }];
  h.run('enrichFromGmail', ctx);
  assert.equal(h.state.gmailSearches.length, 1);
  assert.match(h.state.gmailSearches[0], /^from:\(example@airbnb\.test\) -label:booking-sync\/processed -label:booking-sync\/unmatched newer_than:60d$/);
  assert.deepEqual(applied, ['booking-sync/unmatched']);
  assert.deepEqual(plain(ctx.unmatched), [{ channel: 'airbnb', subject: 'Reservation confirmed', reason: 'could not parse the email' }]);
});

test('runSync runs the Gmail step only when enabled', () => {
  const h = setup({ properties: { GMAIL_ENRICH_ENABLED: 'true' } });
  h.run('runSync');
  assert.ok(h.logs('log').some((m) => /\[gmail\] No email search configured/.test(m)));
  const h2 = setup();
  h2.run('runSync');
  assert.ok(!h2.logs('log').some((m) => /\[gmail\]/.test(m)));
});
