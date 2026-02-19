import { Client, GatewayIntentBits, Collection, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import cron from 'node-cron';
import dotenv from 'dotenv';
import { TOURNAMENT_TYPES } from './config.js';
import { 
  formatMorningMessage, 
  formatReminderMessage, 
  getTodayTournament,
  isReminderTime,
  getTimeUntilTournament
} from './utils.js';

dotenv.config();

// Créer le client Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

// Stocker les messages du jour pour le rappel (un pour chaque type de tournoi)
const dailyTournamentMessages = {
  ATA: null,
  ATB: null,
  ATC: null
};

// Stocker les réponses des utilisateurs pour chaque tournoi
const tournamentResponses = {
  ATA: { present: new Set(), absent: new Set(), late: new Set() },
  ATB: { present: new Set(), absent: new Set(), late: new Set() },
  ATC: { present: new Set(), absent: new Set(), late: new Set() }
};

/**
 * Poste le message du matin pour le tournoi
 * @param {string} type - Le type de tournoi (ATA, ATB, ATC)
 */
async function postMorningMessage(type = 'ATC') {
  try {
    await postTournamentInscriptionMessage(type);
    console.log(`✅ Message du matin ${type} posté avec succès`);
  } catch (error) {
    console.error(`❌ Erreur lors de la publication du message du matin ${type}:`, error);
  }
}

/**
 * Récupère les utilisateurs qui ont répondu via les boutons
 * @param {string} type - Le type de tournoi (ATA, ATB, ATC)
 * @returns {Object} - Objet contenant les listes d'utilisateurs
 */
function getButtonResponses(type) {
  const presentUsers = Array.from(tournamentResponses[type].present);
  const lateUsers = Array.from(tournamentResponses[type].late);
  
  return { presentUsers, lateUsers };
}

/**
 * Réinitialise les réponses pour un type de tournoi
 * @param {string} type - Le type de tournoi (ATA, ATB, ATC)
 */
function resetTournamentResponses(type) {
  tournamentResponses[type].present.clear();
  tournamentResponses[type].absent.clear();
  tournamentResponses[type].late.clear();
}

/**
 * Formate la liste des participants pour l'affichage dans le message
 * @param {string} type - Le type de tournoi (ATA, ATB, ATC)
 * @returns {string} - Liste formatée des participants
 */
function formatParticipantsList(type) {
  const presentUsers = Array.from(tournamentResponses[type].present);
  const absentUsers = Array.from(tournamentResponses[type].absent);
  const lateUsers = Array.from(tournamentResponses[type].late);
  const totalParticipants = presentUsers.length + lateUsers.length;
  
  if (totalParticipants === 0 && absentUsers.length === 0) {
    return '\n\n📋 **Aucune inscription pour le moment.**';
  }
  
  let participantsList = '\n\n📋 **Inscriptions :**\n';
  
  if (presentUsers.length > 0) {
    participantsList += `\n✅ **Présents (${presentUsers.length}) :**\n`;
    presentUsers.forEach(user => {
      participantsList += `• ${user}\n`;
    });
  }
  
  if (lateUsers.length > 0) {
    participantsList += `\n⏰ **En retard (${lateUsers.length}) :**\n`;
    lateUsers.forEach(user => {
      participantsList += `• ${user}\n`;
    });
  }
  
  if (absentUsers.length > 0) {
    participantsList += `\n❌ **Absents (${absentUsers.length}) :**\n`;
    absentUsers.forEach(user => {
      participantsList += `• ${user}\n`;
    });
  }
  
  return participantsList;
}

/**
 * Poste le message de rappel 30 minutes avant le tournoi
 * @param {string} type - Le type de tournoi (ATA, ATB, ATC)
 */
async function postReminderMessage(type = 'ATC') {
  try {
    if (!dailyTournamentMessages[type]) {
      console.log(`⚠️ Aucun message du matin trouvé pour le tournoi ${type}`);
      return;
    }

    const { presentUsers, lateUsers } = getButtonResponses(type);
    const message = formatReminderMessage(presentUsers, lateUsers, type, 30);

    const channel = await client.channels.fetch(process.env.CHANNEL_ID);
    await channel.send(message);

    console.log(`✅ Message de rappel ${type} posté avec succès`);
  } catch (error) {
    console.error(`❌ Erreur lors de la publication du message de rappel ${type}:`, error);
  }
}

/**
 * Vérifie si c'est le moment de poster le rappel pour tous les tournois
 */
function checkReminderTime() {
  for (const type of Object.keys(TOURNAMENT_TYPES)) {
    const tournament = getTodayTournament(type);
    if (isReminderTime(tournament.date)) {
      postReminderMessage(type);
    }
  }
}

/**
 * Poste le message d'inscription pour un tournoi et retourne le message
 * @param {string} type - Le type de tournoi (ATA, ATB, ATC)
 * @returns {Message} - Le message posté
 */
async function postTournamentInscriptionMessage(type) {
  const channel = await client.channels.fetch(process.env.CHANNEL_ID);
  if (!channel) {
    throw new Error('Canal non trouvé');
  }

  const message = formatMorningMessage(type);
  
  // Créer les boutons
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`present_${type}`)
        .setLabel('Présent')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`absent_${type}`)
        .setLabel('Absent')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`late_${type}`)
        .setLabel('En retard')
        .setEmoji('⏰')
        .setStyle(ButtonStyle.Primary)
    );

  const sentMessage = await channel.send({
    content: message,
    components: [row]
  });

  // Réinitialiser les réponses pour ce tournoi
  resetTournamentResponses(type);

  // Sauvegarder le message pour le rappel
  dailyTournamentMessages[type] = sentMessage;

  console.log(`✅ Message d'inscription ${type} posté avec succès`);
  return sentMessage;
}

/**
 * Gère la commande /rappel
 * @param {Interaction} interaction - L'interaction Discord
 */
async function handleRappelCommand(interaction) {
  try {
    await interaction.deferReply();

    const type = interaction.options.getString('type') || 'ATC';
    
    // Si le message d'inscription n'existe pas encore, le poster
    if (!dailyTournamentMessages[type]) {
      await postTournamentInscriptionMessage(type);
      await interaction.followUp(`📝 Message d'inscription pour le tournoi ${type} posté automatiquement.`);
    }

    const { presentUsers, lateUsers } = getButtonResponses(type);
    const message = formatReminderMessage(presentUsers, lateUsers, type);

    await interaction.editReply(message);
  } catch (error) {
    console.error('❌ Erreur lors de la commande /rappel:', error);
    await interaction.editReply('❌ Une erreur est survenue lors de l\'exécution de la commande.');
  }
}

/**
 * Gère les commandes /ata et /atb
 * @param {Interaction} interaction - L'interaction Discord
 * @param {string} type - Le type de tournoi (ATA ou ATB)
 */
async function handleTournamentCommand(interaction, type) {
  try {
    await interaction.deferReply();

    await postTournamentInscriptionMessage(type);

    await interaction.editReply(`✅ Message pour le tournoi ${type} posté avec succès !`);
  } catch (error) {
    console.error(`❌ Erreur lors de la commande /${type.toLowerCase()}:`, error);
    await interaction.editReply('❌ Une erreur est survenue lors de l\'exécution de la commande.');
  }
}

// Gestion des interactions (commandes slash et boutons)
client.on('interactionCreate', async interaction => {
  // Gestion des boutons
  if (interaction.isButton()) {
    try {
      const [action, type] = interaction.customId.split('_');
      
      if (!['present', 'absent', 'late'].includes(action) || !TOURNAMENT_TYPES[type]) {
        return;
      }

      const username = interaction.user.displayName || interaction.user.username;

      // Retirer l'utilisateur de toutes les catégories
      tournamentResponses[type].present.delete(username);
      tournamentResponses[type].absent.delete(username);
      tournamentResponses[type].late.delete(username);

      // Ajouter l'utilisateur à la catégorie appropriée
      tournamentResponses[type][action].add(username);

      let responseMessage = '';
      switch(action) {
        case 'present':
          responseMessage = '✅ Vous êtes inscrit comme présent !';
          break;
        case 'absent':
          responseMessage = '❌ Vous êtes marqué comme absent.';
          break;
        case 'late':
          responseMessage = '⏰ Vous êtes inscrit comme en retard.';
          break;
      }

      await interaction.reply({ content: responseMessage, ephemeral: true });

      // Mettre à jour le message original avec la liste des participants
      if (dailyTournamentMessages[type]) {
        try {
          const baseMessage = formatMorningMessage(type);
          const participantsList = formatParticipantsList(type);
          const updatedContent = baseMessage + participantsList;

          // Récréer les boutons pour le message mis à jour
          const row = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`present_${type}`)
                .setLabel('Présent')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId(`absent_${type}`)
                .setLabel('Absent')
                .setEmoji('❌')
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId(`late_${type}`)
                .setLabel('En retard')
                .setEmoji('⏰')
                .setStyle(ButtonStyle.Primary)
            );

          await dailyTournamentMessages[type].edit({
            content: updatedContent,
            components: [row]
          });
        } catch (editError) {
          console.error('❌ Erreur lors de la mise à jour du message:', editError);
        }
      }
    } catch (error) {
      console.error('❌ Erreur lors du traitement du bouton:', error);
      await interaction.reply({ content: '❌ Une erreur est survenue.', ephemeral: true });
    }
    return;
  }

  // Gestion des commandes slash
  if (!interaction.isChatInputCommand()) return;

  switch (interaction.commandName) {
    case 'rappel':
      await handleRappelCommand(interaction);
      break;
    case 'ata':
      await handleTournamentCommand(interaction, 'ATA');
      break;
    case 'atb':
      await handleTournamentCommand(interaction, 'ATB');
      break;
  }
});

// Événement de connexion du bot
client.on('ready', () => {
  console.log('🤖 Bot Discord connecté !');
  console.log(`📝 Connecté en tant que ${client.user.tag}`);
  
  // Récupérer l'heure du message du matin depuis .env
  const morningTime = process.env.MORNING_POST_TIME || '09:00';
  const [hour, minute] = morningTime.split(':');
  
  console.log(`⏰ Message du matin AT C programmé à ${morningTime} (heure française)`);
  console.log(`⏰ Vérification du rappel toutes les minutes`);
  console.log(`💬 Commandes disponibles: /rappel, /ata, /atb`);
  
  // Programmer le message du matin pour AT C uniquement (heure française)
  // Format cron: minute heure * * jour_semaine
  cron.schedule(`${minute} ${hour} * * *`, () => {
    console.log('📅 Déclenchement du message du matin AT C...');
    postMorningMessage('ATC');
  }, {
    timezone: 'Europe/Paris'
  });

  // Vérifier toutes les minutes si c'est l'heure du rappel pour tous les tournois
  cron.schedule('* * * * *', () => {
    checkReminderTime();
  }, {
    timezone: 'Europe/Paris'
  });
});

// Gestion des erreurs
client.on('error', (error) => {
  console.error('❌ Erreur Discord:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Erreur non gérée:', error);
});

// Connexion du bot
client.login(process.env.DISCORD_TOKEN);
