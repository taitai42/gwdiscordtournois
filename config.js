// Configuration des tournois Guild Wars
// Horaires en UTC pour chaque jour de la semaine
// Jour 0 = Dimanche, 1 = Lundi, etc.

export const TOURNAMENT_SCHEDULE = {
  ATA: {
    0: { utcHour: 2, utcMinute: 0 },  // Dimanche - 02:00 UTC
    1: { utcHour: 4, utcMinute: 0 },  // Lundi - 04:00 UTC
    2: { utcHour: 3, utcMinute: 0 },  // Mardi - 03:00 UTC
    3: { utcHour: 2, utcMinute: 0 },  // Mercredi - 02:00 UTC
    4: { utcHour: 3, utcMinute: 0 },  // Jeudi - 03:00 UTC
    5: { utcHour: 4, utcMinute: 0 },  // Vendredi - 04:00 UTC
    6: { utcHour: 3, utcMinute: 0 },  // Samedi - 03:00 UTC
  },
  ATB: {
    0: { utcHour: 11, utcMinute: 0 }, // Dimanche - 11:00 UTC
    1: { utcHour: 13, utcMinute: 0 }, // Lundi - 13:00 UTC
    2: { utcHour: 12, utcMinute: 0 }, // Mardi - 12:00 UTC
    3: { utcHour: 11, utcMinute: 0 }, // Mercredi - 11:00 UTC
    4: { utcHour: 12, utcMinute: 0 }, // Jeudi - 12:00 UTC
    5: { utcHour: 13, utcMinute: 0 }, // Vendredi - 13:00 UTC
    6: { utcHour: 12, utcMinute: 0 }, // Samedi - 12:00 UTC
  },
  ATC: {
    0: { utcHour: 18, utcMinute: 0 }, // Dimanche - 18:00 UTC
    1: { utcHour: 20, utcMinute: 0 }, // Lundi - 20:00 UTC
    2: { utcHour: 19, utcMinute: 0 }, // Mardi - 19:00 UTC
    3: { utcHour: 18, utcMinute: 0 }, // Mercredi - 18:00 UTC
    4: { utcHour: 19, utcMinute: 0 }, // Jeudi - 19:00 UTC
    5: { utcHour: 20, utcMinute: 0 }, // Vendredi - 20:00 UTC
    6: { utcHour: 19, utcMinute: 0 }, // Samedi - 19:00 UTC
  },
};

// Emojis pour les réactions
export const REACTIONS = {
  PRESENT: '✅',
  ABSENT: '❌',
  RETARD: '⏰'
};

// Temps avant le tournoi pour le rappel (en minutes)
export const REMINDER_MINUTES_BEFORE = 30;

// Types de tournois
export const TOURNAMENT_TYPES = {
  ATA: 'ATA',
  ATB: 'ATB',
  ATC: 'ATC'
};

// Noms complets des tournois
export const TOURNAMENT_NAMES = {
  ATA: 'AT A (Matin)',
  ATB: 'AT B (Après-midi)',
  ATC: 'AT C (Soir)'
};
