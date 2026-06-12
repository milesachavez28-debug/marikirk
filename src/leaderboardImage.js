import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';

const W = 680;
const ROW_H = 80;
const PADDING = 16;
const AVATAR_SIZE = 50;
const HEADER_H = 64;

const COLORS = {
  bg:          '#1e1f26',
  rowEven:     '#25262e',
  rowOdd:      '#2a2b34',
  header:      '#5865f2',
  headerText:  '#ffffff',
  name:        '#e8e9ef',
  amount:      '#a0a7b4',
  barBg:       '#3a3b45',
  barFill:     ['#ffd700', '#5865f2', '#4fc3f7'],
  barGoal:     '#57f287',
  medal:       ['#ffd700', '#c0c0c0', '#cd7f32'],
  rankText:    '#6b7280',
  white:       '#ffffff',
};

function drawRoundedRect(ctx, x, y, w, h, r) {
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

function clipCircle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
}

async function fetchAvatar(url) {
  try {
    return await loadImage(url + '?size=64');
  } catch {
    return null;
  }
}

export async function generateLeaderboardImage(entries, title, timeLeft) {
  const count = entries.length;
  const H = HEADER_H + count * ROW_H + PADDING;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  // Header bar
  const grad = ctx.createLinearGradient(0, 0, W, HEADER_H);
  grad.addColorStop(0, '#5865f2');
  grad.addColorStop(1, '#4752c4');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, HEADER_H);

  // Header title
  ctx.fillStyle = COLORS.headerText;
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('💧 ' + title, 20, 38);

  // Time left (right-aligned in header)
  if (timeLeft) {
    ctx.font = '13px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    const tw = ctx.measureText('Resets in ' + timeLeft).width;
    ctx.fillText('Resets in ' + timeLeft, W - tw - 20, 38);
  }

  // Load all avatars in parallel
  const avatars = await Promise.all(entries.map(e => fetchAvatar(e.avatarUrl)));

  // Draw each row
  for (let i = 0; i < count; i++) {
    const entry = entries[i];
    const y = HEADER_H + i * ROW_H;

    // Row background
    ctx.fillStyle = i % 2 === 0 ? COLORS.rowEven : COLORS.rowOdd;
    ctx.fillRect(0, y, W, ROW_H);

    // Subtle left accent for top 3
    if (i < 3) {
      ctx.fillStyle = COLORS.medal[i] + '99';
      ctx.fillRect(0, y, 3, ROW_H);
    }

    // Rank number / medal
    ctx.save();
    const rankX = 28;
    const rankY = y + ROW_H / 2;
    if (i < 3) {
      ctx.font = 'bold 20px sans-serif';
      ctx.fillStyle = COLORS.medal[i];
      const medals = ['🥇', '🥈', '🥉'];
      ctx.fillText(medals[i], rankX - 12, rankY + 7);
    } else {
      ctx.font = 'bold 15px sans-serif';
      ctx.fillStyle = COLORS.rankText;
      ctx.textAlign = 'center';
      ctx.fillText(`${i + 1}`, rankX, rankY + 5);
    }
    ctx.restore();

    // Avatar circle
    const avatarX = 60;
    const avatarY = y + ROW_H / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + AVATAR_SIZE / 2, avatarY, AVATAR_SIZE / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#3a3b45';
    ctx.fill();
    if (avatars[i]) {
      ctx.beginPath();
      ctx.arc(avatarX + AVATAR_SIZE / 2, avatarY, AVATAR_SIZE / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(avatars[i], avatarX, avatarY - AVATAR_SIZE / 2, AVATAR_SIZE, AVATAR_SIZE);
    } else {
      // Fallback: initials
      ctx.fillStyle = COLORS.name;
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((entry.username[0] ?? '?').toUpperCase(), avatarX + AVATAR_SIZE / 2, avatarY);
    }
    ctx.restore();

    // Username
    const textX = avatarX + AVATAR_SIZE + 12;
    ctx.fillStyle = COLORS.name;
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(entry.username, textX, y + 26);

    // Amount
    const oz = (entry.total / 29.5735).toFixed(1);
    const goalOz = (entry.goalMl / 29.5735).toFixed(1);
    ctx.fillStyle = COLORS.amount;
    ctx.font = '12px sans-serif';
    ctx.fillText(`${oz}oz / ${goalOz}oz`, textX, y + 44);

    // Progress bar
    const barX = textX;
    const barY = y + 52;
    const barW = W - textX - PADDING - 60;
    const barH = 8;
    const percent = Math.min(1, entry.total / entry.goalMl);

    // Bar background
    drawRoundedRect(ctx, barX, barY, barW, barH, 4);
    ctx.fillStyle = COLORS.barBg;
    ctx.fill();

    // Bar fill
    if (percent > 0) {
      drawRoundedRect(ctx, barX, barY, Math.max(barH, barW * percent), barH, 4);
      const barGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      if (percent >= 1) {
        barGrad.addColorStop(0, '#43b581');
        barGrad.addColorStop(1, '#57f287');
      } else if (i === 0) {
        barGrad.addColorStop(0, '#ffd700');
        barGrad.addColorStop(1, '#ffb700');
      } else {
        barGrad.addColorStop(0, '#5865f2');
        barGrad.addColorStop(1, '#4fc3f7');
      }
      ctx.fillStyle = barGrad;
      ctx.fill();
    }

    // Percent label
    ctx.fillStyle = percent >= 1 ? '#57f287' : COLORS.amount;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(percent * 100)}%`, W - PADDING, barY + 8);
  }

  // Bottom padding stripe
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, HEADER_H + count * ROW_H, W, PADDING);

  return canvas.toBuffer('image/png');
}
