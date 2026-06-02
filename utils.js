import { TOURNAMENT_SCHEDULE, TOURNAMENT_NAMES, MONTHLY_TOURNAMENT } from './config.js';
import { t, intlLocale, DEFAULT_LANGUAGE } from './i18n.js';

/**
 * Returns the date (UTC) of the Nth occurrence of a given weekday in the
 * month of the supplied date.
 * @param {Date} date - any date within the target month
 * @param {number} weekday - 0 = Sunday, 6 = Saturday
 * @param {number} occurrence - 1 = first, 2 = second, etc.
 * @returns {Date} - midnight UTC on that day
 */
export function getNthWeekdayOfMonth(date, weekday, occurrence) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const first = new Date(Date.UTC(year, month, 1));
  const offset = (weekday - first.getUTCDay() + 7) % 7;
  const day = 1 + offset + (occurrence - 1) * 7;
  return new Date(Date.UTC(year, month, day));
}

/**
 * True if the given date is the 3rd Saturday of its month (UTC).
 */
export function isThirdSaturday(date) {
  const target = getNthWeekdayOfMonth(date, MONTHLY_TOURNAMENT.MAT.weekday, MONTHLY_TOURNAMENT.MAT.weekOfMonth);
  return (
    date.getUTCFullYear() === target.getUTCFullYear() &&
    date.getUTCMonth() === target.getUTCMonth() &&
    date.getUTCDate() === target.getUTCDate()
  );
}

/**
 * Returns the next monthly tournament date (3rd Saturday) at 16:00 UTC.
 */
export function getNextMonthlyTournamentDate(from = new Date()) {
  const { weekday, weekOfMonth, utcHour } = MONTHLY_TOURNAMENT.MAT;
  let target = getNthWeekdayOfMonth(from, weekday, weekOfMonth);
  target.setUTCHours(utcHour, 0, 0, 0);
  if (target.getTime() <= from.getTime()) {
    const nextMonth = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1));
    target = getNthWeekdayOfMonth(nextMonth, weekday, weekOfMonth);
    target.setUTCHours(utcHour, 0, 0, 0);
  }
  return target;
}

/**
 * Returns the schedule of a tournament for a given day.
 * The result is in UTC; localized display in each user's timezone is handled
 * by Discord timestamp tags (<t:unix:t>) on the rendering side.
 */
export function getTournamentTime(date, type = 'ATC') {
  let tournamentDate;

  if (type === 'MAT') {
    tournamentDate = getNextMonthlyTournamentDate(date);
  } else {
    const dayOfWeek = date.getUTCDay();
    const utcHour = TOURNAMENT_SCHEDULE[type][dayOfWeek];
    tournamentDate = new Date(date);
    tournamentDate.setUTCHours(utcHour, 0, 0, 0);
  }

  return {
    type,
    typeName: TOURNAMENT_NAMES[type],
    utcHour: tournamentDate.getUTCHours(),
    date: tournamentDate,
    unix: Math.floor(tournamentDate.getTime() / 1000),
  };
}

export function getTodayTournament(type = 'ATC') {
  return getTournamentTime(new Date(), type);
}

/**
 * Returns the weekday name in the requested language.
 */
export function getDayName(date, language = DEFAULT_LANGUAGE) {
  return date.toLocaleDateString(intlLocale(language), { weekday: 'long' });
}

export function getReminderTime(tournamentDate) {
  const reminderDate = new Date(tournamentDate);
  reminderDate.setMinutes(reminderDate.getMinutes() - 30);
  return reminderDate;
}

export function isReminderTime(tournamentDate) {
  const now = new Date();
  const reminderTime = getReminderTime(tournamentDate);
  return now >= reminderTime && now < new Date(reminderTime.getTime() + 60000);
}

/**
 * Returns the next future occurrence of a given tournament type. Useful for
 * triggering announcements N hours before the tournament starts, because
 * `getTodayTournament` may return a time that has already passed today
 * (e.g. AT A which runs in the early UTC hours).
 */
export function getNextTournament(type) {
  if (type === 'MAT') {
    return getTournamentTime(new Date(), 'MAT');
  }
  const now = new Date();
  for (let offset = 0; offset < 8; offset++) {
    const probe = new Date(now);
    probe.setUTCDate(probe.getUTCDate() + offset);
    const t = getTournamentTime(probe, type);
    if (t.date.getTime() > now.getTime()) return t;
  }
  return getTournamentTime(now, type);
}

/**
 * Returns the moment `hoursBefore` hours before the tournament starts.
 */
export function getAutoPostTime(tournamentDate, hoursBefore = 7) {
  const d = new Date(tournamentDate);
  d.setHours(d.getHours() - hoursBefore);
  return d;
}

/**
 * True if the current minute is exactly `hoursBefore` hours before the
 * tournament starts (i.e. we are in the [T-hoursBefore, T-hoursBefore+60s) window).
 */
export function isAutoPostTime(tournamentDate, hoursBefore = 7) {
  const now = new Date();
  const target = getAutoPostTime(tournamentDate, hoursBefore);
  return now >= target && now < new Date(target.getTime() + 60000);
}

/**
 * Returns the current hour/minute in Europe/Paris.
 */
export function getParisTime(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find(p => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find(p => p.type === 'minute')?.value ?? 0);
  return { hour, minute };
}

/**
 * True if we are within the first minute of `hour:00` Europe/Paris.
 */
export function isFixedHourNow(hour) {
  const { hour: h, minute: m } = getParisTime();
  return h === hour && m === 0;
}

/**
 * Returns the current day-of-month (1-31) in Europe/Paris.
 */
export function getParisDayOfMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    day: '2-digit',
  }).formatToParts(now);
  return Number(parts.find(p => p.type === 'day')?.value ?? 0);
}

export function getTimeUntilTournament(tournamentDate) {
  const now = new Date();
  const diff = tournamentDate - now;

  if (diff < 0) {
    return { hours: 0, minutes: 0, isPassed: true };
  }
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { hours, minutes, isPassed: false };
}

// --- Discord timestamp helpers ---------------------------------------------
// These render in each viewer's locale & timezone automatically.
function timeTag(unix) {
  return `<t:${unix}:t>`; // localized short time
}
function dateTag(unix) {
  return `<t:${unix}:D>`; // localized long date (e.g. "June 20, 2026")
}
function relativeTag(unix) {
  return `<t:${unix}:R>`; // "in 3 hours" / "dans 3 heures"
}

/**
 * Formats the morning sign-up message for a daily tournament.
 * @param {string} type
 * @param {string} [language]
 */
export function formatMorningMessage(type = 'ATC', language = DEFAULT_LANGUAGE) {
  // Always reference the next *upcoming* occurrence — today's slot may already
  // have passed by the time this is rendered (e.g. ATA usually runs in the
  // early UTC hours, but the announcement fires N hours before tomorrow's).
  const tournament = getNextTournament(type);
  const dayName = getDayName(tournament.date, language);

  const title = t('morningTitle', language, {
    type,
    day: dayName.toUpperCase(),
  });
  const body = t('morningBody', language, {
    name: tournament.typeName,
    time: timeTag(tournament.unix),
    relative: relativeTag(tournament.unix),
  });

  return `${title}\n\n${body}`;
}

/**
 * Special message for the monthly tournament (MAT) posted at the start of the
 * month so players have plenty of time to organize. Unlike the daily morning
 * message, it shows the full date and omits the current weekday from the title.
 */
export function formatMonthlyMessage(language = DEFAULT_LANGUAGE) {
  const tournament = getNextTournament('MAT');
  const title = t('matMonthlyTitle', language, { name: tournament.typeName });
  const body = t('matMonthlyBody', language, {
    name: tournament.typeName,
    date: dateTag(tournament.unix),
    time: timeTag(tournament.unix),
    relative: relativeTag(tournament.unix),
  });
  return `${title}\n\n${body}`;
}

/**
 * Formats the reminder message with the current participants list.
 */
export function formatReminderMessage(
  presentUsers,
  lateUsers,
  type = 'ATC',
  language = DEFAULT_LANGUAGE
) {
  const tournament = getNextTournament(type);
  const totalParticipants = presentUsers.length + lateUsers.length;

  const title = t('reminderTitle', language, { type });
  const body = t('reminderBody', language, {
    name: tournament.typeName,
    time: timeTag(tournament.unix),
    relative: relativeTag(tournament.unix),
  });

  let message = `${title}\n\n${body}\n\n`;

  if (totalParticipants === 0) {
    message += t('noRegistrations', language);
    return message;
  }

  message += t('participantsCount', language, { count: totalParticipants }) + '\n\n';

  if (presentUsers.length > 0) {
    message += t('presentHeader', language, { count: presentUsers.length }) + '\n';
    presentUsers.forEach(user => {
      message += `• ${user}\n`;
    });
    message += '\n';
  }

  if (lateUsers.length > 0) {
    message += t('lateHeader', language, { count: lateUsers.length }) + '\n';
    lateUsers.forEach(user => {
      message += `• ${user}\n`;
    });
  }

  return message;
}

/**
 * Formats the participants block appended below the sign-up message.
 */
export function formatParticipantsBlock(
  { present, absent, late },
  language = DEFAULT_LANGUAGE
) {
  const presentUsers = Array.from(present);
  const absentUsers = Array.from(absent);
  const lateUsers = Array.from(late);
  const total = presentUsers.length + lateUsers.length;

  if (total === 0 && absentUsers.length === 0) {
    return `\n\n${t('noRegistrationsShort', language)}`;
  }

  let out = `\n\n${t('registrationsHeader', language)}\n`;

  if (presentUsers.length > 0) {
    out += `\n${t('presentHeader', language, { count: presentUsers.length })}\n`;
    presentUsers.forEach(u => (out += `• ${u}\n`));
  }
  if (lateUsers.length > 0) {
    out += `\n${t('lateHeader', language, { count: lateUsers.length })}\n`;
    lateUsers.forEach(u => (out += `• ${u}\n`));
  }
  if (absentUsers.length > 0) {
    out += `\n${t('absentHeader', language, { count: absentUsers.length })}\n`;
    absentUsers.forEach(u => (out += `• ${u}\n`));
  }
  return out;
}
