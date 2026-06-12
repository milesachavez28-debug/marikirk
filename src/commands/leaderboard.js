import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import {
  getDailyLeaderboard,
  getWeeklyLeaderboard,
  getGoal
} from '../database.js';
import { generateLeaderboardImage } from '../leaderboardImage.js';

function getTimeUntilMidnightUTC() {
  const now = new Date();

  const midnight = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1
    )
  );

  const diff = midnight.getTime() - now.getTime();

  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);

  return `${hours}h ${minutes}m`;
}

export const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('Show the water drinking leaderboard')
  .addStringOption(option =>
    option
      .setName('period')
      .setDescription('Choose a leaderboard period')
      .addChoices(
        { name: 'Today', value: 'daily' },
        { name: 'This Week', value: 'weekly' }
      )
  );

export async function execute(interaction) {
  await interaction.deferReply();

  const guildId = interaction.guildId;
  const period = interaction.options.getString('period') ?? 'daily';

  const rows =
    period === 'weekly'
      ? getWeeklyLeaderboard(guildId)
      : getDailyLeaderboard(guildId);

  const title =
    period === 'weekly'
      ? 'Weekly Leaderboard'
      : 'Daily Leaderboard';

  const timeLeft =
    period === 'daily'
      ? getTimeUntilMidnightUTC()
      : null;

  if (!rows.length) {
    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x4fc3f7)
          .setTitle(`💧 ${title}`)
          .setDescription(
            'No water logged yet! Use `/water` to start tracking.'
          )
      ]
    });
  }

  const entries = await Promise.all(
    rows.map(async row => {
      let username = `User ${String(row.userId).slice(-4)}`;

      let avatarUrl =
        `https://cdn.discordapp.com/embed/avatars/${Number(row.userId) % 6}.png`;

      try {
        const member = await interaction.guild.members
          .fetch(row.userId)
          .catch(() => null);

        if (member) {
          username = member.displayName;

          avatarUrl =
            member.displayAvatarURL({
              extension: 'png',
              size: 128
            }) || avatarUrl;
        }
      } catch {}

      return {
        rank: rows.indexOf(row) + 1,
        userId: row.userId,
        username,
        avatarUrl,
        total: row.total,
        goalMl: getGoal(row.userId) || 2000
      };
    })
  );

  try {
    const imageBuffer = await generateLeaderboardImage(
      entries,
      title,
      timeLeft
    );

    const attachment = new AttachmentBuilder(imageBuffer, {
      name: 'leaderboard.png'
    });

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`💧 ${title}`)
      .setImage('attachment://leaderboard.png')
      .setTimestamp();

    if (timeLeft) {
      embed.setFooter({
        text: `🔄 Resets in ${timeLeft}`
      });
    }

    return interaction.editReply({
      embeds: [embed],
      files: [attachment]
    });
  } catch (err) {
    console.error('Leaderboard image failed:', err);

    const medals = ['🥇', '🥈', '🥉'];

    const description = entries
      .map((entry, index) => {
        const medal =
          medals[index] ?? `**${index + 1}.**`;

        const oz = (
          entry.total / 29.5735
        ).toFixed(1);

        const percent = Math.min(
          100,
          Math.round(
            (entry.total / entry.goalMl) * 100
          )
        );

        const completed =
          entry.total >= entry.goalMl
            ? ' ✅'
            : '';

        return `${medal} <@${entry.userId}> — **${oz} oz** (${entry.total} ml)${completed} • ${percent}%`;
      })
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor(0x4fc3f7)
      .setTitle(`💧 ${title}`)
      .setDescription(description)
      .setTimestamp();

    if (timeLeft) {
      embed.setFooter({
        text: `🔄 Resets in ${timeLeft}`
      });
    }

    return interaction.editReply({
      embeds: [embed]
    });
  }
}
