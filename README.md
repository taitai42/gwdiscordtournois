# GW Tournois — Guild Wars tournament bot for Discord

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E=20-brightgreen.svg)](https://nodejs.org/)
[![discord.js](https://img.shields.io/badge/discord.js-v14-blue.svg)](https://discord.js.org/)

A purpose-built Discord bot for **Guild Wars** alliances that run regular **Automated Tournamentss (ATA / ATB / ATC)** and **Monthly Automated Tournaments (mAT)**. It announces sign-ups at the right time, collects RSVPs with one-click buttons, and shows times in every player's own timezone.

- Multi-tenant: each Discord server has its own channel, language, enabled tournaments and schedule.
- Bilingual: English & French, with auto-localized Discord timestamps for every other locale.
- Privacy-friendly: never reads message content; RSVPs live only in memory.

---

## Features

- **Automated tournament announcements** for ATA, ATB, ATC (daily) and mAT (monthly).
- **One-click RSVPs** with three buttons — *Playing*, *Not playing*, *Late* — and a live participants list.
- **Localized times**: announcements use native Discord timestamps so each user sees them in their own timezone and language.
- **Configurable schedule**: post N hours before each tournament (1h / 3h / 7h / 12h) **or** at a fixed daily hour (08:00 / 09:00 / 12:00 / 18:00 Europe/Paris).
- **Monthly tournament strategy**: the mAT message is posted on the 1st of the month so players have weeks to organize, and stays live with the participants list until the tournament starts.
- **Interactive setup wizard** with sensible defaults — admins can complete setup in a single click after picking a channel.
- **Slash commands**: `/setup`, `/config`, `/reminder`, `/ata`, `/atb`, `/atc`, `/mat`.

---

## Commands

| Command | Who | Description |
|---|---|---|
| `/setup` | Manage Server | Open the interactive setup wizard (channel, tournaments, language, schedule) |
| `/setup channel:#x [language] [ata\|atb\|atc\|mat:true\|false]` | Manage Server | Same as above via slash arguments |
| `/config` | Anyone | Show the current configuration for the server |
| `/reminder` | Anyone | Post a reminder for the next tournament of the day with current sign-ups |
| `/ata` `/atb` `/atc` `/mat` | Anyone | Manually post a sign-up message for that tournament |

Command names are always in English; descriptions and replies are localized to each user's Discord language.

---

## Add the bot to your server

1. Generate an OAuth2 install URL in the [Discord Developer Portal](https://discord.com/developers/applications) with the scopes `bot` and `applications.commands`, and the bot permissions: **View Channels**, **Send Messages**, **Embed Links**, **Use External Emojis**, **Read Message History**.
2. Visit the URL, choose your server and authorize.
3. In your server, run `/setup` and pick the announcement channel. That's it — sensible defaults (English, ATC + mAT, "7h before each tournament") are applied automatically.

The bot does **not** request the Message Content or Server Members privileged intents.

---

## Self-hosting

### Requirements

- [Node.js](https://nodejs.org/) 20 or newer (or Docker).
- A MySQL 8 database (or use the bundled `docker-compose.yml`).
- A Discord application — create one at https://discord.com/developers/applications and grab its **token** and **Application ID**.

### Quick start with Docker (recommended)

```bash
git clone https://github.com/taitai42/gwdiscordtournois.git
cd gwdiscordtournois
cp .env.example .env          # then edit .env with your token / DB password
docker compose up -d --build
docker compose exec bot npm run deploy   # register slash commands (one-off)
docker compose logs -f bot
```

The compose file starts a MySQL 8 container alongside the bot and wires them together automatically.

### Manual install

```bash
git clone https://github.com/taitai42/gwdiscordtournois.git
cd gwdiscordtournois
npm ci
cp .env.example .env          # fill in DISCORD_TOKEN, APPLICATION_ID, DB_*
npm run deploy                # register slash commands (one-off)
npm start
```

You'll need a reachable MySQL instance and the following env vars set (see `.env.example`):

| Variable | Description |
|---|---|
| `DISCORD_TOKEN` | Bot token from the developer portal |
| `APPLICATION_ID` | Application ID (used to register slash commands) |
| `DB_HOST` | MySQL host (defaults to `mysql` for docker-compose) |
| `DB_PORT` | MySQL port (defaults to `3306`) |
| `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL credentials |
| `MYSQL_ROOT_PASSWORD` | Only used by the bundled `mysql` service in docker-compose |

The schema is created automatically on first start.

---

## How scheduling works

- **Daily tournaments (ATA / ATB / ATC)** are posted based on the guild's schedule mode:
  - `before_Nh` → exactly *N* hours before each tournament fires (1h, 3h, 7h, 12h).
  - `fixed_HH` → every day at `HH:00` Europe/Paris (08, 09, 12, 18). All enabled daily tournaments are posted back-to-back.
- **Monthly tournament (mAT)** is posted on the **1st of the month** at the guild's chosen fixed hour (or 09:00 Europe/Paris if a `before_*` mode is selected). The message stays live and is updated as players RSVP, until the tournament actually happens on the 3rd Saturday at 16:00 UTC.
- A 30-minute reminder is sent automatically before each tournament starts.

The scheduler runs every minute in the Europe/Paris timezone — set `TZ=Europe/Paris` if you self-host outside docker-compose.

---

## Project layout

```
config.js            Tournament times (per weekday, UTC) and constants
deploy-commands.js   Registers slash commands with Discord
docker-compose.yml   Bot + MySQL stack
Dockerfile           Production image (node:20-alpine, non-root)
i18n.js              Translation tables (en / fr) + helpers
index.js             Bot entrypoint: event handlers, scheduler, command routing
storage.js           MySQL-backed per-guild configuration
utils.js             Tournament time helpers and message formatters
PRIVACY.md           Privacy Policy
TERMS.md             Terms of Service
```

---

## Privacy & Terms

- [Privacy Policy](PRIVACY.md) — what (little) data is stored and why.
- [Terms of Service](TERMS.md) — usage terms for the public instance.

The bot stores only the guild ID, configured channel ID, language, enabled tournaments and schedule mode. It does **not** read message content. RSVP data lives only in memory and is reset when a new sign-up message is posted.

---

## Contributing

Issues and pull requests are welcome at https://github.com/taitai42/gwdiscordtournois. When opening a PR, please:

- Keep changes focused; avoid drive-by refactors.
- Update both English and French strings in `i18n.js` if you add user-visible text.
- Avoid logging guild IDs, channel IDs or user names beyond what's already done.

---

## License

[MIT](LICENSE) — see the LICENSE file for details.
