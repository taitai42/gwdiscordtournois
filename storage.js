// MySQL-backed persistence for per-guild configuration.
// Schema: guild_configs(guild_id PK, channel_id, language, auto_post,
//                       schedule_mode, role_id, created_at, updated_at)

import mysql from 'mysql2/promise';
import { DEFAULT_LANGUAGE, normalizeLocale } from './i18n.js';

let pool = null;

function getPool() {
  if (pool) return pool;
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'mysql',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'bot',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gw_tournois',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
  });
  return pool;
}

/**
 * Wait for the database to be reachable, then create tables if needed.
 * Retries because in docker-compose the bot may start before MySQL is ready.
 */
export async function initStorage({ retries = 30, delayMs = 2000 } = {}) {
  const p = getPool();
  let lastError = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await p.query('SELECT 1');
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      console.log(`⏳ MySQL not ready (attempt ${attempt}/${retries})...`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  if (lastError) throw lastError;

  await p.query(`
    CREATE TABLE IF NOT EXISTS guild_configs (
      guild_id       VARCHAR(32)  NOT NULL PRIMARY KEY,
      channel_id     VARCHAR(32)  NOT NULL,
      language       VARCHAR(8)   NOT NULL DEFAULT '${DEFAULT_LANGUAGE}',
      auto_post      VARCHAR(64)  NOT NULL DEFAULT 'ATC,MAT',
      schedule_mode  VARCHAR(16)  NOT NULL DEFAULT 'before_7h',
      role_id        VARCHAR(32)  NULL,
      created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Backwards-compatible migrations.
  for (const ddl of [
    `ALTER TABLE guild_configs ADD COLUMN auto_post VARCHAR(64) NOT NULL DEFAULT 'ATC,MAT'`,
    `ALTER TABLE guild_configs ADD COLUMN schedule_mode VARCHAR(16) NOT NULL DEFAULT 'before_7h'`,
    `ALTER TABLE guild_configs ADD COLUMN role_id VARCHAR(32) NULL`,
  ]) {
    try {
      await p.query(ddl);
    } catch (error) {
      // ER_DUP_FIELDNAME (1060) means the column already exists — ignore it.
      if (error?.errno !== 1060) throw error;
    }
  }

  console.log('✅ MySQL ready');
}

function parseAutoPost(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);
}

function rowToConfig(row) {
  return row
    ? {
        channelId: row.channel_id,
        language: row.language,
        autoPost: parseAutoPost(row.auto_post),
        scheduleMode: row.schedule_mode || 'before_7h',        roleId: row.role_id || null,      }
    : null;
}

export async function getGuildConfig(guildId) {
  const [rows] = await getPool().query(
    'SELECT channel_id, language, auto_post, schedule_mode FROM guild_configs WHERE guild_id = ? LIMIT 1',
    [guildId]
  );
  return rowToConfig(rows[0]);
}

export async function setGuildChannel(guildId, channelId) {
  await getPool().query(
    `INSERT INTO guild_configs (guild_id, channel_id, language)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE channel_id = VALUES(channel_id)`,
    [guildId, channelId, DEFAULT_LANGUAGE]
  );
  return getGuildConfig(guildId);
}

export async function setGuildLanguage(guildId, language) {
  const lang = normalizeLocale(language);
  await getPool().query(
    `UPDATE guild_configs SET language = ? WHERE guild_id = ?`,
    [lang, guildId]
  );
  return getGuildConfig(guildId);
}

/**
 * Replace the list of tournament types that are auto-posted every day.
 * @param {string} guildId
 * @param {string[]} types - subset of ['ATA','ATB','ATC','MAT']
 */
export async function setGuildAutoPost(guildId, types) {
  const csv = (types || []).map(t => String(t).toUpperCase()).join(',');
  await getPool().query(
    `UPDATE guild_configs SET auto_post = ? WHERE guild_id = ?`,
    [csv, guildId]
  );
  return getGuildConfig(guildId);
}

/**
 * Update the auto-post schedule mode (e.g. 'before_7h', 'fixed_09').
 */
export async function setGuildScheduleMode(guildId, mode) {
  await getPool().query(
    `UPDATE guild_configs SET schedule_mode = ? WHERE guild_id = ?`,
    [String(mode), guildId]
  );
  return getGuildConfig(guildId);
}

/**
 * Set or clear the role to mention in tournament announcements.
 * Pass null/undefined/'' to clear.
 */
export async function setGuildRole(guildId, roleId) {
  const value = roleId ? String(roleId) : null;
  await getPool().query(
    `UPDATE guild_configs SET role_id = ? WHERE guild_id = ?`,
    [value, guildId]
  );
  return getGuildConfig(guildId);
}

/**
 * Create an empty config row (no channel yet) — used when the bot joins a
 * new guild so we can remember sensible defaults right away.
 */
export async function ensureGuildLanguage(guildId, language) {
  const lang = normalizeLocale(language);
  await getPool().query(
    `INSERT IGNORE INTO guild_configs (guild_id, channel_id, language, auto_post, schedule_mode)
       VALUES (?, '', ?, 'ATC,MAT', 'before_7h')`,
    [guildId, lang]
  );
}

export async function deleteGuildConfig(guildId) {
  await getPool().query('DELETE FROM guild_configs WHERE guild_id = ?', [guildId]);
}

/**
 * Returns all guilds that have a channel configured.
 * @returns {Promise<Array<[string, {channelId: string, language: string, autoPost: string[], scheduleMode: string}]>>}
 */
export async function getAllGuildConfigs() {
  const [rows] = await getPool().query(
    `SELECT guild_id, channel_id, language, auto_post, schedule_mode, role_id
       FROM guild_configs
       WHERE channel_id <> ''`
  );
  return rows.map(r => [
    r.guild_id,
    {
      channelId: r.channel_id,
      language: r.language,
      autoPost: parseAutoPost(r.auto_post),
      scheduleMode: r.schedule_mode || 'before_7h',
      roleId: r.role_id || null,
    },
  ]);
}

export async function closeStorage() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
