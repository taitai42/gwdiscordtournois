// Configuration des tournois Guild Wars
// Horaires en UTC pour chaque jour de la semaine
// Jour 0 = Dimanche, 1 = Lundi, etc.

export const TOURNAMENT_SCHEDULE = {
  ATA: {
    0: 2,  // Dimanche - 02:00 UTC
    1: 4,  // Lundi - 04:00 UTC
    2: 3,  // Mardi - 03:00 UTC
    3: 2,  // Mercredi - 02:00 UTC
    4: 3,  // Jeudi - 03:00 UTC
    5: 4,  // Vendredi - 04:00 UTC
    6: 3,  // Samedi - 03:00 UTC
  },
  ATB: {
    0: 11, // Dimanche - 11:00 UTC
    1: 13, // Lundi - 13:00 UTC
    2: 12, // Mardi - 12:00 UTC
    3: 11, // Mercredi - 11:00 UTC
    4: 12, // Jeudi - 12:00 UTC
    5: 13, // Vendredi - 13:00 UTC
    6: 12, // Samedi - 12:00 UTC
  },
  ATC: {
    0: 18, // Dimanche - 18:00 UTC
    1: 20, // Lundi - 20:00 UTC
    2: 19, // Mardi - 19:00 UTC
    3: 18, // Mercredi - 18:00 UTC
    4: 19, // Jeudi - 19:00 UTC
    5: 20, // Vendredi - 20:00 UTC
    6: 19, // Samedi - 19:00 UTC
  },
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
