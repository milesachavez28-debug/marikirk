import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { resetUserWater, resetAllWater } from '../database.js';

const ALLOWED_USER_ID = '1421343824218689558';

function isAuthorized(interaction) {
  return (
    interaction.user.id === ALLOWED_USER_ID ||
    interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)
  );
}

export const data = new SlashCommandBuilder()
  .setName('resetwater')
  .setDescription('Reset water logs for today (admin only)')
  .addSubcommand(sub =>
    sub.setName('user')
      .setDescription("Reset a specific user's water for today")
      .addUserOption(opt =>
        opt.setName('target').setDescription('User to reset').setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub.setName('everyone')
      .setDescription("Reset ALL users' water for today in this server")
  );

export async function execute(interaction) {
  if (!isAuthorized(interaction)) {
    return interaction.reply({ content: '🚫 You do not have permission to use this command.', ephemeral: true });
  }

  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guildId;

  if (sub === 'user') {
    const target = interaction.options.getUser('target');
    const removed = resetUserWater(target.id, guildId);

    const embed = new EmbedBuilder()
      .setColor(0xff4444)
      .setTitle('🔄 Water Reset')
      .setDescription(`Cleared today's water logs for **${target.username}** (${removed} entr${removed !== 1 ? 'ies' : 'y'} removed).`)
      .setFooter({ text: `Reset by ${interaction.user.username}` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  if (sub === 'everyone') {
    const removed = resetAllWater(guildId);

    const embed = new EmbedBuilder()
      .setColor(0xff4444)
      .setTitle('🔄 Water Reset — Everyone')
      .setDescription(`Cleared today's water logs for **all users** in this server (${removed} entr${removed !== 1 ? 'ies' : 'y'} removed).`)
      .setFooter({ text: `Reset by ${interaction.user.username}` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
}
