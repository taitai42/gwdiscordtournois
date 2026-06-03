// Standalone diagnostic script: prints the current scheduling decision for
// every guild (or a specific one) without going through Discord. Run via:
//
//   docker compose exec bot node debug.js            # all guilds
//   docker compose exec bot node debug.js <guildId>  # a single guild

import dotenv from 'dotenv';
import { TOURNAMENT_TYPES } from './config.js';
import {
  initStorage,
  closeStorage,
  getAllGuildConfigs,
  getGuildConfig,
} from './storage.js';
import {
  getNextTournament,
  isAutoPostTime,
  isFixedHourNow,
  getParisTime,
  getParisDayOfMonth,
} from './utils.js';

dotenv.config();

const DEFAULT_SCHEDULE_MODE = 'before_7h';

function shouldPostNow(scheduleMode, tournamentType) {
  if (scheduleMode.startsWith('before_')) {
    const hours = Number(scheduleMode.slice('before_'.length).replace(/h$/, ''));
    if (!Number.isFinite(hours) || hours <= 0) return false;
    return isAutoPostTime(getNextTournament(tournamentType).date, hours);
  }
  if (scheduleMode.startsWith('fixed_')) {
    const hour = Number(scheduleMode.slice('fixed_'.length));
    if (!Number.isFinite(hour)) return false;
    return isFixedHourNow(hour);
  }
  return false;
}

function matPostHourForMode(scheduleMode) {
  const fixed = /^fixed_(\d{2})$/.exec(scheduleMode || '');
  if (fixed) {
    const h = Number(fixed[1]);
    if (Number.isFinite(h)) return h;
  }
  return 9;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function reportGuild(guildId, config) {
  const mode = config.scheduleMode || DEFAULT_SCHEDULE_MODE;
  const paris = getParisTime();
  const day = getParisDayOfMonth();

  console.log('');
  console.log(`── Guild ${guildId} ─────────────────────────────`);
  console.log(`  Channel:              ${config.channelId || '(none)'}`);
  console.log(`  Language:             ${config.language}`);
  console.log(`  Schedule mode:        ${mode}`);
  console.log(`  Auto-post tournaments: ${(config.autoPost || []).join(', ') || '(none)'}`);
  console.log(`  Mentioned role:       ${config.roleId || '(none)'}`);
  console.log(`  Paris time:           ${pad(paris.hour)}:${pad(paris.minute)} (day ${day})`);
  console.log('');
  console.log('  Per-tournament status:');

  const types = (config.autoPost || []).filter(t => TOURNAMENT_TYPES[t]);
  if (types.length === 0) {
    console.log('    (no tournaments enabled)');
    return;
  }

  for (const tType of types) {
    if (tType === 'MAT') {
      const matHour = matPostHourForMode(mode);
      const fires = day === 1 && isFixedHourNow(matHour);
      console.log(
        `    • MAT  → fires on day 1 @ ${pad(matHour)}:00 Paris — ${fires ? 'YES NOW' : 'no'}`
      );
    } else {
      const next = getNextTournament(tType);
      const fires = shouldPostNow(mode, tType);
      const minsAway = Math.round((next.date.getTime() - Date.now()) / 60000);
      console.log(
        `    • ${tType}  → next ${next.date.toISOString()} (in ${minsAway} min) — fires now: ${fires ? 'YES' : 'no'}`
      );
    }
  }
}

(async () => {
  try {
    await initStorage();
    const targetId = process.argv[2];

    if (targetId) {
      const config = await getGuildConfig(targetId);
      if (!config) {
        console.error(`❌ No config found for guild ${targetId}`);
        process.exit(1);
      }
      reportGuild(targetId, config);
    } else {
      const guilds = await getAllGuildConfigs();
      if (guilds.length === 0) {
        console.log('No configured guilds found.');
      } else {
        for (const [guildId, config] of guilds) {
          reportGuild(guildId, config);
        }
      }
    }

    console.log('');
  } catch (error) {
    console.error('❌ Debug script failed:', error);
    process.exit(1);
  } finally {
    await closeStorage();
  }
})();
