import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const commands = [
  new SlashCommandBuilder()
    .setName('rappel')
    .setDescription('Affiche le rappel du tournoi avec le temps restant et la liste des inscrits')
    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('Type de tournoi')
        .setRequired(false)
        .addChoices(
          { name: 'AT A (Matin)', value: 'ATA' },
          { name: 'AT B (Après-midi)', value: 'ATB' },
          { name: 'AT C (Soir)', value: 'ATC' }
        )
    ),
  new SlashCommandBuilder()
    .setName('ata')
    .setDescription('Poste le message d\'inscription pour le tournoi AT A (matin)'),
  new SlashCommandBuilder()
    .setName('atb')
    .setDescription('Poste le message d\'inscription pour le tournoi AT B (après-midi)'),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('🔄 Déploiement des commandes slash...');

    // Vérifier si APPLICATION_ID est défini
    if (!process.env.APPLICATION_ID) {
      console.error('❌ APPLICATION_ID non défini dans le fichier .env');
      console.log('💡 Pour obtenir l\'APPLICATION_ID :');
      console.log('   1. Allez sur https://discord.com/developers/applications');
      console.log('   2. Sélectionnez votre application');
      console.log('   3. Copiez l\'Application ID depuis la page "General Information"');
      console.log('   4. Ajoutez APPLICATION_ID=votre_id dans le fichier .env');
      process.exit(1);
    }

    // Pour les commandes globales (disponibles partout où le bot est)
    await rest.put(
      Routes.applicationCommands(process.env.APPLICATION_ID),
      { body: commands }
    );

    console.log('✅ Commandes slash déployées avec succès !');
    console.log('📝 Commandes disponibles :');
    console.log('   - /rappel : Affiche le rappel avec temps restant');
    console.log('   - /ata : Poste le message pour le tournoi AT A');
    console.log('   - /atb : Poste le message pour le tournoi AT B');
  } catch (error) {
    console.error('❌ Erreur lors du déploiement des commandes:', error);
  }
})();
