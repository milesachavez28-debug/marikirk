import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { isMarriedTo, deleteMarriage, getPartners } from '../database.js';

export const data = new SlashCommandBuilder()
  .setName('divorce')
  .setDescription('Divorce one of your partners')
  .addUserOption(opt =>
    opt.setName('partner').setDescription('The partner you want to divorce').setRequired(true)
  );

export async function execute(interaction) {
  const userId = interaction.user.id;
  const guildId = interaction.guildId;
  const partner = interaction.options.getUser('partner');

  if (!isMarriedTo(userId, partner.id, guildId)) {
    return interaction.reply({ content: `💔 You are not married to ${partner.username}.`, ephemeral: true });
  }

  const remaining = getPartners(userId, guildId).length - 1;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('confirm_divorce').setLabel('Yes, divorce').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('cancel_divorce').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
  );

  const embed = new EmbedBuilder()
    .setColor(0xff4444)
    .setTitle('💔 Are you sure?')
    .setDescription(`Are you sure you want to divorce **${partner.username}**? This cannot be undone.`)
    .setFooter({ text: `You will have ${remaining} spouse${remaining !== 1 ? 's' : ''} remaining.` });

  const reply = await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

  try {
    const confirmation = await reply.awaitMessageComponent({
      filter: i => i.user.id === userId,
      componentType: ComponentType.Button,
      time: 15000
    });

    if (confirmation.customId === 'confirm_divorce') {
      deleteMarriage(userId, partner.id, guildId);

      const resultEmbed = new EmbedBuilder()
        .setColor(0xff4444)
        .setTitle('💔 Divorced')
        .setDescription(`<@${userId}> and **${partner.username}** are no longer married.`);

      await confirmation.update({ embeds: [resultEmbed], components: [] });
    } else {
      await confirmation.update({ content: 'Divorce cancelled.', embeds: [], components: [] });
    }
  } catch {
    await reply.edit({ content: 'Confirmation timed out.', embeds: [], components: [] });
  }
}
