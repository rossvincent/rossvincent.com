'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./harness.js');

function config(h, overrides) {
  return Object.assign({ dryRun: false, alertEmail: 'ross@example.com', alertRepeatHours: 24 }, overrides || {});
}

test('one alert after three consecutive failures, none on the fourth, one email on recovery', () => {
  const h = createHarness();
  const cfg = config(h);
  h.run('recordFailure', cfg, 'airbnb', 'Airbnb feed', 'HTTP 500');
  h.run('recordFailure', cfg, 'airbnb', 'Airbnb feed', 'HTTP 500');
  assert.equal(h.state.emails.length, 0);
  h.run('recordFailure', cfg, 'airbnb', 'Airbnb feed', 'HTTP 502');
  assert.equal(h.state.emails.length, 1);
  assert.equal(h.state.emails[0].to, 'ross@example.com');
  assert.equal(h.state.emails[0].subject, '[booking-sync] Airbnb feed failing (3 runs in a row)');
  assert.match(h.state.emails[0].body, /Latest error: HTTP 502/);
  h.run('recordFailure', cfg, 'airbnb', 'Airbnb feed', 'HTTP 502');
  assert.equal(h.state.emails.length, 1);
  assert.equal(h.state.properties['state.airbnb.failures'], '4');

  h.run('recordSuccess', cfg, 'airbnb', 'Airbnb feed');
  assert.equal(h.state.emails.length, 2);
  assert.equal(h.state.emails[1].subject, '[booking-sync] Airbnb feed recovered');
  assert.match(h.state.emails[1].body, /after 4 failed run\(s\)/);
  assert.equal(h.state.properties['state.airbnb.failures'], undefined);
  assert.equal(h.state.properties['state.airbnb.alertedAt'], undefined);

  // A clean success with nothing outstanding sends nothing.
  h.run('recordSuccess', cfg, 'airbnb', 'Airbnb feed');
  assert.equal(h.state.emails.length, 2);
});

test('a failure streak below the threshold recovers silently', () => {
  const h = createHarness();
  const cfg = config(h);
  h.run('recordFailure', cfg, 'booking', 'Booking.com feed', 'HTTP 500');
  h.run('recordSuccess', cfg, 'booking', 'Booking.com feed');
  assert.equal(h.state.emails.length, 0);
  assert.deepEqual(h.data('alertState'), {});
});

test('a reminder goes out once the repeat interval has passed, and never when the interval is 0', () => {
  const h = createHarness({ now: new Date(2026, 8, 23, 10, 0, 0) });
  const cfg = config(h);
  for (let i = 0; i < 3; i++) h.run('recordFailure', cfg, 'run', 'Sync run', 'boom');
  assert.equal(h.state.emails.length, 1);
  h.setNow(new Date(2026, 8, 24, 9, 59, 0));
  h.run('recordFailure', cfg, 'run', 'Sync run', 'boom');
  assert.equal(h.state.emails.length, 1);
  h.setNow(new Date(2026, 8, 24, 10, 0, 0));
  h.run('recordFailure', cfg, 'run', 'Sync run', 'boom');
  assert.equal(h.state.emails.length, 2);
  assert.match(h.state.emails[1].body, /This reminder repeats every 24 hours/);

  const h2 = createHarness({ now: new Date(2026, 8, 23, 10, 0, 0) });
  const once = config(h2, { alertRepeatHours: 0 });
  for (let i = 0; i < 3; i++) h2.run('recordFailure', once, 'run', 'Sync run', 'boom');
  h2.setNow(new Date(2026, 9, 23, 10, 0, 0));
  h2.run('recordFailure', once, 'run', 'Sync run', 'boom');
  assert.equal(h2.state.emails.length, 1);
});

test('dry runs neither count failures nor send email', () => {
  const h = createHarness();
  const cfg = config(h, { dryRun: true });
  for (let i = 0; i < 5; i++) h.run('recordFailure', cfg, 'airbnb', 'Airbnb feed', 'HTTP 500');
  assert.equal(h.state.emails.length, 0);
  assert.equal(h.state.properties['state.airbnb.failures'], undefined);
});

test('a mail failure is logged, not thrown', () => {
  const h = createHarness();
  h.context.MailApp = { sendEmail: () => { throw new Error('quota'); } };
  const cfg = config(h);
  for (let i = 0; i < 3; i++) h.run('recordFailure', cfg, 'airbnb', 'Airbnb feed', 'HTTP 500');
  assert.ok(h.logs('error').some((m) => /Could not send alert email: quota/.test(m)));
});

test('clearAlertState forgets every counter and alertState reports them', () => {
  const h = createHarness();
  const cfg = config(h);
  for (let i = 0; i < 3; i++) h.run('recordFailure', cfg, 'airbnb', 'Airbnb feed', 'HTTP 500');
  const state = h.data('alertState');
  assert.equal(state.airbnb.failures, '3');
  assert.equal(state.airbnb.lastError, 'HTTP 500');
  assert.ok(state.airbnb.alertedAt);
  h.run('clearAlertState');
  assert.deepEqual(h.data('alertState'), {});
  assert.equal(h.state.properties.TARGET_CALENDAR_ID, h.CALENDAR_ID);
});
