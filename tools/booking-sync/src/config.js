/**
 * Configuration, read from Script Properties (Project Settings > Script Properties in the Apps Script editor).
 *
 * Nothing secret lives in code. The feed URLs, the calendar ID and the alert address all come from here, so the
 * repository never holds an iCal token.
 */

const PROPERTY_HELP = {
  AIRBNB_ICAL_URL: 'Airbnb calendar export URL (secret). Leave unset to skip the channel.',
  BOOKING_ICAL_URL: 'Booking.com calendar export URL (secret). Leave unset to skip the channel.',
  TARGET_CALENDAR_ID: 'ID of the private Google Calendar to write to. Required.',
  ALERT_EMAIL: 'Where failure alerts go. Defaults to the account that owns the script.',
  DRY_RUN: 'true logs every intended change and writes nothing. Default false.',
  INCLUDE_CHECKOUT_DAY: 'true draws each block through the checkout day. Default false: the block covers the nights only.',
  CANCELLATION_MODE: 'What a cancellation email does to the event: mark (default) or delete.',
  GMAIL_ENRICH_ENABLED: 'true runs the Gmail enrichment step (Phase 2). Default false until the email parsers exist.',
  ALERT_REPEAT_HOURS: 'Hours between reminder alerts while a feed stays broken. Default 24. 0 sends a single alert.',
};

function parseBoolean(value, fallback) {
  if (/^(true|yes|1)$/i.test(value)) return true;
  if (/^(false|no|0)$/i.test(value)) return false;
  return fallback;
}

function parseNumber(value, fallback) {
  const n = Number(value);
  return value !== '' && isFinite(n) ? n : fallback;
}

/**
 * Reads and validates the configuration. Throws with a plain message when something required is missing.
 * `overrides` lets an entry point force a setting, which is how dryRun() works.
 */
function getConfig(overrides) {
  const props = PropertiesService.getScriptProperties().getProperties() || {};
  const read = (key) => String(props[key] || '').trim();

  const feedUrls = {};
  CHANNEL_KEYS.forEach((key) => {
    feedUrls[key] = read(CHANNELS[key].urlProperty);
  });

  const missing = [];
  if (!read('TARGET_CALENDAR_ID')) missing.push('TARGET_CALENDAR_ID');
  if (!CHANNEL_KEYS.some((key) => feedUrls[key])) missing.push('AIRBNB_ICAL_URL or BOOKING_ICAL_URL');
  if (missing.length) {
    throw new Error(
      'Missing Script Properties: ' + missing.join(', ') + '. Set them under Project Settings > Script Properties.'
    );
  }

  const config = {
    feedUrls,
    targetCalendarId: read('TARGET_CALENDAR_ID'),
    alertEmail: read('ALERT_EMAIL') || Session.getEffectiveUser().getEmail(),
    dryRun: parseBoolean(read('DRY_RUN'), false),
    includeCheckoutDay: parseBoolean(read('INCLUDE_CHECKOUT_DAY'), false),
    cancellationMode: read('CANCELLATION_MODE').toLowerCase() === 'delete' ? 'delete' : 'mark',
    gmailEnrichEnabled: parseBoolean(read('GMAIL_ENRICH_ENABLED'), false),
    alertRepeatHours: Math.max(0, parseNumber(read('ALERT_REPEAT_HOURS'), 24)),
  };
  return Object.assign(config, overrides || {});
}

/** The alert address even when the rest of the configuration is broken, so a broken configuration can be reported. */
function alertAddressFallback() {
  try {
    const value = PropertiesService.getScriptProperties().getProperty('ALERT_EMAIL');
    if (value && value.trim()) return value.trim();
  } catch (e) {
    // fall through to the owner's address
  }
  return Session.getEffectiveUser().getEmail();
}

/** A feed URL with its secret token hidden: host, then the last four characters. */
function maskUrl(url) {
  if (!url) return '(not set)';
  const host = /^https?:\/\/([^/?#]+)/.exec(url);
  return (host ? host[1] : '?') + '/…' + url.slice(-4);
}

/** Lines describing the effective configuration, safe to log. */
function describeConfig(config) {
  const lines = [];
  CHANNEL_KEYS.forEach((key) => {
    lines.push(CHANNELS[key].name + ' feed: ' + maskUrl(config.feedUrls[key]));
  });
  lines.push('Target calendar: ' + config.targetCalendarId);
  lines.push('Alerts to: ' + config.alertEmail + ' (repeat every ' + config.alertRepeatHours + ' h while broken)');
  lines.push('Dry run: ' + config.dryRun);
  lines.push('Include checkout day: ' + config.includeCheckoutDay);
  lines.push('Cancellation mode: ' + config.cancellationMode);
  lines.push('Gmail enrichment: ' + (config.gmailEnrichEnabled ? 'enabled' : 'disabled'));
  return lines;
}
