/**
 * What each channel's iCal feed looks like and how to read it.
 *
 * The feed status of an entry is one of:
 *   reserved     a confirmed booking (Airbnb "Reserved")
 *   unconfirmed  a booking or a manual block, the feed does not say which (every Booking.com entry)
 *   blocked      dates blocked by hand on the channel (Airbnb "Airbnb (Not available)")
 *   unknown      a summary this script has not seen before; shown in grey and logged so it gets looked at
 */
const CHANNELS = {
  airbnb: {
    key: 'airbnb',
    name: 'Airbnb',
    icon: '\u{1F3E0}',
    color: 'RED',
    urlProperty: 'AIRBNB_ICAL_URL',
    classify(summary) {
      if (/^reserved$/i.test(summary)) return 'reserved';
      if (/not available/i.test(summary)) return 'blocked';
      return 'unknown';
    },
    extract(description) {
      // Airbnb's DESCRIPTION carries the reservation link and the last four digits of the guest's phone number:
      //   Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMABCDEFGH
      //   Phone Number (Last 4 Digits): 1234
      const out = {};
      const url = /https?:\/\/\S+/.exec(description);
      if (url) {
        out.reservationUrl = url[0];
        const code = /\/details\/([A-Za-z0-9]+)/.exec(url[0]);
        if (code) out.reference = code[1];
      }
      const phone = /Phone Number \(Last 4 Digits\):\s*(\d+)/i.exec(description);
      if (phone) out.phoneLast4 = phone[1];
      return out;
    },
  },
  booking: {
    key: 'booking',
    name: 'Booking.com',
    icon: '\u{1F3E8}',
    color: 'BLUE',
    urlProperty: 'BOOKING_ICAL_URL',
    // Booking.com labels every entry "CLOSED - Not available", booking and manual block alike, so the feed alone
    // cannot tell them apart. Everything is an unconfirmed reservation until a confirmation email says otherwise.
    classify() {
      return 'unconfirmed';
    },
    extract() {
      return {};
    },
  },
};

const CHANNEL_KEYS = Object.keys(CHANNELS);

function channelName(key) {
  return CHANNELS[key] ? CHANNELS[key].name : key;
}
