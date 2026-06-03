# Privacy Policy

_Last updated: June 3, 2026_

This Privacy Policy describes what data the **Guild Wars Tournaments** Discord bot (the "Bot") collects, why it is collected, and how it is stored.

## 1. Who we are

The Bot is an open-source Discord application maintained on GitHub at <https://github.com/taitai42/gwdiscordtournois>. It is operated by the individual or entity hosting the Bot instance you have added to your server (the "Operator").

## 2. Data we collect

The Bot stores the **minimum** data needed to operate. We do **not** read message content, attachments, voice, or member lists.

### 2.1 Per-server configuration (persistent)

Stored in the Operator's MySQL database for each server (guild) where the Bot is installed:

| Field | Source | Purpose |
|---|---|---|
| Guild ID | Discord | Identify your server |
| Channel ID | `/setup` (you choose) | Where to post announcements |
| Language (`fr` / `en`) | `/setup` or your server's preferred locale | Language of public messages |
| Auto-posted tournaments list | `/setup` (you choose) | Which tournaments are announced automatically |
| Schedule mode | `/setup` (you choose) | When announcements are posted (N hours before, or fixed daily hour) |
| Role ID *(optional)* | `/setup` (you choose) | Server role to mention at the top of each announcement |
| Timestamps (`created_at`, `updated_at`) | Server | Diagnostics |

### 2.2 Per-session attendance (in-memory only)

When a user clicks **Playing / Not playing / Late** on a tournament inscription message, the Bot stores in **RAM** (never written to disk or database):

- The user's **display name** (or username if no nickname is set)
- Which RSVP category they selected
- The ID of the inscription message being updated

This in-memory data is **discarded** when:
- A new inscription message for the same tournament is posted
- The Bot process restarts
- The Bot is removed from the server

### 2.3 Operational logs

Standard server-side logs may contain Discord guild IDs, channel IDs, error messages, and timestamps. Logs are retained at the Operator's discretion and not shared.

## 3. What we do **not** collect

- Message content (the Bot does not request the `MessageContent` privileged intent)
- Direct messages
- Voice data
- Member lists or presence
- Email addresses, IP addresses, or any data outside Discord
- Any data about users who do not interact with the Bot's buttons or commands

## 4. How data is used

Collected data is used **only** to:
- Post tournament announcements in the channel you configured
- Update the inscription message with the list of RSVPs
- Send reminders 30 minutes before each tournament

We do not sell, share, or use your data for advertising, analytics, or any purpose other than running the Bot.

## 5. Data sharing

The Bot does not transmit any data to third parties. All data stays within:
- Discord's infrastructure (messages and interactions)
- The Operator's hosting environment (MySQL database + process memory)

## 6. Retention and deletion

- **Per-server configuration**: kept while the Bot is installed in your server. It is **automatically deleted** when the Bot is removed (via the `guildDelete` Discord event).
- **In-memory RSVP data**: discarded as described in §2.2 — never persisted.
- **Logs**: retained at the Operator's discretion (typically rotated within 30 days).

You may request immediate deletion at any time by:
1. Kicking the Bot from your server (this triggers automatic deletion of stored configuration), or
2. Contacting the Operator directly (see §9).

## 7. Children

The Bot is not directed at children under 13 (or the minimum age required by your jurisdiction to use Discord). The Operator does not knowingly collect data from such users.

## 8. Security

Data is stored in a MySQL database controlled by the Operator and is not exposed publicly. The Operator is responsible for securing the host, database credentials, and Discord bot token according to commonly accepted practices.

No system is perfectly secure; we make no guarantees beyond reasonable industry practice.

## 9. Contact

Questions, deletion requests, or security reports:

- Open an issue: <https://github.com/taitai42/gwdiscordtournois/issues>
- Contact the Operator of your Bot instance directly

## 10. Changes

This policy may be updated. Material changes will be noted by updating the "Last updated" date at the top. Continued use of the Bot after such updates constitutes acceptance.
