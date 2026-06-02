// Internationalization helpers
// Discord sends a locale on each interaction (e.g. "fr", "en-US", "es-ES").
// We normalize that to a short language code and fall back to French (the
// original language of this bot) if a locale is unsupported.

const DEFAULT_LANGUAGE = 'fr';
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
    setupAutoPostSet: '✅ Tournois postés automatiquement chaque jour : **{list}**.',
    setupAutoPostEmpty: '✅ Aucun tournoi ne sera posté automatiquement.',
    setupNoPermission: '❌ Vous devez être administrateur pour utiliser cette commande.',
    setupOnlyInGuild: '❌ Cette commande doit être utilisée dans un serveur.',
    configMissing: '⚠️ Aucun canal n\'est configuré. Utilisez `/setup channel:#salon`.',
    configCurrent:
      '⚙️ **Configuration actuelle**\nCanal : {channel}\nLangue : **{language}**\nTournois automatiques : **{autoPost}**',
    autoPostNone: 'aucun',

    // Errors
    errorGeneric: '❌ Une erreur est survenue lors de l\'exécution de la commande.',
    errorButton: '❌ Une erreur est survenue.',
    autoPostedInscription: '📝 Message d\'inscription pour le tournoi {type} posté automatiquement.',
    tournamentPosted: '✅ Message pour le tournoi {type} posté avec succès !',

    // Welcome message sent on guildCreate
    welcomeTitle: '👋 Merci d\'avoir ajouté le bot Tournois Guild Wars !',
    welcomeBody:
      'Pour commencer, un administrateur doit exécuter :\n' +
      '`/setup channel:#salon` pour choisir le canal des annonces de tournois.\n\n' +
      'Optionnel : `/setup language:fr` ou `language:en` pour la langue des messages publics.\n' +
      'Tapez `/config` à tout moment pour voir la configuration actuelle.',

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
    cmdSetupAtaDesc: 'Poster automatiquement le tournoi AT A chaque jour',
    cmdSetupAtbDesc: 'Poster automatiquement le tournoi AT B chaque jour',
    cmdSetupAtcDesc: 'Poster automatiquement le tournoi AT C chaque jour',
    cmdSetupMatDesc: 'Poster automatiquement le tournoi mensuel mAT le 3e samedi',
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
    presentHeader: '✅ **Present ({count}):**',
    lateHeader: '⏰ **Late ({count}):**',
    absentHeader: '❌ **Absent ({count}):**',
    noRegistrationsShort: '📋 **No registrations yet.**',
    registrationsHeader: '📋 **Registrations:**',

    btnPresent: 'Present',
    btnAbsent: 'Absent',
    btnLate: 'Late',

    replyPresent: '✅ You are registered as present!',
    replyAbsent: '❌ You are marked as absent.',
    replyLate: '⏰ You are registered as late.',

    setupSuccess: '✅ Tournament channel set to {channel}.',
    setupLanguageSet: '✅ Default server language set to **{language}**.',
    setupAutoPostSet: '✅ Tournaments posted automatically every day: **{list}**.',
    setupAutoPostEmpty: '✅ No tournament will be posted automatically.',
    setupNoPermission: '❌ You must be an administrator to use this command.',
    setupOnlyInGuild: '❌ This command must be used inside a server.',
    configMissing: '⚠️ No channel is configured. Use `/setup channel:#channel`.',
    configCurrent:
      '⚙️ **Current configuration**\nChannel: {channel}\nLanguage: **{language}**\nAuto-posted tournaments: **{autoPost}**',
    autoPostNone: 'none',

    errorGeneric: '❌ An error occurred while executing the command.',
    errorButton: '❌ An error occurred.',
    autoPostedInscription: '📝 Registration message for tournament {type} posted automatically.',
    tournamentPosted: '✅ Message for tournament {type} posted successfully!',

    welcomeTitle: '👋 Thanks for adding the Guild Wars Tournaments bot!',
    welcomeBody:
      'To get started, an administrator must run:\n' +
      '`/setup channel:#channel` to choose the tournament announcement channel.\n\n' +
      'Optional: `/setup language:fr` or `language:en` to pick the public message language.\n' +
      'Use `/config` at any time to see the current configuration.',

    cmdReminderDesc: 'Show the tournament reminder with remaining time and the list of attendees',
    cmdReminderTypeDesc: 'Tournament type',
    cmdAtaDesc: 'Post the registration message for the AT A tournament (morning)',
    cmdAtbDesc: 'Post the registration message for the AT B tournament (afternoon)',
    cmdAtcDesc: 'Post the registration message for the AT C tournament (evening)',
    cmdMatDesc: 'Post the registration message for the monthly mAT tournament (3rd Saturday)',
    cmdSetupDesc: 'Configure the bot for this server (channel, language, auto-posted tournaments)',
    cmdSetupChannelDesc: 'Channel where tournament messages will be posted',
    cmdSetupLanguageDesc: 'Default language for this server\'s public messages',
    cmdSetupAtaDesc: 'Automatically post the AT A tournament every day',
    cmdSetupAtbDesc: 'Automatically post the AT B tournament every day',
    cmdSetupAtcDesc: 'Automatically post the AT C tournament every day',
    cmdSetupMatDesc: 'Automatically post the monthly mAT tournament on the 3rd Saturday',
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
