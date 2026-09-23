/**
 * Phase 2: guest details from confirmation and cancellation emails.
 *
 * STATUS: scaffold. The pipeline (search, parse, match, update, label) is in place and unit tested, but the two
 * channel parsers are stubs that return null. They get written against real sample emails, never guessed, as the
 * build plan says. Nothing here runs unless the Script Property GMAIL_ENRICH_ENABLED is true.
 *
 * Flow, per channel, after the feed sync in the same run:
 *   1. Search Gmail for unprocessed threads from the channel (EMAIL_SEARCH, senders to be confirmed from samples).
 *   2. Parse each message into { type, guestName, guestCount, checkIn, checkOut, bookingRef, payout }.
 *   3. Match it to the calendar event for that channel with the same dates, or the only overlapping one.
 *   4. Store the guest fields in the event's syncData and redraw its title and description.
 *   5. Label the thread booking-sync/processed. Anything unparsed or unmatched is labelled booking-sync/unmatched
 *      instead, so it is not retried every fifteen minutes, and is logged for the next digest.
 */
const PROCESSED_LABEL = 'booking-sync/processed';
const UNMATCHED_LABEL = 'booking-sync/unmatched';
const EMAIL_LOOKBACK_DAYS = 60;
const EMAIL_BATCH_SIZE = 50;

/** Gmail search per channel. Null until the sample emails confirm the sender and subject lines. */
const EMAIL_SEARCH = {
  airbnb: null,
  booking: null,
};

function enrichFromGmail(ctx) {
  const processed = getOrCreateLabel(PROCESSED_LABEL, ctx.config);
  const unmatched = getOrCreateLabel(UNMATCHED_LABEL, ctx.config);

  CHANNEL_KEYS.forEach((key) => {
    const search = EMAIL_SEARCH[key];
    if (!search) {
      console.log('[gmail] No email search configured for ' + key + ' yet; skipping');
      return;
    }
    if (!ctx.feeds[key].ok) {
      console.log('[gmail] The ' + key + ' feed failed this run; its emails wait for the next run');
      return;
    }
    const query =
      search + ' -label:' + PROCESSED_LABEL + ' -label:' + UNMATCHED_LABEL + ' newer_than:' + EMAIL_LOOKBACK_DAYS + 'd';
    GmailApp.search(query, 0, EMAIL_BATCH_SIZE).forEach((thread) => {
      let allHandled = true;
      thread.getMessages().forEach((message) => {
        const subject = message.getSubject();
        const parsed = parseChannelEmail(key, message);
        if (!parsed) {
          noteUnmatched(ctx, key, subject, 'could not parse the email');
          allHandled = false;
          return;
        }
        const record = findEventForEmail(ctx, key, parsed.checkIn, parsed.checkOut);
        if (!record) {
          noteUnmatched(ctx, key, subject, 'no calendar event for ' + parsed.checkIn + '..' + parsed.checkOut);
          allHandled = false;
          return;
        }
        applyEmailToEvent(ctx, record, parsed, localDateKey(message.getDate()));
      });
      if (ctx.config.dryRun) return;
      thread.addLabel(allHandled ? processed : unmatched);
    });
  });
}

/**
 * Turns one Gmail message into booking details, or null when it is not one this script understands.
 * TODO(phase 2): build the Airbnb and Booking.com parsers against the sample emails. Until then everything is
 * reported as unmatched.
 */
function parseChannelEmail(channelKey, message) {
  void channelKey;
  void message;
  return null;
}

/** The event this email is about: exact dates first, otherwise the only overlapping event; null when ambiguous. */
function findEventForEmail(ctx, channelKey, checkIn, checkOut) {
  if (!isDateKey(checkIn) || !isDateKey(checkOut)) return null;
  const candidates = ctx.existing.filter((r) => r.channel === channelKey && !r.deleted);
  const exact = candidates.filter((r) => r.model.checkIn === checkIn && r.model.checkOut === checkOut);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return null;
  const overlapping = candidates.filter((r) => r.model.checkIn < checkOut && checkIn < r.model.checkOut);
  return overlapping.length === 1 ? overlapping[0] : null;
}

/** Writes the email's details onto the event. A cancellation is marked or deleted according to CANCELLATION_MODE. */
function applyEmailToEvent(ctx, record, parsed, emailDate) {
  const key = record.channel;
  if (parsed.type === 'cancellation' && ctx.config.cancellationMode === 'delete' && record.start >= ctx.today) {
    ctx.stats[key].deleted++;
    logChange(ctx, key, 'DELETE', record.start + '..' + record.end + ' "' + record.title + '" (cancellation email)');
    record.deleted = true;
    if (!ctx.config.dryRun) record.event.deleteEvent();
    return;
  }
  const model = Object.assign({}, record.model, {
    guestName: parsed.guestName || record.model.guestName,
    guestCount: parsed.guestCount || record.model.guestCount,
    bookingRef: parsed.bookingRef || record.model.bookingRef,
    payout: parsed.payout || record.model.payout,
    emailStatus: parsed.type === 'cancellation' ? 'cancelled' : 'confirmed',
    emailDate,
  });
  updateEvent(ctx, record, desiredEvent(model, ctx.config));
}

function noteUnmatched(ctx, channelKey, subject, reason) {
  ctx.unmatched.push({ channel: channelKey, subject, reason });
  console.warn('[gmail] Unmatched ' + channelKey + ' email "' + subject + '": ' + reason);
}

function getOrCreateLabel(name, config) {
  const existing = GmailApp.getUserLabelByName(name);
  if (existing) return existing;
  if (config.dryRun) return { getName: () => name };
  return GmailApp.createLabel(name);
}
