import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { isMarriedTo, createMarriage, getPartnerCount, MAX_SPOUSES } from '../database.js';

const pendingProposals = new Map();

export const data = new SlashCommandBuilder()
  .setName('marry')
  .setDescription('Propose marriage to another user')
  .addUserOption(opt =>
    opt.setName('user').setDescription('The user you want to marry').setRequired(true)
  );

export async function execute(interaction) {
  const proposer = interaction.user;
  const target = interaction.options.getUser('user');
  const guildId = interaction.guildId;

  if (target.id === proposer.id) {
    return interaction.reply({ content: '💔 You cannot marry yourself!', ephemeral: true });
  }
  if (target.bot) {
    return interaction.reply({ content: '💔 You cannot marry a bot!', ephemeral: true });
  }
  if (isMarriedTo(proposer.id, target.id, guildId)) {
    return interaction.reply({ content: `💔 You are already married to ${target.username}!`, ephemeral: true });
  }

  const proposerCount = getPartnerCount(proposer.id, guildId);
  if (proposerCount >= MAX_SPOUSES) {
    return interaction.reply({ content: `💔 You already have ${MAX_SPOUSES} spouses — that's the maximum!`, ephemeral: true });
  }
  const targetCount = getPartnerCount(target.id, guildId);
  if (targetCount >= MAX_SPOUSES) {
    return interaction.reply({ content: `💔 ${target.username} already has ${MAX_SPOUSES} spouses — the maximum!`, ephemeral: true });
  }

  const key = `${guildId}:${[proposer.id, target.id].sort().join(':')}`;

  if (pendingProposals.has(key)) {
    const existing = pendingProposals.get(key);
    if (existing.proposerId === target.id) {
      pendingProposals.delete(key);
      createMarriage(proposer.id, target.id, guildId);

      const newProposerCount = proposerCount + 1;
      const newTargetCount = targetCount + 1;

      const embed = new EmbedBuilder()
        .setColor(0xff69b4)
        .setTitle('💍 A Wedding!')
        .setDescription(
          `**${target.username}** and **${proposer.username}** are now married! 🎊\n\n` +
          `💕 ${proposer.username} now has **${newProposerCount}** spouse${newProposerCount !== 1 ? 's' : ''}\n` +
          `💕 ${target.username} now has **${newTargetCount}** spouse${newTargetCount !== 1 ? 's' : ''}`
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }
  }

  pendingProposals.set(key, { proposerId: proposer.id, targetId: target.id });
  setTimeout(() => {
    if (pendingProposals.has(key) && pendingProposals.get(key).proposerId === proposer.id) {
      pendingProposals.delete(key);
    }
  }, 60000);

  const spotsLeft = MAX_SPOUSES - targetCount;
  const embed = new EmbedBuilder()
    .setColor(0xff69b4)
    .setTitle('💍 Marriage Proposal!')
    .setDescription(
      `${proposer} has proposed to ${target}!\n\n` +
      `${target}, use \`/marry @${proposer.username}\` within **60 seconds** to accept! 💕`
    )
    .setFooter({ text: `${target.username} has ${spotsLeft} spouse slot${spotsLeft !== 1 ? 's' : ''} remaining (max ${MAX_SPOUSES})` })
    .setTimestamp();

  return interaction.reply({ embeds: [embed] });
}
