import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getTodayTotal, getGoal } from '../database.js';

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
  .setName('mywater')
  .setDescription('Check your water intake for today');

export async function execute(interaction) {
  const userId = interaction.user.id;
  const guildId = interaction.guildId;

  const total = getTodayTotal(userId, guildId);
  const goalMl = getGoal(userId);
  const goalOz = (goalMl / 29.5735).toFixed(1);
  const totalOz = (total / 29.5735).toFixed(1);

  const remaining = Math.max(0, goalMl - total);
  const percent = Math.min(100, Math.round((total / goalMl) * 100));
  const bars = Math.round(percent / 10);
  const progressBar = '🟦'.repeat(bars) + '⬜'.repeat(10 - bars);
  const timeLeft = getTimeUntilMidnight();

  let statusMsg;
  if (total === 0) {
    statusMsg = "You haven't logged any water today. Stay hydrated! 💧";
  } else if (total >= goalMl) {
    statusMsg = '🎉 Goal reached! Great job staying hydrated!';
  } else {
    const remainOz = (remaining / 29.5735).toFixed(1);
    statusMsg = `${remainOz}oz (${remaining}ml) to go — you can do it! 💪`;
  }

  const embed = new EmbedBuilder()
    .setColor(0x4fc3f7)
    .setTitle('💧 Your Water Today')
    .setDescription(`${progressBar}\n**${totalOz}oz** / ${goalOz}oz  ·  ${total}ml / ${goalMl}ml  (${percent}%)`)
    .addFields(
      { name: 'Status', value: statusMsg, inline: false },
      { name: 'Resets In', value: timeLeft, inline: true },
      { name: 'Your Goal', value: `${goalOz}oz / ${goalMl}ml`, inline: true }
    )
    .setFooter({ text: 'Change your goal with /goal' })
    .setTimestamp();

  return interaction.reply({ embeds: [embed], ephemeral: true });
}
