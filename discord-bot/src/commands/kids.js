import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getKids, getKidsTogether } from '../database.js';

export const data = new SlashCommandBuilder()
  .setName('kids')
  .setDescription('View your children or children with a specific partner')
  .addUserOption(opt =>
    opt.setName('partner').setDescription('Filter by a specific partner (optional)').setRequired(false)
  );

export async function execute(interaction) {
  const userId = interaction.user.id;
  const guildId = interaction.guildId;
  const partner = interaction.options.getUser('partner');

  const kids = partner
    ? getKidsTogether(userId, partner.id, guildId)
    : getKids(userId, guildId);

  const title = partner
    ? `👶 Children with ${partner.username}`
    : `👶 ${interaction.user.username}'s Children`;

  if (kids.length === 0) {
    const embed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle(title)
      .setDescription(
        partner
          ? `You have no children with **${partner.username}** yet. Use \`/havekid\` to change that!`
          : "You don't have any children yet. Use `/havekid` with one of your spouses!"
      );
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  const kidLines = kids.map((k, i) => {
    const otherId = k.parent1Id === userId ? k.parent2Id : k.parent1Id;
    const born = new Date(k.bornAt);
    const age = Math.floor((Date.now() - born) / (1000 * 60 * 60 * 24));
    const parentTag = partner ? '' : ` (with <@${otherId}>)`;
    return `**${i + 1}.** 👶 **${k.name}**${parentTag} — ${age}d old`;
  });

  const embed = new EmbedBuilder()
    .setColor(0xffd700)
    .setTitle(title)
    .setDescription(kidLines.join('\n'))
    .setFooter({ text: `${kids.length} child${kids.length !== 1 ? 'ren' : ''} total` })
    .setTimestamp();

  return interaction.reply({ embeds: [embed] });
}
