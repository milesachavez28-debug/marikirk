import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { isMarriedTo, addKid, getKidsTogether } from '../database.js';

const RANDOM_NAMES = [
  'Aiden','Aria','Blake','Chloe','Dante','Elena','Finn','Grace','Halo','Iris',
  'Jace','Kira','Leo','Maya','Noel','Olive','Pax','Quinn','Remy','Sage',
  'Theo','Uma','Vale','Wren','Xen','Yara','Zane','Aurora','Beau','Cedar',
  'Demi','Ember','Fox','Gem','Haven','Ivy','Jade','Knox','Luna','Milo',
  'Nova','Onyx','Pearl','Reed','Sky','Teal','Vex','Wilder','Zephyr','River',
];

function randomName() {
  return RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
}

export const data = new SlashCommandBuilder()
  .setName('havekid')
  .setDescription('Have a child with one of your spouses')
  .addUserOption(opt =>
    opt.setName('partner').setDescription('Your spouse to have a child with').setRequired(true)
  )
  .addStringOption(opt =>
    opt.setName('name').setDescription('Name for your child (leave blank for a random name)').setRequired(false)
  );

export async function execute(interaction) {
  const userId = interaction.user.id;
  const guildId = interaction.guildId;
  const partner = interaction.options.getUser('partner');
  const chosenName = interaction.options.getString('name')?.trim();

  if (partner.id === userId) {
    return interaction.reply({ content: '💔 You cannot have a child with yourself!', ephemeral: true });
  }
  if (!isMarriedTo(userId, partner.id, guildId)) {
    return interaction.reply({ content: `💔 You are not married to **${partner.username}**. You can only have children with your spouses.`, ephemeral: true });
  }

  const name = chosenName || randomName();
  addKid(userId, partner.id, guildId, name);

  const existingKids = getKidsTogether(userId, partner.id, guildId);

  const embed = new EmbedBuilder()
    .setColor(0xffd700)
    .setTitle('👶 A Baby is Born!')
    .setDescription(
      `${interaction.user} and ${partner} welcome **${name}** into the world! 🎉\n\n` +
      `They now have **${existingKids.length}** child${existingKids.length !== 1 ? 'ren' : ''} together.`
    )
    .setFooter({ text: 'Use /status to see your full family tree' })
    .setTimestamp();

  return interaction.reply({ embeds: [embed] });
}
