// Guild Wars tournament schedule.
// Times are stored in UTC, keyed by day of week (0 = Sunday, 6 = Saturday).

export const TOURNAMENT_SCHEDULE = {
  ATA: {
    0: 2,  // Sunday    — 02:00 UTC
    1: 4,  // Monday    — 04:00 UTC
    2: 3,  // Tuesday   — 03:00 UTC
    3: 2,  // Wednesday — 02:00 UTC
    4: 3,  // Thursday  — 03:00 UTC
    5: 4,  // Friday    — 04:00 UTC
    6: 3,  // Saturday  — 03:00 UTC
  },
  ATB: {
    0: 11, // Sunday    — 11:00 UTC
    1: 13, // Monday    — 13:00 UTC
    2: 12, // Tuesday   — 12:00 UTC
    3: 11, // Wednesday — 11:00 UTC
    4: 12, // Thursday  — 12:00 UTC
    5: 13, // Friday    — 13:00 UTC
    6: 12, // Saturday  — 12:00 UTC
  },
  ATC: {
    0: 18, // Sunday    — 18:00 UTC
    1: 20, // Monday    — 20:00 UTC
    2: 19, // Tuesday   — 19:00 UTC
    3: 18, // Wednesday — 18:00 UTC
    4: 19, // Thursday  — 19:00 UTC
    5: 20, // Friday    — 20:00 UTC
    6: 19, // Saturday  — 19:00 UTC
  },
};

// Monthly tournament (mAT): 3rd Saturday of the month at 16:00 UTC.
export const MONTHLY_TOURNAMENT = {
  MAT: {
    utcHour: 16,
    weekday: 6,     // Saturday
    weekOfMonth: 3, // 3rd occurrence of the weekday in the month
  },
};

// Minutes before a tournament when the in-channel reminder is sent.
export const REMINDER_MINUTES_BEFORE = 30;

export const TOURNAMENT_TYPES = {
  ATA: 'ATA',
  ATB: 'ATB',
  ATC: 'ATC',
  MAT: 'MAT',
};

export const TOURNAMENT_NAMES = {
  ATA: 'AT A',
  ATB: 'AT B',
  ATC: 'AT C',
  MAT: 'mAT',
};

