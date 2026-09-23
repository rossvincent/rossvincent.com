# Holiday let booking sync

One private Google Calendar holding every Airbnb and Booking.com reservation for the property, refreshed every fifteen minutes. Guest details are added from the confirmation emails once Phase 2 is built. It runs as Google Apps Script on the owner's Google account: no server, no cost, and no OAuth setup beyond a one-off consent screen.

**Status: v1.0.** Phase 1 (feed sync) and the failure alerts from Phase 3 are built and unit tested. Phase 2 (Gmail enrichment) is scaffolded but disabled until sample emails exist to build the parsers against. The changelog is at the end.

## How it works

Every fifteen minutes `runSync` downloads each channel's iCal feed, parses the entries and mirrors them into the target calendar.

Each calendar event carries three tags: the feed entry's UID (`sourceUid`), the `channel`, and `syncData`, a JSON blob with the fields used to draw it. The tags are how the next run finds the event again, so a second run against an unchanged feed writes nothing.

| Feed entry | Title | Colour |
| --- | --- | --- |
| Airbnb `Reserved` | 🏠 Airbnb – Reserved | red |
| Airbnb `Airbnb (Not available)` | ⛔ Blocked | grey |
| Airbnb, any other summary | 🏠 Airbnb – (the summary) | grey, and a warning in the log |
| Booking.com `CLOSED - Not available` | 🏨 Booking.com – Reserved | blue |
| Once an email names the guest (Phase 2) | 🏠 Sarah M. (4) – Airbnb | channel colour |
| Once an email cancels it (Phase 2) | ❌ Cancelled – Sarah M. (4) – Airbnb | grey |

The description lists the channel, the status, check-in and check-out with the number of nights, Airbnb's reservation link and confirmation code, and the last four digits of the guest's phone number where the feed carries it.

Booking.com's feed says `CLOSED - Not available` for bookings and manual blocks alike, so every entry is shown as reserved with the status "Unconfirmed" until Phase 2 matches a confirmation email.

**Block style.** By default a block covers the nights: check-in to the day before checkout, which is what Google Calendar shows when the feed is imported directly. Set `INCLUDE_CHECKOUT_DAY` to `true` to draw each block through the checkout day instead; same-day turnarounds then show as overlapping events.

### Deletion and safety rules

- An upcoming event (check-in today or later) whose UID has left the feed is deleted.
- Past and in-progress events are never deleted, even when they leave the feed. They are logged instead.
- Events on the calendar without a `sourceUid` tag are not ours and are never touched, so notes can be added by hand. The same goes for a tracked event that has been changed by hand into a timed event.
- Events an email has marked cancelled are kept as the record of the cancellation.
- If a feed fails to download, returns anything other than 200, is not an iCalendar document, or parses to zero events while upcoming events for that channel are still on the calendar, then nothing is created or deleted for that channel, a warning is logged, and the failure counts towards an alert. The other channel carries on.
- Only one run at a time. A run that finds another still going skips itself.

### Alerts

Consecutive failures are counted per feed, and for the run as a whole, in Script Properties. After three in a row (45 minutes) one email goes to `ALERT_EMAIL`, then a reminder every `ALERT_REPEAT_HOURS` while it stays broken, then one email on recovery. Nothing else is sent.

## Setup

### 1. Have these ready

- The Airbnb calendar export URL (hosting calendar, Availability settings, connect calendars, export) and the Booking.com one (extranet, Calendar, Sync calendars, export). Both URLs are secret tokens.
- A new, empty Google Calendar for the bookings. Its ID is in the calendar's settings under "Integrate calendar" and looks like `xxxx@group.calendar.google.com`. Keep the calendar private.
- Node.js 20 or later, and clasp: `npm install -g @google/clasp`, then `clasp login` with the Google account that owns the calendar and receives the booking emails.

### 2. Create the Apps Script project

1. Go to script.google.com, create a new project and name it. Open Project Settings (the cog) and copy the Script ID.
2. Paste it into `.clasp.json` in place of `PASTE_SCRIPT_ID_HERE`, and commit that. The file holds only the ID; the credentials clasp made at login live in your home directory and are ignored by git.
3. From this folder run `clasp push -f`. The `-f` accepts the manifest (`src/appsscript.json`), which sets the time zone to Europe/London and lists the permissions the script asks for.

The alternative is `clasp create --type standalone --title "Holiday let booking sync" --rootDir src` after deleting the placeholder `.clasp.json`. Check `git status` afterwards: clasp may pull the new project's default manifest over `src/appsscript.json`, in which case restore it with `git checkout src/appsscript.json` before pushing.

### 3. Script Properties

In the Apps Script editor open Project Settings and add these under Script Properties.

| Property | Required | Meaning |
| --- | --- | --- |
| `TARGET_CALENDAR_ID` | yes | The calendar to write to |
| `AIRBNB_ICAL_URL` | one of the two | Airbnb export URL. Leave unset to skip the channel |
| `BOOKING_ICAL_URL` | one of the two | Booking.com export URL. Leave unset to skip the channel |
| `ALERT_EMAIL` | no | Where alerts go. Defaults to the account that owns the script |
| `DRY_RUN` | no | `true` logs every intended change and writes nothing. Default `false` |
| `INCLUDE_CHECKOUT_DAY` | no | `true` draws each block through the checkout day. Default `false` |
| `CANCELLATION_MODE` | no | What a cancellation email does to the event: `mark` (default) or `delete` |
| `GMAIL_ENRICH_ENABLED` | no | `true` runs the Gmail step (Phase 2). Default `false` |
| `ALERT_REPEAT_HOURS` | no | Hours between reminders while a feed stays broken. Default `24`, `0` for a single alert |

Properties beginning with `state.` are the failure counters the script keeps for itself.

### 4. First run

Do these from the editor's function picker, in order, reading the execution log after each.

1. **`printConfig`**. The first run asks for authorisation. The consent screen calls the script an unverified app because it is personal, not published: choose Advanced, then "Go to ... (unsafe)", and allow. The log should show both feeds (masked), the calendar ID and "Failure state: none".
2. **`dryRun`**. The log should list one `DRY RUN CREATE` per booking and block and nothing else. Check the dates and titles against Airbnb and Booking.com.
3. **`runSync`**. Open the calendar and check every booking is there.
4. **`runSync`** again. The summary line should show everything as unchanged and no writes.
5. **`installTriggers`**. The Triggers page then shows `runSync` every 15 minutes.

The plan's acceptance test: all current bookings appear correctly; running twice creates no duplicates; a test block added on Airbnb appears, and once removed disappears, within one cycle of Airbnb refreshing its export (Airbnb can take a while to do that; the sync itself is fifteen minutes).

## Day to day

- **Pause:** run `removeTriggers`. **Resume:** run `installTriggers`. Both are safe to run repeatedly.
- **Dry run:** run `dryRun` from the editor. To make the scheduled runs harmless while investigating something, set `DRY_RUN` to `true` and remove it afterwards.
- **Change a feed:** edit the property. A new export URL for the same listing carries the same UIDs, so nothing churns. A URL for a different listing makes its events appear and deletes the old listing's upcoming ones on the next run.
- **Logs:** the Executions page in the editor shows each run's log and whether it failed.
- **Alerts:** `printConfig` shows the failure counters; `resetAlertState` clears them, which also stops the recovery email.
- **Deploy a change:** `npm test`, then `clasp push`. The trigger picks up the new code on its next run.

## Development

`npm test` runs the suite with `node --test` against fake Google services (`test/harness.js`). It needs no network and no Google account. The harness loads the sources into a `vm` context the way Apps Script does, one shared global scope with no imports.

| File | Job |
| --- | --- |
| `src/appsscript.json` | Manifest: time zone, V8 runtime, permissions |
| `src/config.js` | Reads and validates the Script Properties |
| `src/channels.js` | What each channel's feed looks like and how to classify its entries |
| `src/dates.js` | Date keys (`YYYY-MM-DD`) and the few conversions to and from `Date` |
| `src/ical.js` | Fetches and parses the feeds |
| `src/calendarSync.js` | Creates, updates and deletes calendar events; draws titles and descriptions |
| `src/alerts.js` | Failure counters and alert emails |
| `src/gmailEnrich.js` | Phase 2 scaffold: search, match, apply, label |
| `src/main.js` | Entry points and trigger management |

Apps Script rules worth knowing: files share one global scope, so every top-level function is visible everywhere; functions whose names end in an underscore are hidden from the editor's Run menu; `CalendarApp` treats the end date of an all-day event as exclusive, the same as iCal's `DTEND`.

## Phase 2: Gmail enrichment

What is in place: the pipeline that searches Gmail, parses each message, matches it to the event for that channel with the same dates (or the only overlapping one), writes the guest fields into `syncData`, redraws the title and description, and labels the thread `booking-sync/processed`. Anything it cannot parse or match is labelled `booking-sync/unmatched` and logged, so it is not retried every fifteen minutes and can be looked at.

What it needs, in this order:

1. Two or three real examples each of an Airbnb confirmation, an Airbnb cancellation, a Booking.com new booking and a Booking.com cancellation, redacted if needed.
2. The sender and subject search for each channel in `EMAIL_SEARCH`, and the two parsers in `parseChannelEmail`, both written against those samples.
3. `GMAIL_ENRICH_ENABLED` set to `true`.

The plan's open question, whether a cancellation deletes the event or marks it, is the `CANCELLATION_MODE` property. It defaults to `mark`, which keeps a grey "Cancelled" event as the record; the feed sync leaves such events alone even after the booking disappears from the feed.

## Privacy

- The calendar is private and stays so. Once Phase 2 runs it holds guest names.
- The iCal URLs are secret tokens and live only in Script Properties. `printConfig` masks them.
- `.clasp.json` holds the script ID and nothing else. The clasp credentials live in your home directory and are git-ignored here as well.
- The manifest already asks for Gmail access (`gmail.modify`, which Phase 2 needs to read messages and apply labels) so that authorisation happens once. Nothing reads Gmail until `GMAIL_ENRICH_ENABLED` is true.

## Things to check on the first live run

- Whether Airbnb's export includes the dates it imports from Booking.com as `Airbnb (Not available)`, and whether Booking.com's export includes the dates it imports from Airbnb. If either does, a booking shows twice: once from its own channel and once as a block or unconfirmed entry from the other. A rule to hide entries that exactly mirror a booking on the other channel is a small addition once the feeds show what they do.
- Airbnb's summary strings. Anything other than `Reserved` or `Airbnb (Not available)` appears grey with the raw summary in the title and a warning in the log.
- How quickly each platform refreshes its export after a change. This, not the fifteen-minute trigger, sets how soon the calendar catches up.

## Changelog

- **v1.0**, 23 September 2026. Phase 1: Airbnb and Booking.com feeds into one calendar every fifteen minutes, idempotent, with the deletion safety rules and a dry run. Failure alerts after three consecutive failures with reminders and a recovery email. Trigger install and removal. Phase 2 scaffold, disabled, awaiting sample emails.
