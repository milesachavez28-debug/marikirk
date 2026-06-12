import { REST, Routes } from 'discord.js';
import { data as marryData } from './commands/marry.js';
import { data as divorceData } from './commands/divorce.js';
import { data as statusData } from './commands/status.js';
import { data as waterData } from './commands/water.js';
import { data as leaderboardData } from './commands/leaderboard.js';
import { data as mywaterData } from './commands/mywater.js';

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error('DISCORD_BOT_TOKEN is not set!');
  process.exit(1);
}

const commands = [marryData, divorceData, statusData, waterData, leaderboardData, mywaterData].map(c => c.toJSON());

const rest = new REST().setToken(token);

(async () => {
  console.log(`Registering ${commands.length} slash commands globally...`);
  try {
    await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID || ''), { body: commands });
    console.log('Commands registered successfully!');
  } catch (err) {
    console.error('Failed to register commands:', err);
    process.exit(1);
  }
})();
