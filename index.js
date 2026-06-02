import {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  Events,
} from 'discord.js';
import cron from 'node-cron';
import dotenv from 'dotenv';
import { TOURNAMENT_TYPES } from './config.js';
import {
  formatMorningMessage,
  formatReminderMessage,
  formatParticipantsBlock,
  getTodayTournament,
  getNextTournament,
  isReminderTime,
  isAutoPostTime,
  isThirdSaturday,
} from './utils.js';
import { t, normalizeLocale, SUPPORTED_LANGUAGES } from './i18n.js';
import {
  initStorage,
  closeStorage,
  getGuildConfig,
  setGuildChannel,
  setGuildLanguage,
  setGuildAutoPost,
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

async function postTournamentInscriptionMessage(guildId, type) {
  const config = await getGuildConfig(guildId);
  if (!config || !config.channelId) {
    throw new Error(`No channel configured for guild ${guildId}`);
  }
  const language = normalizeLocale(config.language);

  const channel = await client.channels.fetch(config.channelId);
  if (!channel) throw new Error('Channel not found');

  const message = formatMorningMessage(type, language);
  const row = buildButtonsRow(type, language);

  const sentMessage = await channel.send({ content: message, components: [row] });

  resetTournamentResponses(guildId, type);
  ensureGuildState(guildId)[type].message = sentMessage;

  console.log(`✅ Inscription message ${type} posted (guild ${guildId})`);
  return sentMessage;
}

async function postMorningMessageForAllGuilds(type = 'ATC') {
  const guilds = await getAllGuildConfigs();
  for (const [guildId] of guilds) {
    try {
      await postTournamentInscriptionMessage(guildId, type);
    } catch (error) {
      console.error(`❌ Morning message error ${type} (guild ${guildId}):`, error);
    }
  }
}

// Number of hours before a tournament at which the auto-post fires.
const AUTO_POST_HOURS_BEFORE = 7;

/**
 * Runs every minute. For each guild, posts the inscription message for any
 * auto-selected tournament whose start time is exactly 7 hours away.
 * `MAT` is only posted on the 3rd Saturday of the month.
 */
async function checkAutoPostTime() {
  let guilds;
  try {
    guilds = await getAllGuildConfigs();
  } catch (error) {
    console.error('❌ Auto-post lookup failed:', error);
    return;
  }
  const thirdSaturday = isThirdSaturday(new Date());
  for (const [guildId, config] of guilds) {
    const types = (config.autoPost || []).filter(
      tType => TOURNAMENT_TYPES[tType] && (tType !== 'MAT' || thirdSaturday)
    );
    for (const tType of types) {
      const next = getNextTournament(tType);
      if (!isAutoPostTime(next.date, AUTO_POST_HOURS_BEFORE)) continue;
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
      const config = await getGuildConfig(interaction.guildId);
      const text = config && config.channelId
        ? t('configCurrent', userLang, {
            channel: `<#${config.channelId}>`,
            language: normalizeLocale(config.language),
            autoPost: config.autoPost?.length
              ? config.autoPost.join(', ')
              : t('autoPostNone', userLang),
          })
        : t('configMissing', userLang);
      await interaction.reply({ content: text, ephemeral: true });
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
      })
    : t('configMissing', userLang);
  await interaction.reply({ content: text, ephemeral: true });
}

// -- Interaction dispatcher ------------------------------------------------

client.on(Events.InteractionCreate, async interaction => {
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
          const baseMessage = formatMorningMessage(type, guildLang);
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
  const lang = normalizeLocale(guild.preferredLocale);
  try {
    await ensureGuildLanguage(guild.id, lang);
  } catch (error) {
    console.error('❌ Failed to initialize guild config:', error);
  }

  const content = `${t('welcomeTitle', lang)}\n\n${t('welcomeBody', lang)}`;

  // Try to greet via the system channel; fall back to the first accessible
  // text channel; finally DM the owner.
  const me = guild.members.me;
  const systemChannel = guild.systemChannel;
  if (systemChannel?.permissionsFor(me)?.has(PermissionFlagsBits.SendMessages)) {
    try {
      await systemChannel.send(content);
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
      await fallback.send(content);
      return;
    } catch (error) {
      console.error('❌ Welcome to fallback channel failed:', error);
    }
  }

  try {
    const owner = await guild.fetchOwner();
    await owner.send(content);
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

  console.log(`⏰ Auto-post fires ${AUTO_POST_HOURS_BEFORE}h before each selected tournament`);
  console.log(`⏰ Reminder fires 30 min before each tournament`);
  console.log(`💬 Available commands: /reminder, /ata, /atb, /atc, /mat, /setup, /config`);

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
