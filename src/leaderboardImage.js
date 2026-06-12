import { createCanvas, loadImage } from '@napi-rs/canvas';

const W = 720;
const HEADER_H = 90;
const ROW_H = 100;
const PADDING = 20;
const AVATAR = 52;

const COLORS = {
  bg: '#1e1f26',
  rowA: '#23242c',
  rowB: '#2a2b34',
  text: '#ffffff',
  subtext: '#a9b1bd',
  barBg: '#3a3b45',
  barFill: '#5865f2',
  gold: '#ffd700',
  silver: '#c0c0c0',
  bronze: '#cd7f32',
  green: '#57f287'
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function safeAvatar(url) {
  try {
    return await loadImage(url);
  } catch {
    return null;
  }
}

export async function generateLeaderboardImage(entries, title, timeLeft) {
  const height = HEADER_H + entries.length * ROW_H + PADDING;

  const canvas = createCanvas(W, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, height);

  // Header
  const grad = ctx.createLinearGradient(0, 0, W, HEADER_H);
  grad.addColorStop(0, '#5865f2');
  grad.addColorStop(1, '#4752c4');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, HEADER_H);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`💧 ${title}`, 20, 55);

  if (timeLeft) {
    ctx.font = '14px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.textAlign = 'right';
    ctx.fillText(`Resets in ${timeLeft}`, W - 20, 55);
  }

  // Load avatars
  const avatars = await Promise.all(
    entries.map(e => safeAvatar(e.avatarUrl))
  );

  // Rows
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const y = HEADER_H + i * ROW_H;

    // row bg
    ctx.fillStyle = i % 2 ? COLORS.rowA : COLORS.rowB;
    ctx.fillRect(0, y, W, ROW_H);

    // rank
    const medals = ['🥇', '🥈', '🥉'];
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = i < 3 ? COLORS.gold : COLORS.subtext;

    ctx.fillText(
      i < 3 ? medals[i] : `${i + 1}`,
      30,
      y + 55
    );

    // avatar
    const ax = 60;
    const ay = y + 25;

    ctx.save();
    ctx.beginPath();
    ctx.arc(ax + 26, ay + 26, 26, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    if (avatars[i]) {
      ctx.drawImage(avatars[i], ax, ay, AVATAR, AVATAR);
    }

    ctx.restore();

    // username
    const tx = 130;

    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(e.username, tx, y + 40);

    // stats
    const oz = (e.total / 29.5735).toFixed(1);
    const percent = Math.min(
      100,
      Math.round((e.total / e.goalMl) * 100)
    );

    ctx.fillStyle = COLORS.subtext;
    ctx.font = '14px sans-serif';
    ctx.fillText(`${oz} oz • ${e.total} ml`, tx, y + 65);

    // percent right side
    ctx.fillStyle =
      percent >= 100 ? COLORS.green : COLORS.subtext;

    ctx.textAlign = 'right';
    ctx.fillText(`${percent}%`, W - 20, y + 45);

    // progress bar
    const barX = tx;
    const barY = y + 75;
    const barW = W - tx - 60;
    const barH = 10;

    // background
    roundRect(ctx, barX, barY, barW, barH, 6);
    ctx.fillStyle = COLORS.barBg;
    ctx.fill();

    // fill
    const fillW = Math.max(0, Math.min(1, e.total / e.goalMl)) * barW;

    roundRect(ctx, barX, barY, fillW, barH, 6);
    ctx.fillStyle =
      percent >= 100 ? COLORS.green : COLORS.barFill;
    ctx.fill();
  }

  return canvas.toBuffer('image/png');
}
