import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getGoal, setGoal, DEFAULT_GOAL_ML } from '../database.js';

export const data = new SlashCommandBuilder()
  .setName('goal')
  .setDescription('View or set your daily water goal')
  .addNumberOption(opt =>
    opt.setName('amount')
      .setDescription('Your new goal amount')
      .setRequired(false)
      .setMinValue(0.01)
  )
  .addStringOption(opt =>
    opt.setName('unit')
      .setDescription('Unit for your goal (default: oz)')
      .setRequired(false)
      .addChoices(
        { name: 'ml (milliliters)', value: 'ml' },
        { name: 'oz (fluid ounces)', value: 'oz' },
        { name: 'gallons', value: 'gallons' }
      )
  );

const TO_ML = { ml: 1, oz: 29.5735, gallons: 3785.41 };

export async function execute(interaction) {
  const userId = interaction.user.id;
  const amount = interaction.options.getNumber('amount');
  const unitKey = interaction.options.getString('unit') ?? 'oz';

  if (amount == null) {
    const currentMl = getGoal(userId);
    const currentOz = (currentMl / 29.5735).toFixed(1);
    const defaultTag = currentMl === DEFAULT_GOAL_ML ? ' (default)' : '';

    const embed = new EmbedBuilder()
      .setColor(0x4fc3f7)
      .setTitle('🎯 Your Daily Water Goal')
      .setDescription(`**${currentOz}oz** / ${currentMl}ml per day${defaultTag}\n\nUse \`/goal amount:64 unit:oz\` to change it.`)
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  const goalMl = Math.round(amount * TO_ML[unitKey]);
  setGoal(userId, goalMl);

  const goalOz = (goalMl / 29.5735).toFixed(1);
  const displayInput = unitKey === 'ml' ? `${amount}ml` : unitKey === 'oz' ? `${amount}oz` : `${amount} gal`;

  const embed = new EmbedBuilder()
    .setColor(0x4fc3f7)
    .setTitle('🎯 Goal Updated!')
    .setDescription(`Your daily water goal is now **${displayInput}** (${goalOz}oz / ${goalMl}ml).`)
    .setTimestamp();

  return interaction.reply({ embeds: [embed], ephemeral: true });
}
