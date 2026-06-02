import {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  Events,
  ChannelSelectMenuBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ChannelType,
} from 'discord.js';
import cron from 'node-cron';
import dotenv from 'dotenv';
import { TOURNAMENT_TYPES } from './config.js';
import {
  formatMorningMessage,
  formatMonthlyMessage,
  formatReminderMessage,
  formatParticipantsBlock,
  getTodayTournament,
  getNextTournament,
  isReminderTime,
  isAutoPostTime,
  isFixedHourNow,
  isThirdSaturday,
  getParisDayOfMonth,
} from './utils.js';
import { t, normalizeLocale, SUPPORTED_LANGUAGES } from './i18n.js';
import {
  initStorage,
  closeStorage,
  getGuildConfig,
  setGuildChannel,
  setGuildLanguage,
  setGuildAutoPost,
  setGuildScheduleMode,
  ensureGuildLanguage,
  deleteGuildConfig,
  getAllGuildConfigs,
} from './storage.js';

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

// Per-guild, per-tournament in-memory tracking of inscription state.
const guildState = new Map();

function ensureGuildState(guildId) {
  if (!guildState.has(guildId)) {
    const initial = {};
    for (const type of Object.keys(TOURNAMENT_TYPES)) {
      initial[type] = {
        message: null,
        // Identifies the specific tournament instance the responses below belong
        // to (unix seconds of the tournament's start). When a new post is made
        // for the *same* instance we keep the responses; for a different
        // instance we reset them.
        tournamentKey: null,
        present: new Set(),
        absent: new Set(),
        late: new Set(),
      };
    }
    guildState.set(guildId, initial);
  }
  return guildState.get(guildId);
}

function resetTournamentResponses(guildId, type) {
  const state = ensureGuildState(guildId)[type];
  state.present.clear();
  state.absent.clear();
  state.late.clear();
}

function getButtonResponses(guildId, type) {
  const state = ensureGuildState(guildId)[type];
  return {
    presentUsers: Array.from(state.present),
    lateUsers: Array.from(state.late),
  };
}

function buildButtonsRow(type, language) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`present_${type}`)
      .setLabel(t('btnPresent', language))
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`absent_${type}`)
      .setLabel(t('btnAbsent', language))
      .setEmoji('❌')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`late_${type}`)
      .setLabel(t('btnLate', language))
      .setEmoji('⏰')
      .setStyle(ButtonStyle.Primary)
  );
}

/**
 * Build the interactive setup wizard (channel picker + tournaments multi-select).
 * Used by the welcome message and by `/setup` invoked without arguments.
 */
function buildSetupWizard(language, current = {}) {
  const autoPost = current.autoPost && current.autoPost.length ? current.autoPost : ['ATC', 'MAT'];
  const currentLang = SUPPORTED_LANGUAGES.includes(current.language) ? current.language : 'en';
  const currentSchedule = SCHEDULE_VALUES.has(current.scheduleMode)
    ? current.scheduleMode
    : DEFAULT_SCHEDULE_MODE;

  const content =
    `${t('setupWizardTitle', language)}\n\n${t('setupWizardBody', language)}`;

  const channelRow = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId('setup_channel')
      .setPlaceholder(t('setupSelectChannelPlaceholder', language))
      .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      .setMinValues(1)
      .setMaxValues(1)
  );

  const optionDefs = [
    { value: 'ATA', labelKey: 'setupOptionAta', emoji: '🌅' },
    { value: 'ATB', labelKey: 'setupOptionAtb', emoji: '☀️' },
    { value: 'ATC', labelKey: 'setupOptionAtc', emoji: '🌙' },
    { value: 'MAT', labelKey: 'setupOptionMat', emoji: '🏆' },
  ];
  const autoPostRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('setup_autopost')
      .setPlaceholder(t('setupSelectAutoPostPlaceholder', language))
      .setMinValues(0)
      .setMaxValues(optionDefs.length)
      .addOptions(
        optionDefs.map(o =>
          new StringSelectMenuOptionBuilder()
            .setLabel(t(o.labelKey, language))
            .setValue(o.value)
            .setEmoji(o.emoji)
            .setDefault(autoPost.includes(o.value))
        )
      )
  );

  const languageRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('setup_language')
      .setPlaceholder(t('setupSelectLanguagePlaceholder', language))
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel(t('setupOptionLanguageEn', language))
          .setValue('en')
          .setEmoji('🇬🇧')
          .setDefault(currentLang === 'en'),
        new StringSelectMenuOptionBuilder()
          .setLabel(t('setupOptionLanguageFr', language))
          .setValue('fr')
          .setEmoji('🇫🇷')
          .setDefault(currentLang === 'fr')
      )
  );

  const scheduleRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('setup_schedule')
      .setPlaceholder(t('setupSelectSchedulePlaceholder', language))
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(
        SCHEDULE_MODES.map(m =>
          new StringSelectMenuOptionBuilder()
            .setLabel(t(m.labelKey, language))
            .setValue(m.value)
            .setDefault(m.value === currentSchedule)
        )
      )
  );

  return {
    content,
    components: [channelRow, autoPostRow, languageRow, scheduleRow],
  };
}

async function postTournamentInscriptionMessage(guildId, type) {
  const config = await getGuildConfig(guildId);
  if (!config || !config.channelId) {
    throw new Error(`No channel configured for guild ${guildId}`);
  }
  const language = normalizeLocale(config.language);

  const channel = await client.channels.fetch(config.channelId);
  if (!channel) throw new Error('Channel not found');

  const baseMessage = type === 'MAT'
    ? formatMonthlyMessage(language)
    : formatMorningMessage(type, language);
  const row = buildButtonsRow(type, language);

  // Preserve existing RSVPs if this post targets the same tournament instance
  // (e.g. someone ran `/atc` a second time, or `/mat` mid-month).
  const state = ensureGuildState(guildId)[type];
  const nextKey = getNextTournament(type).unix;
  if (state.tournamentKey !== nextKey) {
    resetTournamentResponses(guildId, type);
    state.tournamentKey = nextKey;
  }

  const content = baseMessage + formatParticipantsBlock(state, language);
  const sentMessage = await channel.send({ content, components: [row] });
  state.message = sentMessage;

  console.log(`✅ Inscription message ${type} posted (guild ${guildId})`);
  return sentMessage;
}

// Available schedule modes shown in the wizard. The first one is the default.
const SCHEDULE_MODES = [
  { value: 'before_1h', labelKey: 'setupOptionScheduleBefore1h' },
  { value: 'before_3h', labelKey: 'setupOptionScheduleBefore3h' },
  { value: 'before_7h', labelKey: 'setupOptionScheduleBefore7h' },
  { value: 'before_12h', labelKey: 'setupOptionScheduleBefore12h' },
  { value: 'fixed_08', labelKey: 'setupOptionScheduleFixed08' },
  { value: 'fixed_09', labelKey: 'setupOptionScheduleFixed09' },
  { value: 'fixed_12', labelKey: 'setupOptionScheduleFixed12' },
  { value: 'fixed_18', labelKey: 'setupOptionScheduleFixed18' },
];
const DEFAULT_SCHEDULE_MODE = 'before_7h';
const SCHEDULE_VALUES = new Set(SCHEDULE_MODES.map(m => m.value));

function scheduleLabel(mode, language) {
  const def = SCHEDULE_MODES.find(m => m.value === mode);
  return def ? t(def.labelKey, language) : mode;
}

/**
 * Decide whether the given tournament should be posted *right now* for a guild
 * with the given schedule mode. Caller has already filtered MAT vs 3rd-Saturday.
 */
function shouldPostNow(scheduleMode, tournamentType) {
  if (scheduleMode.startsWith('before_')) {
    const hours = Number(scheduleMode.slice('before_'.length).replace(/h$/, ''));
    if (!Number.isFinite(hours) || hours <= 0) return false;
    const next = getNextTournament(tournamentType);
    return isAutoPostTime(next.date, hours);
  }
  if (scheduleMode.startsWith('fixed_')) {
    const hour = Number(scheduleMode.slice('fixed_'.length));
    if (!Number.isFinite(hour)) return false;
    return isFixedHourNow(hour);
  }
  return false;
}

/**
 * Hour at which MAT is posted on day 1 of the month for a given schedule mode.
 * For `fixed_HH` modes we honour the chosen hour; otherwise default to 09:00.
 */
function matPostHourForMode(scheduleMode) {
  const fixed = /^fixed_(\d{2})$/.exec(scheduleMode || '');
  if (fixed) {
    const h = Number(fixed[1]);
    if (Number.isFinite(h)) return h;
  }
  return 9;
}

/**
 * Runs every minute. For each guild, posts the inscription message for any
 * auto-selected tournament whose schedule matches the current minute.
 *
 * MAT is special: instead of firing close to the tournament, it is posted on
 * the 1st of the month at the guild's chosen hour (or 09:00 Europe/Paris by
 * default) so players have weeks to organize. The same message stays live and
 * collects RSVPs until the tournament actually happens.
 */
async function checkAutoPostTime() {
  let guilds;
  try {
    guilds = await getAllGuildConfigs();
  } catch (error) {
    console.error('❌ Auto-post lookup failed:', error);
    return;
  }
  const parisDay = getParisDayOfMonth();
  for (const [guildId, config] of guilds) {
    const mode = config.scheduleMode || DEFAULT_SCHEDULE_MODE;
    const enabled = (config.autoPost || []).filter(tType => TOURNAMENT_TYPES[tType]);
    for (const tType of enabled) {
      const fire = tType === 'MAT'
        ? parisDay === 1 && isFixedHourNow(matPostHourForMode(mode))
        : shouldPostNow(mode, tType);
      if (!fire) continue;
      try {
        await postTournamentInscriptionMessage(guildId, tType);
      } catch (error) {
        console.error(`❌ Auto-post error ${tType} (guild ${guildId}):`, error);
      }
    }
  }
}

async function postReminderMessageForAllGuilds(type) {
  const guilds = await getAllGuildConfigs();
  for (const [guildId, config] of guilds) {
    const state = ensureGuildState(guildId)[type];
    if (!state.message) continue;
    try {
      const language = normalizeLocale(config.language);
      const { presentUsers, lateUsers } = getButtonResponses(guildId, type);
      const message = formatReminderMessage(presentUsers, lateUsers, type, language);
      const channel = await client.channels.fetch(config.channelId);
      await channel.send(message);
      console.log(`✅ Reminder ${type} posted (guild ${guildId})`);
    } catch (error) {
      console.error(`❌ Reminder error ${type} (guild ${guildId}):`, error);
    }
  }
}

function checkReminderTime() {
  for (const type of Object.keys(TOURNAMENT_TYPES)) {
    if (type === 'MAT' && !isThirdSaturday(new Date())) continue;
    const tournament = getTodayTournament(type);
    if (isReminderTime(tournament.date)) {
      postReminderMessageForAllGuilds(type);
    }
  }
}

// -- Slash command handlers ------------------------------------------------

async function handleReminderCommand(interaction) {
  const userLang = normalizeLocale(interaction.locale);
  try {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.editReply(t('setupOnlyInGuild', userLang));
      return;
    }
    const config = await getGuildConfig(guildId);
    if (!config || !config.channelId) {
      await interaction.editReply(t('configMissing', userLang));
      return;
    }
    const guildLang = normalizeLocale(config.language);
    const type = interaction.options.getString('type') || 'ATC';

    if (!ensureGuildState(guildId)[type].message) {
      await postTournamentInscriptionMessage(guildId, type);
      await interaction.followUp(t('autoPostedInscription', userLang, { type }));
    }

    const { presentUsers, lateUsers } = getButtonResponses(guildId, type);
    const message = formatReminderMessage(presentUsers, lateUsers, type, guildLang);
    await interaction.editReply(message);
  } catch (error) {
    console.error('❌ /reminder error:', error);
    await interaction.editReply(t('errorGeneric', userLang));
  }
}

async function handleTournamentCommand(interaction, type) {
  const userLang = normalizeLocale(interaction.locale);
  try {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.editReply(t('setupOnlyInGuild', userLang));
      return;
    }
    const config = await getGuildConfig(guildId);
    if (!config || !config.channelId) {
      await interaction.editReply(t('configMissing', userLang));
      return;
    }
    await postTournamentInscriptionMessage(guildId, type);
    await interaction.editReply(t('tournamentPosted', userLang, { type }));
  } catch (error) {
    console.error(`❌ /${type.toLowerCase()} error:`, error);
    await interaction.editReply(t('errorGeneric', userLang));
  }
}

async function handleSetupCommand(interaction) {
  const userLang = normalizeLocale(interaction.locale);
  try {
    if (!interaction.guildId) {
      await interaction.reply({ content: t('setupOnlyInGuild', userLang), ephemeral: true });
      return;
    }
    if (
      !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) &&
      !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)
    ) {
      await interaction.reply({ content: t('setupNoPermission', userLang), ephemeral: true });
      return;
    }

    const channel = interaction.options.getChannel('channel');
    const languageOpt = interaction.options.getString('language');
    const autoPostFlags = {
      ATA: interaction.options.getBoolean('ata'),
      ATB: interaction.options.getBoolean('atb'),
      ATC: interaction.options.getBoolean('atc'),
      MAT: interaction.options.getBoolean('mat'),
    };
    const autoPostProvided = Object.values(autoPostFlags).some(v => v !== null);

    const replies = [];
    if (channel) {
      await setGuildChannel(interaction.guildId, channel.id);
      replies.push(t('setupSuccess', userLang, { channel: `<#${channel.id}>` }));
      replies.push(t('setupHelp', userLang));
    }
    if (languageOpt) {
      await setGuildLanguage(interaction.guildId, languageOpt);
      replies.push(t('setupLanguageSet', userLang, { language: normalizeLocale(languageOpt) }));
    }
    if (autoPostProvided) {
      const current = (await getGuildConfig(interaction.guildId))?.autoPost || [];
      const next = new Set(current);
      for (const [type, value] of Object.entries(autoPostFlags)) {
        if (value === true) next.add(type);
        else if (value === false) next.delete(type);
      }
      const ordered = ['ATA', 'ATB', 'ATC', 'MAT'].filter(t => next.has(t));
      await setGuildAutoPost(interaction.guildId, ordered);
      replies.push(
        ordered.length > 0
          ? t('setupAutoPostSet', userLang, { list: ordered.join(', ') })
          : t('setupAutoPostEmpty', userLang)
      );
    }

    if (replies.length === 0) {
      // No options provided — show the interactive wizard so admins can
      // pick channel + tournaments with select menus instead of typing.
      const config = await getGuildConfig(interaction.guildId);
      const wizard = buildSetupWizard(userLang, {
        autoPost: config?.autoPost,
        language: config?.language,
        scheduleMode: config?.scheduleMode,
      });
      await interaction.reply({ ...wizard, ephemeral: true });
      return;
    }

    await interaction.reply({ content: replies.join('\n'), ephemeral: true });
  } catch (error) {
    console.error('❌ /setup error:', error);
    await interaction.reply({ content: t('errorGeneric', userLang), ephemeral: true });
  }
}

async function handleConfigCommand(interaction) {
  const userLang = normalizeLocale(interaction.locale);
  if (!interaction.guildId) {
    await interaction.reply({ content: t('setupOnlyInGuild', userLang), ephemeral: true });
    return;
  }
  const config = await getGuildConfig(interaction.guildId);
  const text = config && config.channelId
    ? t('configCurrent', userLang, {
        channel: `<#${config.channelId}>`,
        language: normalizeLocale(config.language),
        autoPost: config.autoPost?.length
          ? config.autoPost.join(', ')
          : t('autoPostNone', userLang),
        schedule: scheduleLabel(config.scheduleMode || DEFAULT_SCHEDULE_MODE, userLang),
      })
    : t('configMissing', userLang);
  await interaction.reply({ content: text, ephemeral: true });
}

// -- Interaction dispatcher ------------------------------------------------

client.on(Events.InteractionCreate, async interaction => {
  // Interactive setup wizard: channel picker + tournaments multi-select.
  if (interaction.isChannelSelectMenu() || interaction.isStringSelectMenu()) {
    const setupIds = new Set([
      'setup_channel',
      'setup_autopost',
      'setup_language',
      'setup_schedule',
    ]);
    if (setupIds.has(interaction.customId)) {
      const userLang = normalizeLocale(interaction.locale);
      try {
        if (!interaction.guildId) {
          await interaction.reply({ content: t('setupOnlyInGuild', userLang), ephemeral: true });
          return;
        }
        if (
          !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) &&
          !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)
        ) {
          await interaction.reply({ content: t('setupNoPermission', userLang), ephemeral: true });
          return;
        }

        if (interaction.customId === 'setup_channel') {
          const channelId = interaction.values[0];
          await setGuildChannel(interaction.guildId, channelId);
          await interaction.reply({
            content:
              t('setupSuccess', userLang, { channel: `<#${channelId}>` }) +
              '\n\n' +
              t('setupHelp', userLang),
            ephemeral: true,
          });
        } else if (interaction.customId === 'setup_autopost') {
          const ordered = ['ATA', 'ATB', 'ATC', 'MAT'].filter(type =>
            interaction.values.includes(type)
          );
          await setGuildAutoPost(interaction.guildId, ordered);
          await interaction.reply({
            content:
              ordered.length > 0
                ? t('setupAutoPostSet', userLang, { list: ordered.join(', ') })
                : t('setupAutoPostEmpty', userLang),
            ephemeral: true,
          });
        } else if (interaction.customId === 'setup_language') {
          const lang = normalizeLocale(interaction.values[0]);
          await setGuildLanguage(interaction.guildId, lang);
          await interaction.reply({
            content: t('setupLanguageSet', lang, { language: lang }),
            ephemeral: true,
          });
        } else if (interaction.customId === 'setup_schedule') {
          const mode = SCHEDULE_VALUES.has(interaction.values[0])
            ? interaction.values[0]
            : DEFAULT_SCHEDULE_MODE;
          await setGuildScheduleMode(interaction.guildId, mode);
          await interaction.reply({
            content: t('setupScheduleSet', userLang, { label: scheduleLabel(mode, userLang) }),
            ephemeral: true,
          });
        }
      } catch (error) {
        console.error('❌ Setup select error:', error);
        try {
          await interaction.reply({ content: t('errorGeneric', userLang), ephemeral: true });
        } catch {}
      }
      return;
    }
  }

  if (interaction.isButton()) {
    const userLang = normalizeLocale(interaction.locale);
    try {
      const [action, type] = interaction.customId.split('_');
      if (!['present', 'absent', 'late'].includes(action) || !TOURNAMENT_TYPES[type]) {
        return;
      }
      const guildId = interaction.guildId;
      if (!guildId) return;

      const username = interaction.user.displayName || interaction.user.username;
      const state = ensureGuildState(guildId)[type];

      state.present.delete(username);
      state.absent.delete(username);
      state.late.delete(username);
      state[action].add(username);

      const replyKey =
        action === 'present' ? 'replyPresent' : action === 'absent' ? 'replyAbsent' : 'replyLate';
      await interaction.reply({ content: t(replyKey, userLang), ephemeral: true });

      if (state.message) {
        try {
          const config = await getGuildConfig(guildId);
          const guildLang = normalizeLocale(config?.language);
          const baseMessage = type === 'MAT'
            ? formatMonthlyMessage(guildLang)
            : formatMorningMessage(type, guildLang);
          const participantsList = formatParticipantsBlock(state, guildLang);
          await state.message.edit({
            content: baseMessage + participantsList,
            components: [buildButtonsRow(type, guildLang)],
          });
        } catch (editError) {
          console.error('❌ Failed to update inscription message:', editError);
        }
      }
    } catch (error) {
      console.error('❌ Button error:', error);
      try {
        await interaction.reply({
          content: t('errorButton', normalizeLocale(interaction.locale)),
          ephemeral: true,
        });
      } catch {}
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  switch (interaction.commandName) {
    case 'reminder':
      await handleReminderCommand(interaction);
      break;
    case 'ata':
      await handleTournamentCommand(interaction, 'ATA');
      break;
    case 'atb':
      await handleTournamentCommand(interaction, 'ATB');
      break;
    case 'atc':
      await handleTournamentCommand(interaction, 'ATC');
      break;
    case 'mat':
      await handleTournamentCommand(interaction, 'MAT');
      break;
    case 'setup':
      await handleSetupCommand(interaction);
      break;
    case 'config':
      await handleConfigCommand(interaction);
      break;
  }
});

// -- Guild lifecycle --------------------------------------------------------

client.on(Events.GuildCreate, async guild => {
  console.log(`➕ Joined guild ${guild.name} (${guild.id})`);
  // Default new guilds to English; admins can switch via the wizard.
  const lang = 'en';
  try {
    await ensureGuildLanguage(guild.id, lang);
  } catch (error) {
    console.error('❌ Failed to initialize guild config:', error);
  }

  const wizard = buildSetupWizard(lang, {
    autoPost: ['ATC', 'MAT'],
    language: lang,
    scheduleMode: DEFAULT_SCHEDULE_MODE,
  });
  const payload = {
    content: `${t('welcomeTitle', lang)}\n\n${t('welcomeBody', lang)}\n\n${wizard.content}`,
    components: wizard.components,
  };

  // Try to greet via the system channel; fall back to the first accessible
  // text channel; finally DM the owner (DMs cannot include guild components,
  // so we fall back to a plain message there).
  const me = guild.members.me;
  const systemChannel = guild.systemChannel;
  if (systemChannel?.permissionsFor(me)?.has(PermissionFlagsBits.SendMessages)) {
    try {
      await systemChannel.send(payload);
      return;
    } catch (error) {
      console.error('❌ Welcome to system channel failed:', error);
    }
  }

  const fallback = guild.channels.cache.find(
    c =>
      c.isTextBased?.() &&
      c.permissionsFor(me)?.has(PermissionFlagsBits.SendMessages)
  );
  if (fallback) {
    try {
      await fallback.send(payload);
      return;
    } catch (error) {
      console.error('❌ Welcome to fallback channel failed:', error);
    }
  }

  try {
    const owner = await guild.fetchOwner();
    await owner.send({
      content: `${t('welcomeTitle', lang)}\n\n${t('welcomeBody', lang)}`,
    });
  } catch (error) {
    console.error('❌ Welcome DM to owner failed:', error);
  }
});

client.on(Events.GuildDelete, async guild => {
  console.log(`➖ Removed from guild ${guild.name} (${guild.id})`);
  try {
    await deleteGuildConfig(guild.id);
    guildState.delete(guild.id);
  } catch (error) {
    console.error('❌ Failed to clean up guild config:', error);
  }
});

// -- Ready ------------------------------------------------------------------

client.on(Events.ClientReady, () => {
  console.log('🤖 Discord bot connected!');
  console.log(`📝 Logged in as ${client.user.tag}`);
  console.log(`🌐 Supported languages: ${SUPPORTED_LANGUAGES.join(', ')}`);

  console.log('⏰ Auto-post fires per guild schedule (default: 7h before each tournament)');
  console.log('⏰ Reminder fires 30 min before each tournament');
  console.log('💬 Available commands: /reminder, /ata, /atb, /atc, /mat, /setup, /config');

  cron.schedule(
    '* * * * *',
    () => {
      checkAutoPostTime();
      checkReminderTime();
    },
    { timezone: 'Europe/Paris' }
  );
});

client.on('error', error => {
  console.error('❌ Discord error:', error);
});

process.on('unhandledRejection', error => {
  console.error('❌ Unhandled rejection:', error);
});

async function shutdown(signal) {
  console.log(`👋 Received ${signal}, shutting down...`);
  try {
    await client.destroy();
    await closeStorage();
  } finally {
    process.exit(0);
  }
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// -- Boot --------------------------------------------------------------------

(async () => {
  try {
    await initStorage();
    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    console.error('❌ Fatal startup error:', error);
    process.exit(1);
  }
})();
