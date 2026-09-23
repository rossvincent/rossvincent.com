/**
 * Date helpers.
 *
 * Every date in this project is handled as a plain 'YYYY-MM-DD' string (a "date key") in the script's time zone,
 * which the manifest sets to Europe/London. Keys compare correctly as strings, so `a < b` means a is the earlier day.
 * JavaScript Date objects only appear at the edges: reading them from CalendarApp and handing them back to it.
 */

/** The current moment. Kept as a function so tests can pin the clock. */
function nowDate() {
  return new Date();
}

function pad2(n) {
  return (n < 10 ? '0' : '') + n;
}

/** Date key for a moment in time, using the script's local calendar day. */
function localDateKey(date) {
  return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
}

/**
 * Date key for an all-day boundary that CalendarApp returned.
 *
 * Those come back as midnight, but it is not documented whether that is local midnight or UTC midnight. Shifting by
 * twelve hours before reading the local day gives the same answer for either, in any zone within eleven hours of UTC.
 * Never use this for "now"; use localDateKey for that.
 */
function allDayDateKey(date) {
  return localDateKey(new Date(date.getTime() + 12 * 60 * 60 * 1000));
}

/** Local midnight for a date key, which is what CalendarApp expects for all-day events. */
function dateFromKey(key) {
  const parts = key.split('-');
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

function isDateKey(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function addDays(key, days) {
  const date = dateFromKey(key);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

function todayKey() {
  return localDateKey(nowDate());
}

/** Whole days between two keys; a DST change never adds up to a day, so rounding absorbs it. */
function daysBetween(fromKey, toKey) {
  return Math.round((dateFromKey(toKey).getTime() - dateFromKey(fromKey).getTime()) / (24 * 60 * 60 * 1000));
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 'Tue 15 Sep 2026', for descriptions and emails. */
function formatDateKey(key) {
  const date = dateFromKey(key);
  return DAY_NAMES[date.getDay()] + ' ' + date.getDate() + ' ' + MONTH_NAMES[date.getMonth()] + ' ' + date.getFullYear();
}
