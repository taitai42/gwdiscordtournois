import { TOURNAMENT_SCHEDULE, TOURNAMENT_TYPES, TOURNAMENT_NAMES } from './config.js';

/**
 * Obtient l'horaire d'un tournoi pour un jour donné
 * @param {Date} date - La date pour laquelle obtenir l'horaire
 * @param {string} type - Le type de tournoi (ATA, ATB, ATC)
 * @returns {Object} - Objet contenant les heures UTC et françaises
 */
export function getTournamentTime(date, type = 'ATC') {
  const dayOfWeek = date.getDay();
  const utcHour = TOURNAMENT_SCHEDULE[type][dayOfWeek];
  
  // Créer une date avec l'heure du tournoi en UTC (toujours à l'heure pile)
  const tournamentDate = new Date(date);
  tournamentDate.setUTCHours(utcHour, 0, 0, 0);
  
  return {
    type,
    typeName: TOURNAMENT_NAMES[type],
    utcHour,
    frenchTime: tournamentDate.toLocaleTimeString('fr-FR', {
      timeZone: 'Europe/Paris',
      hour: '2-digit',
      minute: '2-digit'
    }),
    date: tournamentDate
  };
}

/**
 * Obtient l'horaire du tournoi d'aujourd'hui
 * @param {string} type - Le type de tournoi (ATA, ATB, ATC)
 * @returns {Object} - Objet contenant les informations du tournoi
 */
export function getTodayTournament(type = 'ATC') {
  const today = new Date();
  return getTournamentTime(today, type);
}

/**
 * Obtient le nom du jour en français
 * @param {Date} date - La date
 * @returns {string} - Nom du jour en français
 */
export function getDayName(date) {
  return date.toLocaleDateString('fr-FR', { weekday: 'long' });
}

/**
 * Calcule l'heure du rappel (30 min avant le tournoi)
 * @param {Date} tournamentDate - Date et heure du tournoi
 * @returns {Date} - Date et heure du rappel
 */
export function getReminderTime(tournamentDate) {
  const reminderDate = new Date(tournamentDate);
  reminderDate.setMinutes(reminderDate.getMinutes() - 30);
  return reminderDate;
}

/**
 * Vérifie si c'est le moment de poster le rappel
 * @param {Date} tournamentDate - Date et heure du tournoi
 * @returns {boolean} - True si c'est le moment du rappel
 */
export function isReminderTime(tournamentDate) {
  const now = new Date();
  const reminderTime = getReminderTime(tournamentDate);
  
  // Vérifier si on est dans la minute du rappel
  return now >= reminderTime && 
         now < new Date(reminderTime.getTime() + 60000); // Dans la minute
}

/**
 * Calcule le temps restant jusqu'au tournoi
 * @param {Date} tournamentDate - Date et heure du tournoi
 * @returns {Object} - Objet contenant les heures et minutes restantes
 */
export function getTimeUntilTournament(tournamentDate) {
  const now = new Date();
  const diff = tournamentDate - now;
  
  if (diff < 0) {
    return {
      hours: 0,
      minutes: 0,
      isPassed: true,
      text: 'Le tournoi est déjà passé'
    };
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  let text = 'Le tournoi commence dans ';
  if (hours > 0) {
    text += `${hours}h`;
    if (minutes > 0) text += ` ${minutes}min`;
  } else {
    text += `${minutes} minutes`;
  }
  
  return {
    hours,
    minutes,
    isPassed: false,
    text
  };
}

/**
 * Formate le message du matin pour le tournoi
 * @param {string} type - Le type de tournoi (ATA, ATB, ATC)
 * @returns {string} - Message formaté
 */
export function formatMorningMessage(type = 'ATC') {
  const tournament = getTodayTournament(type);
  const dayName = getDayName(new Date());
  
  return `🏆 **TOURNOI ${type} - ${dayName.toUpperCase()}** 🏆\n\n` +
         `Le tournoi automatique **${tournament.typeName}** de ce soir aura lieu à **${tournament.frenchTime}** (heure française).\n\n` +
         `Cliquez sur les boutons ci-dessous pour indiquer votre présence :\n\n` +
         `Un rappel sera envoyé 30 minutes avant le début du tournoi.`;
}

/**
 * Formate le message de rappel avec la liste des participants
 * @param {Array} presentUsers - Liste des utilisateurs présents
 * @param {Array} lateUsers - Liste des utilisateurs en retard
 * @param {string} type - Le type de tournoi (ATA, ATB, ATC)
 * @param {number} minutesBefore - Nombre de minutes avant le tournoi (optionnel)
 * @returns {string} - Message de rappel formaté
 */
export function formatReminderMessage(presentUsers, lateUsers, type = 'ATC', minutesBefore = null) {
  const tournament = getTodayTournament(type);
  const totalParticipants = presentUsers.length + lateUsers.length;
  
  let timeText = '';
  if (minutesBefore !== null) {
    timeText = `dans ${minutesBefore} minutes`;
  } else {
    const timeUntil = getTimeUntilTournament(tournament.date);
    timeText = timeUntil.isPassed ? 'maintenant' : `${timeUntil.hours > 0 ? timeUntil.hours + 'h' : ''} ${timeUntil.minutes}min`.trim();
  }
  
  let message = `⏰ **RAPPEL TOURNOI ${type}** ⏰\n\n` +
                `Le tournoi **${tournament.typeName}** commence ${timeText} à **${tournament.frenchTime}** !\n\n`;
  
  if (totalParticipants === 0) {
    message += `Aucune inscription pour le moment. 😢`;
  } else {
    message += `**${totalParticipants} participant(s) inscrit(s) :**\n\n`;
    
    if (presentUsers.length > 0) {
      message += `✅ **Présents (${presentUsers.length}) :**\n`;
      presentUsers.forEach(user => {
        message += `• ${user}\n`;
      });
      message += `\n`;
    }
    
    if (lateUsers.length > 0) {
      message += `⏰ **En retard (${lateUsers.length}) :**\n`;
      lateUsers.forEach(user => {
        message += `• ${user}\n`;
      });
    }
  }
  
  return message;
}
