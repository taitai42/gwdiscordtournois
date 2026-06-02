// Internationalization helpers
// Discord sends a locale on each interaction (e.g. "fr", "en-US", "es-ES").
// We normalize that to a short language code and fall back to English (the
// most common locale) if a locale is unsupported.

const DEFAULT_LANGUAGE = 'en';
const SUPPORTED_LANGUAGES = ['fr', 'en'];

const translations = {
  fr: {
    // Morning / inscription message
    morningTitle: '🏆 **TOURNOI {type} - {day}** 🏆',
    morningBody:
      "Le tournoi automatique **{name}** aura lieu à {time} ({relative}).\n\n" +
      'Cliquez sur les boutons ci-dessous pour indiquer votre présence :\n\n' +
      'Un rappel sera envoyé 30 minutes avant le début du tournoi.',

    // Reminder message
    reminderTitle: '⏰ **RAPPEL TOURNOI {type}** ⏰',
    reminderBody: 'Le tournoi **{name}** commence {relative} à {time} !',
    noRegistrations: 'Aucune inscription pour le moment. 😢',
    participantsCount: '**{count} participant(s) inscrit(s) :**',
    presentHeader: '✅ **Présents ({count}) :**',
    lateHeader: '⏰ **En retard ({count}) :**',
    absentHeader: '❌ **Absents ({count}) :**',
    noRegistrationsShort: '📋 **Aucune inscription pour le moment.**',
    registrationsHeader: '📋 **Inscriptions :**',

    // Button labels
    btnPresent: 'Présent',
    btnAbsent: 'Absent',
    btnLate: 'En retard',

    // Button replies (ephemeral, per user)
    replyPresent: '✅ Vous êtes inscrit comme présent !',
    replyAbsent: '❌ Vous êtes marqué comme absent.',
    replyLate: '⏰ Vous êtes inscrit comme en retard.',

    // Setup / config
    setupSuccess: '✅ Canal des tournois configuré sur {channel}.',
    setupLanguageSet: '✅ Langue par défaut du serveur définie sur **{language}**.',
    setupAutoPostSet: '✅ Tournois postés automatiquement : **{list}**.',
    setupAutoPostEmpty: '✅ Aucun tournoi ne sera posté automatiquement.',
    setupNoPermission: '❌ Vous devez être administrateur pour utiliser cette commande.',
    setupOnlyInGuild: '❌ Cette commande doit être utilisée dans un serveur.',
    configMissing: '⚠️ Aucun canal n\'est configuré. Utilisez `/setup channel:#salon`.',
    configCurrent:
      '⚙️ **Configuration actuelle**\nCanal : {channel}\nLangue : **{language}**\nTournois automatiques : **{autoPost}**\nCalendrier : **{schedule}**',
    autoPostNone: 'aucun',

    // Errors
    errorGeneric: '❌ Une erreur est survenue lors de l\'exécution de la commande.',
    errorButton: '❌ Une erreur est survenue.',
    autoPostedInscription: '📝 Message d\'inscription pour le tournoi {type} posté automatiquement.',
    tournamentPosted: '✅ Message pour le tournoi {type} posté avec succès !',

    // Welcome message sent on guildCreate
    welcomeTitle: '👋 Merci d\'avoir ajouté le bot Tournois Guild Wars !',
    welcomeBody:
      'Pour commencer, un administrateur peut configurer le bot en deux clics ci-dessous,\n' +
      'ou bien utiliser la commande `/setup` à tout moment.',

    // Interactive setup wizard
    setupWizardTitle: '⚙️ **Configuration du bot Tournois Guild Wars**',
    setupWizardBody:
      'Tout est pré-rempli avec des valeurs raisonnables — ajustez si besoin, chaque sélection est enregistrée immédiatement.',
    setupSelectChannelPlaceholder: 'Choisir le canal des annonces…',
    setupSelectAutoPostPlaceholder: 'Choisir les tournois postés automatiquement…',
    setupSelectLanguagePlaceholder: 'Langue des messages publics…',
    setupSelectSchedulePlaceholder: 'Quand poster les annonces…',
    setupOptionAta: 'AT A — Matin',
    setupOptionAtb: 'AT B — Après-midi',
    setupOptionAtc: 'AT C — Soir',
    setupOptionMat: 'mAT — Mensuel (3e samedi)',
    setupOptionLanguageFr: 'Français',
    setupOptionLanguageEn: 'English',
    setupOptionScheduleBefore1h: '1h avant chaque tournoi',
    setupOptionScheduleBefore3h: '3h avant chaque tournoi',
    setupOptionScheduleBefore7h: '7h avant chaque tournoi (recommandé)',
    setupOptionScheduleBefore12h: '12h avant chaque tournoi',
    setupOptionScheduleFixed08: 'Chaque jour à 08:00 (Europe/Paris)',
    setupOptionScheduleFixed09: 'Chaque jour à 09:00 (Europe/Paris)',
    setupOptionScheduleFixed12: 'Chaque jour à 12:00 (Europe/Paris)',
    setupOptionScheduleFixed18: 'Chaque jour à 18:00 (Europe/Paris)',
    setupScheduleSet: '✅ Calendrier mis à jour : **{label}**.',

    // Slash command descriptions (used by deploy-commands.js)
    cmdReminderDesc: 'Affiche le rappel du tournoi avec le temps restant et la liste des inscrits',
    cmdReminderTypeDesc: 'Type de tournoi',
    cmdAtaDesc: 'Poste le message d\'inscription pour le tournoi AT A (matin)',
    cmdAtbDesc: 'Poste le message d\'inscription pour le tournoi AT B (après-midi)',
    cmdAtcDesc: 'Poste le message d\'inscription pour le tournoi AT C (soir)',
    cmdMatDesc: 'Poste le message d\'inscription pour le tournoi mensuel mAT (3e samedi)',
    cmdSetupDesc: 'Configure le bot pour ce serveur (canal, langue, tournois automatiques)',
    cmdSetupChannelDesc: 'Canal où poster les messages du tournoi',
    cmdSetupLanguageDesc: 'Langue par défaut des messages publics du serveur',
    cmdSetupAtaDesc: 'Poster automatiquement le tournoi AT A 7h avant son début',
    cmdSetupAtbDesc: 'Poster automatiquement le tournoi AT B 7h avant son début',
    cmdSetupAtcDesc: 'Poster automatiquement le tournoi AT C 7h avant son début',
    cmdSetupMatDesc: 'Poster automatiquement le tournoi mensuel mAT 7h avant (le 3e samedi)',
    cmdConfigDesc: 'Affiche la configuration actuelle du bot pour ce serveur',
  },
  en: {
    morningTitle: '🏆 **TOURNAMENT {type} - {day}** 🏆',
    morningBody:
      "The automatic tournament **{name}** will take place at {time} ({relative}).\n\n" +
      'Click the buttons below to indicate your attendance:\n\n' +
      'A reminder will be sent 30 minutes before the tournament starts.',

    reminderTitle: '⏰ **TOURNAMENT {type} REMINDER** ⏰',
    reminderBody: 'The **{name}** tournament starts {relative} at {time}!',
    noRegistrations: 'No registrations yet. 😢',
    participantsCount: '**{count} registered participant(s):**',
    presentHeader: '✅ **Playing ({count}):**',
    lateHeader: '⏰ **Late ({count}):**',
    absentHeader: '❌ **Not playing ({count}):**',
    noRegistrationsShort: '📋 **No registrations yet.**',
    registrationsHeader: '📋 **Registrations:**',

    btnPresent: 'Playing',
    btnAbsent: 'Not playing',
    btnLate: 'Late',

    replyPresent: '✅ You are registered as playing!',
    replyAbsent: '❌ You are marked as not playing.',
    replyLate: '⏰ You are registered as late.',

    setupSuccess: '✅ Tournament channel set to {channel}.',
    setupLanguageSet: '✅ Default server language set to **{language}**.',
    setupAutoPostSet: '✅ Tournaments posted automatically: **{list}**.',
    setupAutoPostEmpty: '✅ No tournament will be posted automatically.',
    setupNoPermission: '❌ You must be an administrator to use this command.',
    setupOnlyInGuild: '❌ This command must be used inside a server.',
    configMissing: '⚠️ No channel is configured. Use `/setup channel:#channel`.',
    configCurrent:
      '⚙️ **Current configuration**\nChannel: {channel}\nLanguage: **{language}**\nAuto-posted tournaments: **{autoPost}**\nSchedule: **{schedule}**',
    autoPostNone: 'none',

    errorGeneric: '❌ An error occurred while executing the command.',
    errorButton: '❌ An error occurred.',
    autoPostedInscription: '📝 Registration message for tournament {type} posted automatically.',
    tournamentPosted: '✅ Message for tournament {type} posted successfully!',

    welcomeTitle: '👋 Thanks for adding the Guild Wars Tournaments bot!',
    welcomeBody:
      'To get started, an administrator can configure the bot in two clicks below,\n' +
      'or run `/setup` at any time.',

    setupWizardTitle: '⚙️ **Guild Wars Tournaments bot — configuration**',
    setupWizardBody:
      'Everything is pre-filled with sensible defaults — adjust if needed, each selection is saved immediately.',
    setupSelectChannelPlaceholder: 'Pick the announcements channel…',
    setupSelectAutoPostPlaceholder: 'Pick which tournaments are posted automatically…',
    setupSelectLanguagePlaceholder: 'Public message language…',
    setupSelectSchedulePlaceholder: 'When to post the announcements…',
    setupOptionAta: 'AT A',
    setupOptionAtb: 'AT B',
    setupOptionAtc: 'AT C',
    setupOptionMat: 'mAT — Monthly (3rd Saturday)',
    setupOptionLanguageFr: 'Français',
    setupOptionLanguageEn: 'English',
    setupOptionScheduleBefore1h: '1h before each tournament',
    setupOptionScheduleBefore3h: '3h before each tournament',
    setupOptionScheduleBefore7h: '7h before each tournament (recommended)',
    setupOptionScheduleBefore12h: '12h before each tournament',
    setupOptionScheduleFixed08: 'Every day at 08:00 (Europe/Paris)',
    setupOptionScheduleFixed09: 'Every day at 09:00 (Europe/Paris)',
    setupOptionScheduleFixed12: 'Every day at 12:00 (Europe/Paris)',
    setupOptionScheduleFixed18: 'Every day at 18:00 (Europe/Paris)',
    setupScheduleSet: '✅ Schedule updated: **{label}**.',

    cmdReminderDesc: 'Show the tournament reminder with remaining time and the list of attendees',
    cmdReminderTypeDesc: 'Tournament type',
    cmdAtaDesc: 'Post the registration message for the AT A tournament (morning)',
    cmdAtbDesc: 'Post the registration message for the AT B tournament (afternoon)',
    cmdAtcDesc: 'Post the registration message for the AT C tournament (evening)',
    cmdMatDesc: 'Post the registration message for the monthly mAT tournament (3rd Saturday)',
    cmdSetupDesc: 'Configure the bot for this server (channel, language, auto-posted tournaments)',
    cmdSetupChannelDesc: 'Channel where tournament messages will be posted',
    cmdSetupLanguageDesc: 'Default language for this server\'s public messages',
    cmdSetupAtaDesc: 'Automatically post the AT A tournament 7h before it starts',
    cmdSetupAtbDesc: 'Automatically post the AT B tournament 7h before it starts',
    cmdSetupAtcDesc: 'Automatically post the AT C tournament 7h before it starts',
    cmdSetupMatDesc: 'Automatically post the monthly mAT tournament 7h before (3rd Saturday)',
    cmdConfigDesc: 'Show the current bot configuration for this server',
  },
};

/**
 * Normalize a Discord locale string (e.g. "en-US", "fr") to a supported
 * short language code. Falls back to the default language.
 * @param {string|undefined|null} locale
 * @returns {string}
 */
export function normalizeLocale(locale) {
  if (!locale) return DEFAULT_LANGUAGE;
  const short = String(locale).toLowerCase().split('-')[0];
  return SUPPORTED_LANGUAGES.includes(short) ? short : DEFAULT_LANGUAGE;
}

/**
 * Translate a key for the given locale, replacing {placeholders}.
 * @param {string} key
 * @param {string} [locale]
 * @param {Object} [vars]
 * @returns {string}
 */
export function t(key, locale = DEFAULT_LANGUAGE, vars = {}) {
  const lang = normalizeLocale(locale);
  const table = translations[lang] || translations[DEFAULT_LANGUAGE];
  const template =
    table[key] ?? translations[DEFAULT_LANGUAGE][key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name) =>
    vars[name] !== undefined ? String(vars[name]) : `{${name}}`
  );
}

/**
 * Get the Discord-style locale that matches a short language code.
 * Used for Intl-based date formatting on the server side.
 */
export function intlLocale(lang) {
  const normalized = normalizeLocale(lang);
  return normalized === 'fr' ? 'fr-FR' : 'en-US';
}

/**
 * Build a Discord localizations object ({ "en-US": "...", "fr": "..." })
 * suitable for setDescriptionLocalizations / setNameLocalizations.
 * The default (French) value is returned separately so the caller can use it
 * as the primary description.
 */
export function localizationsFor(key, vars = {}) {
  return {
    'en-US': t(key, 'en', vars),
    'en-GB': t(key, 'en', vars),
    fr: t(key, 'fr', vars),
  };
}

export { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES };
