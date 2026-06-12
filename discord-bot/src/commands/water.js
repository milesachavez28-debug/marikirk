import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { logWater, getTodayTotal, getGoal } from '../database.js';

const UNITS = {
  ml:      { label: 'ml',      toMl: v => v,           format: v => `${v}ml` },
  oz:      { label: 'oz',      toMl: v => v * 29.5735,  format: v => `${v}oz` },
  gallons: { label: 'gallons', toMl: v => v * 3785.41,  format: v => `${v} gal` },
};

export const data = new SlashCommandBuilder()
  .setName('water')
  .setDescription('Log water intake')
  .addNumberOption(opt =>
    opt.setName('amount')
      .setDescription('Amount to log')
      .setRequired(true)
      .setMinValue(0.01)
  )
  .addStringOption(opt =>
    opt.setName('unit')
      .setDescription('Unit of measurement (default: oz)')
      .setRequired(false)
      .addChoices(
        { name: 'ml (milliliters)', value: 'ml' },
        { name: 'oz (fluid ounces)', value: 'oz' },
        { name: 'gallons', value: 'gallons' }
      )
  );

export async function execute(interaction) {
  const userId = interaction.user.id;
  const guildId = interaction.guildId;
  const amount = interaction.options.getNumber('amount');
  const unitKey = interaction.options.getString('unit') ?? 'oz';
  const unit = UNITS[unitKey];

  const amountMl = Math.round(unit.toMl(amount));
  const goalMl = getGoal(userId);

  logWater(userId, guildId, amountMl);
  const total = getTodayTotal(userId, guildId);

  const percent = Math.min(100, Math.round((total / goalMl) * 100));
  const bars = Math.round(percent / 10);
  const progressBar = '🟦'.repeat(bars) + '⬜'.repeat(10 - bars);

  const totalOz = (total / 29.5735).toFixed(1);
  const goalOz = (goalMl / 29.5735).toFixed(1);
  const totalDisplay = unitKey === 'ml'
    ? `${total}ml / ${goalMl}ml`
    : unitKey === 'oz'
      ? `${totalOz}oz / ${goalOz}oz`
      : `${(total / 3785.41).toFixed(2)} gal / ${(goalMl / 3785.41).toFixed(2)} gal`;

  let statusMsg;
  if (total >= goalMl) {
    statusMsg = '🎉 Daily goal reached! Amazing work staying hydrated!';
  } else {
    const remaining = goalMl - total;
    const remainingDisplay = unitKey === 'ml'
      ? `${remaining}ml`
      : unitKey === 'oz'
        ? `${(remaining / 29.5735).toFixed(1)}oz`
        : `${(remaining / 3785.41).toFixed(2)} gal`;
    statusMsg = `${remainingDisplay} left to reach your goal.`;
  }

  const embed = new EmbedBuilder()
    .setColor(0x4fc3f7)
    .setTitle('💧 Water Logged!')
    .setDescription(`+**${unit.format(amount)}** logged for ${interaction.user}`)
    .addFields(
      { name: "Today's Total", value: totalDisplay, inline: true },
      { name: 'Progress', value: `${progressBar} ${percent}%`, inline: false },
      { name: 'Status', value: statusMsg, inline: false }
    )
    .setFooter({ text: 'Change your goal with /goal' })
    .setTimestamp();

  return interaction.reply({ embeds: [embed] });
}
