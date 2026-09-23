'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./harness.js');

function setup(options) {
  const h = createHarness(options);
  h.feed('airbnb', [{ uid: 'a1@airbnb.com', start: '2026-09-28', end: '2026-10-03', summary: 'Reserved' }]);
  h.feed('booking', []);
  return h;
}

test('installTriggers is idempotent and removeTriggers pauses the sync', () => {
  const h = setup();
  h.run('installTriggers');
  h.run('installTriggers');
  assert.equal(h.state.triggers.length, 1);
  assert.equal(h.state.triggers[0].getHandlerFunction(), 'runSync');
  assert.equal(h.state.triggers[0].minutes, 15);
  h.run('removeTriggers');
  assert.equal(h.state.triggers.length, 0);
  assert.ok(h.logs('log').some((m) => /the sync is paused/.test(m)));
});

test('runSync syncs, records a clean run and returns the context', () => {
  const h = setup();
  const ctx = h.run('runSync');
  assert.equal(ctx.stats.airbnb.created, 1);
  assert.equal(h.events().length, 1);
  assert.equal(h.state.emails.length, 0);
});

test('runSync skips when another run holds the lock', () => {
  const h = setup();
  h.state.lockBusy = true;
  assert.equal(h.run('runSync'), null);
  assert.equal(h.events().length, 0);
  assert.ok(h.logs('warn').some((m) => /Another run is still going/.test(m)));
});

test('a run that fails is counted and rethrown, and the alert goes to the owner when ALERT_EMAIL is unset', () => {
  const h = setup({ properties: { TARGET_CALENDAR_ID: 'missing@group.calendar.google.com' } });
  for (let i = 0; i < 3; i++) assert.throws(() => h.run('runSync'), /Calendar not found/);
  assert.equal(h.state.properties['state.run.failures'], '3');
  assert.equal(h.state.emails.length, 1);
  assert.equal(h.state.emails[0].to, h.OWNER_EMAIL);
  assert.match(h.state.emails[0].subject, /Sync run failing \(3 runs in a row\)/);
  assert.match(h.state.emails[0].body, /Calendar not found/);
});

test('a broken configuration is reported too, using the fallback alert address', () => {
  const h = createHarness({ properties: { TARGET_CALENDAR_ID: '', ALERT_EMAIL: 'alerts@example.com' } });
  for (let i = 0; i < 3; i++) assert.throws(() => h.run('runSync'), /Missing Script Properties/);
  assert.equal(h.state.emails.length, 1);
  assert.equal(h.state.emails[0].to, 'alerts@example.com');
});

test('printConfig and resetAlertState work end to end', () => {
  const h = setup();
  h.run('printConfig');
  assert.ok(h.logs('log').some((m) => /^Airbnb feed: www\.airbnb\.co\.uk\//.test(m)));
  assert.ok(h.logs('log').some((m) => m === 'Failure state: none'));
  h.state.properties['state.airbnb.failures'] = '2';
  h.run('printConfig');
  assert.ok(h.logs('log').some((m) => /Failure state: \{"airbnb":\{"failures":"2"\}\}/.test(m)));
  h.run('resetAlertState');
  assert.equal(h.state.properties['state.airbnb.failures'], undefined);
});
