import {
  REST,
  Routes,
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} from 'discord.js';
import dotenv from 'dotenv';
import { t, localizationsFor } from './i18n.js';

dotenv.config();

// Command names are always in English so they are stable across locales.
// Descriptions use the default language as the primary string and add
// `description_localizations` so each user sees them in their own Discord
// client language.

const commands = [
  new SlashCommandBuilder()
    .setName('reminder')
    .setDescription(t('cmdReminderDesc'))
    .setDescriptionLocalizations(localizationsFor('cmdReminderDesc'))
    .addStringOption(option =>
      option
        .setName('type')
        .setDescription(t('cmdReminderTypeDesc'))
        .setDescriptionLocalizations(localizationsFor('cmdReminderTypeDesc'))
        .setRequired(false)
        .addChoices(
          { name: 'AT A (Morning)', value: 'ATA' },
          { name: 'AT B (Afternoon)', value: 'ATB' },
          { name: 'AT C (Evening)', value: 'ATC' },
          { name: 'mAT (Monthly)', value: 'MAT' }
        )
    ),
  new SlashCommandBuilder()
    .setName('ata')
    .setDescription(t('cmdAtaDesc'))
    .setDescriptionLocalizations(localizationsFor('cmdAtaDesc')),
  new SlashCommandBuilder()
    .setName('atb')
    .setDescription(t('cmdAtbDesc'))
    .setDescriptionLocalizations(localizationsFor('cmdAtbDesc')),
  new SlashCommandBuilder()
    .setName('atc')
    .setDescription(t('cmdAtcDesc'))
    .setDescriptionLocalizations(localizationsFor('cmdAtcDesc')),
  new SlashCommandBuilder()
    .setName('mat')
    .setDescription(t('cmdMatDesc'))
    .setDescriptionLocalizations(localizationsFor('cmdMatDesc')),
  new SlashCommandBuilder()
    .setName('setup')
    .setDescription(t('cmdSetupDesc'))
    .setDescriptionLocalizations(localizationsFor('cmdSetupDesc'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription(t('cmdSetupChannelDesc'))
        .setDescriptionLocalizations(localizationsFor('cmdSetupChannelDesc'))
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('language')
        .setDescription(t('cmdSetupLanguageDesc'))
        .setDescriptionLocalizations(localizationsFor('cmdSetupLanguageDesc'))
        .setRequired(false)
        .addChoices(
          { name: 'Français', value: 'fr' },
          { name: 'English', value: 'en' }
        )
    )
    .addBooleanOption(option =>
      option
        .setName('ata')
        .setDescription(t('cmdSetupAtaDesc'))
        .setDescriptionLocalizations(localizationsFor('cmdSetupAtaDesc'))
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option
        .setName('atb')
        .setDescription(t('cmdSetupAtbDesc'))
        .setDescriptionLocalizations(localizationsFor('cmdSetupAtbDesc'))
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option
        .setName('atc')
        .setDescription(t('cmdSetupAtcDesc'))
        .setDescriptionLocalizations(localizationsFor('cmdSetupAtcDesc'))
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option
        .setName('mat')
        .setDescription(t('cmdSetupMatDesc'))
        .setDescriptionLocalizations(localizationsFor('cmdSetupMatDesc'))
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('config')
    .setDescription(t('cmdConfigDesc'))
    .setDescriptionLocalizations(localizationsFor('cmdConfigDesc'))
    .setDMPermission(false),
  new SlashCommandBuilder()
    .setName('debug')
    .setDescription('Run the auto-post check immediately (admin only, for testing)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('🔄 Deploying slash commands...');

    if (!process.env.APPLICATION_ID) {
      console.error('❌ APPLICATION_ID is not set in .env');
      process.exit(1);
    }

    await rest.put(
      Routes.applicationCommands(process.env.APPLICATION_ID),
      { body: commands }
    );

    console.log('✅ Slash commands deployed successfully.');
    console.log('📝 Available commands:');
    console.log('   - /reminder : reminder with remaining time and current sign-ups');
    console.log('   - /ata, /atb, /atc, /mat : post a sign-up message for that tournament');
    console.log('   - /setup : configure channel, language, auto-posted tournaments and schedule');
    console.log('   - /config : show the current configuration');
  } catch (error) {
    console.error('❌ Failed to deploy commands:', error);
  }
})();
