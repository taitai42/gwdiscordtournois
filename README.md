# Bot Discord - Tournois Guild Wars

Bot Discord pour gérer automatiquement les inscriptions aux tournois automatiques de Guild Wars (AT A, AT B et AT C).

## 🎯 Fonctionnalités

- **Message quotidien automatique** : Poste chaque matin un message annonçant le tournoi AT C du soir
- **Commandes slash** :
  - `/rappel` : Affiche le rappel avec le temps restant et la liste des inscrits
  - `/ata` : Poste le message d'inscription pour le tournoi AT A (matin)
  - `/atb` : Poste le message d'inscription pour le tournoi AT B (après-midi)
- **Boutons** : Ajoute automatiquement 3 boutons pour que les joueurs indiquent leur présence :
  - ✅ Présent
  - ❌ Absent
  - ⏰ En retard


### Prérequis

- [Node.js](https://nodejs.org/) version 18 ou supérieure
- Un compte Discord
- Un serveur Discord où vous avez les permissions d'ajouter un bot

### Étapes d'installation

1. **Cloner ou télécharger le projet**

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Créer votre bot Discord**
   
   a. Allez sur le [Portail des développeurs Discord](https://discord.com/developers/applications)
   
   b. Cliquez sur "New Application" et donnez un nom à votre bot
   
   c. Dans le menu de gauche, cliquez sur "Bot"
   
   d. Cliquez sur "Add Bot" puis "Yes, do it!"
   
   e. Sous le nom du bot, cliquez sur "Reset Token" et copiez le token (gardez-le secret !)
   
   f. Activez les "Privileged Gateway Intents" suivants :
      - SERVER MEMBERS INTENT
      - MESSAGE CONTENT INTENT
   
   g. Dans le menu de gauche, cliquez sur "OAuth2" > "URL Generator"
   
   h. Sélectionnez les scopes :
      - `bot`
      - `applications.commands` (pour les commandes slash)
   
   i. Sélectionnez les permissions :
      - Send Messages
      - Add Reactions
      - Read Message History
      - View Channels
      - Use Slash Commands
   
   j. Copiez l'URL générée et ouvrez-la dans votre navigateur pour ajouter le bot à votre serveur
   
   k. **Important** : Retournez sur la page "General Information" et copiez l'**Application ID** (vous en aurez besoin pour les commandes slash)

4. **Obtenir l'ID du canal Discord**
   
   a. Dans Discord, activez le mode développeur (Paramètres utilisateur > Avancés > Mode développeur)
   
   b. Faites un clic droit sur le canal où vous voulez que le bot poste les messages
   
   c. Cliquez sur "Copier l'identifiant du salon"

5. **Configurer le bot**
   
   a. Copiez le fichier `.env.example` en `.env`
   ```bash
   cp .env.example .env
   ```
   
   b. Éditez le fichier `.env` et remplissez les valeurs :
   ```env
   DISCORD_TOKEN=votre_token_du_bot
   APPLICATION_ID=votre_application_id
   CHANNEL_ID=id_du_canal
   MORNING_POST_TIME=09:00
   ```
   
   - `DISCORD_TOKEN` : Le token de votre bot Discord
   - `APPLICATION_ID` : L'Application ID (depuis la page General Information du portail développeur)
   - `CHANNEL_ID` : L'ID du canal où poster les messages
   - `MORNING_POST_TIME` : L'heure à laquelle poster le message du matin AT C (format HH:MM, heure française)

6. **Déployer les commandes slash**
   
   Avant de démarrer le bot pour la première fois, vous devez enregistrer les commandes slash :
   ```bash
   npm run deploy
   ```
   
   Cette commande doit être exécutée une seule fois (ou chaque fois que vous modifiez les commandes).

## ▶️ Utilisation

### Avec Docker (Recommandé pour la production)
#### Démarrer le bot avec Docker

```bash
# Construire et démarrer le conteneur en arrière-plan
docker-compose up -d
# Ou avec npm
npm run docker:up

# Voir les logs en temps réel
docker-compose logs -f
# Ou avec npm
npm run docker:logs

# Arrêter le bot
docker-compose down
# Ou avec npm
npm run docker:down

# Redémarrer le bot
docker-compose restart
# Ou avec npm
npm run docker:restart

# Reconstruire après des modifications du code
docker-compose up -d --build
```

