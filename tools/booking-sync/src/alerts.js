/**
 * Failure tracking and email alerts.
 *
 * Consecutive failures are counted per key (airbnb, booking, run) in Script Properties. After ALERT_THRESHOLD in a
 * row one email goes out, then at most one reminder every ALERT_REPEAT_HOURS while it stays broken, then one email
 * on recovery. A dry run neither counts nor sends.
 */
const ALERT_THRESHOLD = 3;
const STATE_PREFIX = 'state.';

function alertStateKey(key, field) {
  return STATE_PREFIX + key + '.' + field;
}

function recordFailure(config, key, label, message) {
  if (config.dryRun) {
    console.log('DRY RUN failure noted for ' + label + ': ' + message);
    return;
  }
  const props = PropertiesService.getScriptProperties();
  const count = (Number(props.getProperty(alertStateKey(key, 'failures'))) || 0) + 1;
  props.setProperty(alertStateKey(key, 'failures'), String(count));
  props.setProperty(alertStateKey(key, 'lastError'), String(message).slice(0, 500));

  const alertedAt = Number(props.getProperty(alertStateKey(key, 'alertedAt'))) || 0;
  const now = nowDate().getTime();
  const repeatMs = config.alertRepeatHours * 60 * 60 * 1000;
  const due = count >= ALERT_THRESHOLD && (!alertedAt || (repeatMs > 0 && now - alertedAt >= repeatMs));
  if (!due) return;

  sendAlert(config, label + ' failing (' + count + ' runs in a row)', [
    label + ' has now failed ' + count + ' runs in a row (the sync runs every 15 minutes).',
    '',
    'Latest error: ' + message,
    '',
    'While a feed fails nothing is created or deleted for that channel, so the calendar may be stale.',
    'Check the feed URL in Script Properties and the execution log in the Apps Script editor.',
    alertedAt ? 'This reminder repeats every ' + config.alertRepeatHours + ' hours until it recovers.' : '',
  ]);
  props.setProperty(alertStateKey(key, 'alertedAt'), String(now));
}

function recordSuccess(config, key, label) {
  const props = PropertiesService.getScriptProperties();
  const count = Number(props.getProperty(alertStateKey(key, 'failures'))) || 0;
  const alertedAt = props.getProperty(alertStateKey(key, 'alertedAt'));
  if (!count && !alertedAt) return;
  if (config.dryRun) {
    console.log('DRY RUN ' + label + ' would be marked recovered');
    return;
  }
  props.deleteProperty(alertStateKey(key, 'failures'));
  props.deleteProperty(alertStateKey(key, 'lastError'));
  if (!alertedAt) return;
  props.deleteProperty(alertStateKey(key, 'alertedAt'));
  sendAlert(config, label + ' recovered', [
    label + ' is working again after ' + count + ' failed run(s).',
    'The next runs will catch the calendar up; nothing else to do.',
  ]);
}

function sendAlert(config, subject, lines) {
  const fullSubject = '[booking-sync] ' + subject;
  console.warn('Alert: ' + fullSubject);
  try {
    MailApp.sendEmail({
      to: config.alertEmail,
      subject: fullSubject,
      body: lines.filter((line) => line !== undefined).join('\n'),
      name: 'booking-sync',
    });
  } catch (e) {
    console.error('Could not send alert email: ' + (e && e.message ? e.message : String(e)));
  }
}

/** Current failure state per key, for printConfig. */
function alertState() {
  const props = PropertiesService.getScriptProperties().getProperties() || {};
  const state = {};
  Object.keys(props)
    .filter((name) => name.indexOf(STATE_PREFIX) === 0)
    .forEach((name) => {
      const parts = name.slice(STATE_PREFIX.length).split('.');
      (state[parts[0]] = state[parts[0]] || {})[parts[1]] = props[name];
    });
  return state;
}

/** Forgets every failure counter. Run after fixing a problem to stop reminders and skip the recovery email. */
function clearAlertState() {
  const props = PropertiesService.getScriptProperties();
  Object.keys(props.getProperties() || {})
    .filter((name) => name.indexOf(STATE_PREFIX) === 0)
    .forEach((name) => props.deleteProperty(name));
}
