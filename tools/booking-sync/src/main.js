/**
 * Entry points: the functions to run from the Apps Script editor or from a trigger.
 *
 *   runSync          what the 15-minute trigger calls: feeds into the calendar, then Gmail enrichment if enabled
 *   dryRun           the same, but only logs what it would change
 *   installTriggers  creates the 15-minute trigger (safe to run again; it replaces any existing one)
 *   removeTriggers   pauses the sync
 *   printConfig      logs the effective configuration with the secrets masked, plus any failure state
 *   resetAlertState  clears the failure counters after a problem has been fixed
 */
const TRIGGER_HANDLER = 'runSync';
const TRIGGER_EVERY_MINUTES = 15;

function runSync() {
  return runSyncWith_({});
}

function dryRun() {
  return runSyncWith_({ dryRun: true });
}

function runSyncWith_(overrides) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30 * 1000)) {
    console.warn('Another run is still going; skipping this one');
    return null;
  }
  try {
    let config;
    try {
      config = getConfig(overrides);
    } catch (e) {
      reportRunFailure_(null, overrides, e);
      throw e;
    }
    try {
      const ctx = syncCalendar(config);
      if (config.gmailEnrichEnabled) enrichFromGmail(ctx);
      recordSuccess(config, 'run', 'Sync run');
      return ctx;
    } catch (e) {
      reportRunFailure_(config, overrides, e);
      throw e;
    }
  } finally {
    lock.releaseLock();
  }
}

function reportRunFailure_(config, overrides, error) {
  const message = error && error.stack ? String(error.stack) : String(error);
  console.error('Run failed: ' + message);
  const effective = config || {
    dryRun: Boolean(overrides && overrides.dryRun),
    alertEmail: alertAddressFallback(),
    alertRepeatHours: 24,
  };
  recordFailure(effective, 'run', 'Sync run', message);
}

function installTriggers() {
  removeTriggers();
  ScriptApp.newTrigger(TRIGGER_HANDLER).timeBased().everyMinutes(TRIGGER_EVERY_MINUTES).create();
  console.log('Installed a trigger: ' + TRIGGER_HANDLER + ' every ' + TRIGGER_EVERY_MINUTES + ' minutes');
}

function removeTriggers() {
  let removed = 0;
  ScriptApp.getProjectTriggers().forEach((trigger) => {
    if (trigger.getHandlerFunction() === TRIGGER_HANDLER) {
      ScriptApp.deleteTrigger(trigger);
      removed++;
    }
  });
  console.log(removed ? 'Removed ' + removed + ' trigger(s); the sync is paused' : 'No sync trigger was installed');
}

function printConfig() {
  describeConfig(getConfig()).forEach((line) => console.log(line));
  const state = alertState();
  const keys = Object.keys(state);
  console.log(keys.length ? 'Failure state: ' + JSON.stringify(state) : 'Failure state: none');
}

function resetAlertState() {
  clearAlertState();
  console.log('Failure counters cleared');
}
