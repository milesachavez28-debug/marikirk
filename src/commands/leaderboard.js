import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { getDailyLeaderboard, getWeeklyLeaderboard, getGoal } from '../database.js';
import { generateLeaderboardImage } from '../leaderboardImage.js';

function getTimeUntilMidnight() {
  const now = new Date();
  const midnight = new Date();
  midnight.setUTCHours(24, 0, 0, 0);
  const diffMs = midnight - now;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

export const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('Show the water drinking leaderboard')
  .addStringOption(opt =>
    opt.setName('period')
      .setDescription('Time period (default: today)')
      .setRequired(false)
      .addChoices(
        { name: 'Today', value: 'daily' },
        { name: 'This Week', value: 'weekly' }
      )
  );

export async function execute(interaction) {
  const guildId = interaction.guildId;
  const period = interaction.options.getString('period') ?? 'daily';

  await interaction.deferReply();

  const rows = period === 'weekly'
    ? getWeeklyLeaderboard(guildId)
    : getDailyLeaderboard(guildId);

  const title = period === 'weekly' ? 'Weekly Leaderboard' : 'Daily Leaderboard';
  const timeLeft = period === 'daily' ? getTimeUntilMidnight() : null;

  if (rows.length === 0) {
    const embed = new EmbedBuilder()
      .setColor(0x4fc3f7)
      .setTitle('💧 ' + title)
      .setDescription('No water logged yet! Use `/water` to start tracking. 💧');
    return interaction.editReply({ embeds: [embed] });
  }

  // Fetch Discord user data (username + avatar) for each entry
  const entries = await Promise.all(rows.map(async (row) => {
    let username = `User ${row.userId.slice(-4)}`;
    let avatarUrl = `https://cdn.discordapp.com/embed/avatars/${parseInt(row.userId) % 6}.png`;
    try {
      const user = await interaction.client.users.fetch(row.userId);
      username = user.displayName ?? user.username;
      avatarUrl = user.displayAvatarURL({ extension: 'png', size: 64 }) ?? avatarUrl;
    } catch {}
    return { userId: row.userId, username, avatarUrl, total: row.total, goalMl: getGoal(row.userId) };
  }));

  try {
    const imageBuffer = await generateLeaderboardImage(entries, title, timeLeft);
    const attachment = new AttachmentBuilder(imageBuffer, { name: 'leaderboard.png' });

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setImage('attachment://leaderboard.png')
      .setTimestamp();

    if (timeLeft) {
      embed.setFooter({ text: `🔄 Resets in ${timeLeft} (UTC midnight)` });
    }

    return interaction.editReply({ embeds: [embed], files: [attachment] });
  } catch (err) {
    console.error('Image generation failed:', err);
    // Fallback to text leaderboard
    const MEDALS = ['🥇', '🥈', '🥉'];
    const lines = entries.map((e, i) => {
      const medal = MEDALS[i] ?? `**${i + 1}.**`;
      const oz = (e.total / 29.5735).toFixed(1);
      const percent = Math.min(100, Math.round((e.total / e.goalMl) * 100));
      const goalTag = e.total >= e.goalMl ? ' ✅' : '';
      return `${medal} <@${e.userId}> — **${oz}oz** (${e.total}ml)${goalTag} · ${percent}%`;
    });
    const embed = new EmbedBuilder()
      .setColor(0x4fc3f7)
      .setTitle('💧 ' + title)
      .setDescription(lines.join('\n'))
      .setTimestamp();
    if (timeLeft) embed.setFooter({ text: `🔄 Resets in ${timeLeft} (UTC midnight)` });
    return interaction.editReply({ embeds: [embed] });
  }
}
