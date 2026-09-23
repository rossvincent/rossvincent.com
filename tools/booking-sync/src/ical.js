/**
 * Fetching and parsing iCalendar (RFC 5545) feeds.
 *
 * Only the subset the channels use is handled: all-day VEVENTs with UID, DTSTART, DTEND, SUMMARY and DESCRIPTION.
 * The parser is deliberately tolerant. A feed with one odd entry should still sync the rest.
 */

/**
 * Downloads a feed. Returns { ok: true, text } or { ok: false, error }, never throws.
 * A 200 that is not an iCalendar document (an HTML error page, say) counts as a failure.
 */
function fetchIcal(url) {
  let response;
  try {
    response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
  } catch (e) {
    return { ok: false, error: 'Fetch failed: ' + (e && e.message ? e.message : String(e)) };
  }
  const code = response.getResponseCode();
  if (code !== 200) return { ok: false, error: 'HTTP ' + code };
  const text = response.getContentText() || '';
  if (!/BEGIN:VCALENDAR/i.test(text)) {
    return { ok: false, error: 'Response is not an iCalendar feed (no BEGIN:VCALENDAR in ' + text.length + ' bytes)' };
  }
  return { ok: true, text };
}

/** Normalises line endings and joins folded lines (continuations start with a space or tab) back together. */
function unfoldIcalLines(text) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  lines.forEach((line) => {
    if ((line.charAt(0) === ' ' || line.charAt(0) === '\t') && out.length) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  });
  return out;
}

/** 'NAME;PARAM=VALUE:value' into { name, params, value }. Returns null for a line with no property separator. */
function parseIcalLine(line) {
  let inQuotes = false;
  let split = -1;
  for (let i = 0; i < line.length; i++) {
    const ch = line.charAt(i);
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === ':' && !inQuotes) {
      split = i;
      break;
    }
  }
  if (split < 0) return null;
  const head = line.slice(0, split).split(';');
  const params = {};
  head.slice(1).forEach((part) => {
    const eq = part.indexOf('=');
    if (eq > 0) params[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1).replace(/^"|"$/g, '');
  });
  return { name: head[0].toUpperCase(), params, value: line.slice(split + 1) };
}

/** Undoes the TEXT escaping in RFC 5545 section 3.3.11. */
function unescapeIcalText(value) {
  return value.replace(/\\([\\;,nN])/g, (match, ch) => (ch === 'n' || ch === 'N' ? '\n' : ch));
}

/**
 * '20260915' or '20260915T140000Z' into a date key, or null if it is not a real date.
 * The feeds only send VALUE=DATE, so a date-time is reduced to its date part.
 */
function parseIcalDate(value) {
  const m = /^(\d{4})(\d{2})(\d{2})(T|$)/.exec(String(value).trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const check = new Date(year, month - 1, day);
  if (check.getFullYear() !== year || check.getMonth() !== month - 1 || check.getDate() !== day) return null;
  return m[1] + '-' + m[2] + '-' + m[3];
}

/**
 * Parses a feed into { events, warnings }.
 * Each event is { uid, start, end, summary, description } with start and end as date keys and end exclusive
 * (the checkout day), exactly as the feed states it. Entries without a UID or a usable start date are dropped
 * with a warning; a duplicate UID keeps the first entry.
 */
function parseIcal(text) {
  const events = [];
  const warnings = [];
  const seen = {};
  let current = null;

  unfoldIcalLines(text).forEach((line) => {
    if (!line) return;
    if (/^BEGIN:VEVENT$/i.test(line)) {
      current = { raw: {} };
      return;
    }
    if (/^END:VEVENT$/i.test(line)) {
      if (current) finishIcalEvent(current, events, warnings, seen);
      current = null;
      return;
    }
    if (!current) return;
    const prop = parseIcalLine(line);
    if (!prop) return;
    switch (prop.name) {
      case 'UID':
        current.uid = prop.value.trim();
        break;
      case 'DTSTART':
      case 'DTEND':
        current.raw[prop.name] = prop.value.trim();
        if (prop.params.VALUE && prop.params.VALUE.toUpperCase() !== 'DATE') {
          warnings.push(prop.name + ' is not a DATE value (' + prop.value + '); using its date part');
        }
        break;
      case 'SUMMARY':
        current.summary = unescapeIcalText(prop.value).trim();
        break;
      case 'DESCRIPTION':
        current.description = unescapeIcalText(prop.value).trim();
        break;
      default:
        break;
    }
  });

  if (current) warnings.push('Feed ended inside a VEVENT; the unfinished entry was ignored');
  return { events, warnings };
}

function finishIcalEvent(current, events, warnings, seen) {
  const label = current.uid ? 'UID ' + current.uid : 'entry "' + (current.summary || '') + '"';
  if (!current.uid) {
    warnings.push('Skipped ' + label + ': no UID');
    return;
  }
  const start = current.raw.DTSTART ? parseIcalDate(current.raw.DTSTART) : null;
  if (!start) {
    warnings.push('Skipped ' + label + ': missing or malformed DTSTART (' + (current.raw.DTSTART || '') + ')');
    return;
  }
  let end = current.raw.DTEND ? parseIcalDate(current.raw.DTEND) : null;
  if (current.raw.DTEND && !end) warnings.push(label + ': malformed DTEND (' + current.raw.DTEND + '); treated as one day');
  if (!end || end <= start) {
    if (end && end <= start) warnings.push(label + ': DTEND ' + end + ' is not after DTSTART ' + start + '; treated as one day');
    end = addDays(start, 1);
  }
  if (seen[current.uid]) {
    warnings.push('Duplicate ' + label + '; kept the first entry');
    return;
  }
  seen[current.uid] = true;
  events.push({
    uid: current.uid,
    start,
    end,
    summary: current.summary || '',
    description: current.description || '',
  });
}
