import { Client, GatewayIntentBits, Collection, REST, Routes } from 'discord.js';
import { data as marryData, execute as marryExecute } from './commands/marry.js';
import { data as divorceData, execute as divorceExecute } from './commands/divorce.js';
import { data as statusData, execute as statusExecute } from './commands/status.js';
import { data as waterData, execute as waterExecute } from './commands/water.js';
import { data as leaderboardData, execute as leaderboardExecute } from './commands/leaderboard.js';
import { data as mywaterData, execute as mywaterExecute } from './commands/mywater.js';
import { data as goalData, execute as goalExecute } from './commands/goal.js';
import { data as havekidData, execute as havekidExecute } from './commands/havekid.js';
import { data as kidsData, execute as kidsExecute } from './commands/kids.js';
import { data as resetwaterData, execute as resetwaterExecute } from './commands/resetwater.js';

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error('ERROR: DISCORD_BOT_TOKEN environment variable is not set.');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

const commandList = [
  { data: marryData, execute: marryExecute },
  { data: divorceData, execute: divorceExecute },
  { data: statusData, execute: statusExecute },
  { data: waterData, execute: waterExecute },
  { data: leaderboardData, execute: leaderboardExecute },
  { data: mywaterData, execute: mywaterExecute },
  { data: goalData, execute: goalExecute },
  { data: havekidData, execute: havekidExecute },
  { data: kidsData, execute: kidsExecute },
  { data: resetwaterData, execute: resetwaterExecute },
];

for (const cmd of commandList) {
  client.commands.set(cmd.data.name, cmd);
}

client.once('ready', async (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);
  console.log(`📡 Registering slash commands...`);

  const rest = new REST().setToken(token);
  const commands = commandList.map(cmd => cmd.data.toJSON());

  try {
    await rest.put(Routes.applicationCommands(c.user.id), { body: commands });
    console.log(`✅ Registered ${commands.length} slash commands globally:`);
    commands.forEach(cmd => console.log(`   /${cmd.name} — ${cmd.description}`));
  } catch (err) {
    console.error('❌ Failed to register commands:', err);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`Error executing /${interaction.commandName}:`, err);
    const msg = { content: '❌ Something went wrong. Please try again.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(msg).catch(() => {});
    } else {
      await interaction.reply(msg).catch(() => {});
    }
  }
});

client.login(token);
