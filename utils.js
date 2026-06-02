import { TOURNAMENT_SCHEDULE, TOURNAMENT_NAMES, MONTHLY_TOURNAMENT } from './config.js';
import { t, intlLocale, DEFAULT_LANGUAGE } from './i18n.js';

/**
 * Retourne la date (UTC) de la N-ième occurrence d'un jour de semaine
 * dans le mois de la date donnée.
 * @param {Date} date - n'importe quelle date dans le mois ciblé
 * @param {number} weekday - 0 = dimanche, 6 = samedi
 * @param {number} occurrence - 1 = première, 2 = deuxième, etc.
 * @returns {Date} - date à 00:00:00 UTC
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
 * Vérifie si une date est le 3e samedi du mois (jour calendaire, UTC).
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
 * Retourne la date du prochain tournoi mensuel (3e samedi) à 16:00 UTC.
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
 * Obtient l'horaire d'un tournoi pour un jour donné.
 * Le résultat contient la date UTC ; l'affichage en heure locale est
 * délégué aux balises de timestamp Discord (<t:unix:t>) qui s'adaptent
 * automatiquement au fuseau et à la langue de chaque utilisateur.
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
 * Nom du jour dans la langue demandée.
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
function relativeTag(unix) {
  return `<t:${unix}:R>`; // "in 3 hours" / "dans 3 heures"
}

/**
 * Formate le message du matin pour le tournoi.
 * @param {string} type
 * @param {string} [language]
 */
export function formatMorningMessage(type = 'ATC', language = DEFAULT_LANGUAGE) {
  const tournament = getTodayTournament(type);
  const dayName = getDayName(new Date(), language);

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
 * Formate le message de rappel avec la liste des participants.
 */
export function formatReminderMessage(
  presentUsers,
  lateUsers,
  type = 'ATC',
  language = DEFAULT_LANGUAGE
) {
  const tournament = getTodayTournament(type);
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
 * Formate la liste des participants à ajouter sous le message d'inscription.
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
