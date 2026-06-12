import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getPartners, getKids, MAX_SPOUSES } from '../database.js';

export const data = new SlashCommandBuilder()
  .setName('status')
  .setDescription('Check marriage status and family info')
  .addUserOption(opt =>
    opt.setName('user').setDescription('User to check (defaults to yourself)').setRequired(false)
  );

export async function execute(interaction) {
  const target = interaction.options.getUser('user') ?? interaction.user;
  const guildId = interaction.guildId;

  const partners = getPartners(target.id, guildId);
  const kids = getKids(target.id, guildId);

  if (partners.length === 0 && kids.length === 0) {
    const embed = new EmbedBuilder()
      .setColor(0x888888)
      .setTitle('👨‍👩‍👧‍👦 Family Status')
      .setDescription(`**${target.username}** is currently **single** with no children.`);
    return interaction.reply({ embeds: [embed] });
  }

  const embed = new EmbedBuilder()
    .setColor(0xff69b4)
    .setTitle(`👨‍👩‍👧‍👦 ${target.username}'s Family`);

  if (partners.length === 0) {
    embed.setDescription('💔 Single');
  } else {
    const partnerLines = partners.map(({ partnerId, marriedAt }) => {
      const since = new Date(marriedAt);
      const days = Math.floor((Date.now() - since) / (1000 * 60 * 60 * 24));
      return `💍 <@${partnerId}> — married ${days}d ago`;
    });
    embed.addFields({
      name: `Spouses (${partners.length}/${MAX_SPOUSES})`,
      value: partnerLines.join('\n'),
      inline: false
    });
  }

  if (kids.length > 0) {
    const kidLines = kids.map(k => {
      const otherId = k.parent1Id === target.id ? k.parent2Id : k.parent1Id;
      const age = Math.floor((Date.now() - new Date(k.bornAt)) / (1000 * 60 * 60 * 24));
      return `👶 **${k.name}** (with <@${otherId}>, ${age}d old)`;
    });
    embed.addFields({
      name: `Children (${kids.length})`,
      value: kidLines.join('\n'),
      inline: false
    });
  } else {
    embed.addFields({ name: 'Children', value: 'None yet', inline: false });
  }

  embed.setTimestamp();
  return interaction.reply({ embeds: [embed] });
}
