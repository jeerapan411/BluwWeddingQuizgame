// ============================================================================
// HIGH-RES WEDDING & EVENT SOUVENIR WINNER CARD GENERATOR (HTML5 CANVAS)
// Generates a 1080x1350 portrait PNG keepsake card for guests & winners
// ============================================================================

const THEME_PALETTES = {
  rose_gold: {
    bgTop: '#24161a',
    bgBottom: '#3c2128',
    cardBg: '#fffcf9',
    accent: '#b85d6f',
    gold: '#c89b57',
    textDark: '#23191d',
    textMuted: '#6e5a61',
    badgeBg: '#fce8ec'
  },
  champagne_ivory: {
    bgTop: '#1d261e',
    bgBottom: '#2d3b2f',
    cardBg: '#fbf9f4',
    accent: '#566b58',
    gold: '#b99352',
    textDark: '#1e261f',
    textMuted: '#5c6b5e',
    badgeBg: '#e6ede6'
  },
  royal_navy: {
    bgTop: '#0f1c36',
    bgBottom: '#1c325e',
    cardBg: '#f8f9fc',
    accent: '#1e3a6e',
    gold: '#c59b38',
    textDark: '#132242',
    textMuted: '#536280',
    badgeBg: '#e2e8f5'
  },
  seminar_slate: {
    bgTop: '#101f2b',
    bgBottom: '#1b3548',
    cardBg: '#f7fafc',
    accent: '#175c7d',
    gold: '#d97724',
    textDark: '#122636',
    textMuted: '#546a7b',
    badgeBg: '#e1eff6'
  }
};

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export async function generateSouvenirCardDataUrl({
  session,
  player,
  rank = 1,
  totalPlayers = 1
}) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d');

  const themeKey = session?.theme || 'rose_gold';
  const palette = THEME_PALETTES[themeKey] || THEME_PALETTES.rose_gold;
  const isBingo = session?.game_mode === 'bingo';

  // 1. Rich Gradient Outer Background
  const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1350);
  bgGrad.addColorStop(0, palette.bgTop);
  bgGrad.addColorStop(1, palette.bgBottom);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1080, 1350);

  // Decorative Soft Glow Circles
  ctx.save();
  ctx.fillStyle = 'rgba(200, 155, 87, 0.12)';
  ctx.beginPath();
  ctx.arc(160, 180, 260, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(920, 1180, 300, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 2. Main Inner Luxury Certificate Card
  drawRoundedRect(ctx, 64, 64, 952, 1222, 42);
  ctx.fillStyle = palette.cardBg;
  ctx.fill();

  // Double Gold Frame Border
  drawRoundedRect(ctx, 88, 88, 904, 1174, 30);
  ctx.lineWidth = 3;
  ctx.strokeStyle = palette.gold;
  ctx.stroke();

  drawRoundedRect(ctx, 100, 100, 880, 1150, 24);
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(200, 155, 87, 0.45)';
  ctx.stroke();

  // 3. Top Header Badge (Event Type)
  ctx.textAlign = 'center';
  ctx.fillStyle = palette.gold;
  ctx.font = '600 26px "Prompt", "Kanit", sans-serif';
  const headerLabel =
    session?.event_type === 'seminar'
      ? '✨ SPECIAL EVENT & SEMINAR MEMORY ✨'
      : '💍 WEDDING CELEBRATION SOUVENIR 💍';
  ctx.fillText(headerLabel, 540, 170);

  // 4. Couple / Organization Names
  ctx.fillStyle = palette.accent;
  ctx.font = '700 54px "Kanit", "Prompt", sans-serif';
  const coupleText = session?.couple_names || 'BLUW Wedding & Event';
  ctx.fillText(coupleText, 540, 245);

  // Game Title & Date
  ctx.fillStyle = palette.textMuted;
  ctx.font = '500 26px "Prompt", sans-serif';
  const gameTitle = (session?.game_title || 'Wedding Quiz & Bingo').slice(0, 48);
  ctx.fillText(gameTitle, 540, 298);

  // Divider Line
  ctx.beginPath();
  ctx.moveTo(260, 335);
  ctx.lineTo(820, 335);
  ctx.strokeStyle = 'rgba(200, 155, 87, 0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 5. Center Avatar Medallion
  ctx.beginPath();
  ctx.arc(540, 470, 96, 0, Math.PI * 2);
  ctx.fillStyle = palette.badgeBg;
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = palette.gold;
  ctx.stroke();

  ctx.font = '96px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(player?.avatar || '🥂', 540, 476);
  ctx.textBaseline = 'alphabetic';

  // 6. Rank / Winner Ribbon Pill
  let rankTitle = `ผู้ร่วมสนุกอันดับที่ #${rank}`;
  if (isBingo && player?.is_bingo_winner) {
    rankTitle = rank === 1 ? '👑 แชมป์ BINGO อันดับ 1' : `🏆 ผู้พิชิต BINGO! (อันดับ #${rank})`;
  } else if (rank === 1) {
    rankTitle = '👑 ชนะเลิศอันดับที่ 1 (CHAMPION)';
  } else if (rank === 2) {
    rankTitle = '🥈 รองชนะเลิศอันดับที่ 2';
  } else if (rank === 3) {
    rankTitle = '🥉 รองชนะเลิศอันดับที่ 3';
  }

  drawRoundedRect(ctx, 230, 600, 620, 74, 37);
  ctx.fillStyle = rank <= 3 || player?.is_bingo_winner ? palette.gold : palette.accent;
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 32px "Kanit", "Prompt", sans-serif';
  ctx.fillText(rankTitle, 540, 648);

  // 7. Player Nickname & Table
  ctx.fillStyle = palette.textDark;
  ctx.font = '700 56px "Kanit", "Prompt", sans-serif';
  ctx.fillText((player?.nickname || 'แขกผู้มีเกียรติ').slice(0, 24), 540, 755);

  if (player?.table_name) {
    ctx.fillStyle = palette.textMuted;
    ctx.font = '500 28px "Prompt", sans-serif';
    ctx.fillText(`โต๊ะ / ทีม: ${player.table_name}`, 540, 802);
  }

  // 8. Stats Box (Score + Correct / Bingo Lines + Total Guests)
  drawRoundedRect(ctx, 140, 845, 800, 170, 26);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(200, 155, 87, 0.35)';
  ctx.stroke();

  // Column 1: Score
  ctx.fillStyle = palette.textMuted;
  ctx.font = '500 23px "Prompt", sans-serif';
  ctx.fillText('คะแนนสะสม', 285, 905);
  ctx.fillStyle = palette.accent;
  ctx.font = '700 46px "Kanit", sans-serif';
  ctx.fillText(`${(player?.score || 0).toLocaleString()}`, 285, 968);

  // Column 2: Correct / Bingo
  ctx.fillStyle = palette.textMuted;
  ctx.font = '500 23px "Prompt", sans-serif';
  ctx.fillText(isBingo ? 'แถวบิงโก / ช่องที่เปิด' : 'ตอบถูกทั้งหมด', 540, 905);
  ctx.fillStyle = palette.textDark;
  ctx.font = '700 44px "Kanit", sans-serif';
  const statMid = isBingo
    ? `${player?.bingo_lines || 0} แถว (${player?.correct_count || 0} ช่อง)`
    : `${player?.correct_count || 0} ข้อ`;
  ctx.fillText(statMid, 540, 968);

  // Column 3: Standing
  ctx.fillStyle = palette.textMuted;
  ctx.font = '500 23px "Prompt", sans-serif';
  ctx.fillText('ลำดับในงาน', 795, 905);
  ctx.fillStyle = palette.gold;
  ctx.font = '700 46px "Kanit", sans-serif';
  ctx.fillText(`#${rank} / ${Math.max(rank, totalPlayers)}`, 795, 968);

  // 9. Personal Wish Message Quote
  if (player?.wish_message) {
    drawRoundedRect(ctx, 140, 1045, 800, 105, 20);
    ctx.fillStyle = palette.badgeBg;
    ctx.fill();

    ctx.fillStyle = palette.textDark;
    ctx.font = 'italic 500 25px "Prompt", sans-serif';
    const cleanWish = `"${player.wish_message.slice(0, 58)}"`;
    ctx.fillText(`💌 ${cleanWish}`, 540, 1107);
  }

  // 10. Footer Date & Brand
  const dateStr = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  ctx.fillStyle = palette.textMuted;
  ctx.font = '400 22px "Prompt", sans-serif';
  ctx.fillText(
    `บันทึกความทรงจำเมื่อ ${dateStr} • ห้อง PIN ${session?.pin || ''} • BLUW Wedding Quiz & Bingo`,
    540,
    1210
  );

  return canvas.toDataURL('image/png');
}

export async function downloadOrShareSouvenirCard(dataUrl, filename = 'wedding-winner-card.png') {
  if (!dataUrl) return;

  // Convert dataURL to Blob/File so mobile users can use native Share / Save Image sheet if supported
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], filename, { type: 'image/png' });

    if (
      typeof navigator !== 'undefined' &&
      navigator.canShare &&
      navigator.canShare({ files: [file] }) &&
      /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
    ) {
      await navigator.share({
        files: [file],
        title: 'การ์ดที่ระลึกผู้ชนะเกมงานแต่ง',
        text: 'บันทึกภาพการ์ดที่ระลึกจากงานแต่งงาน'
      });
      return;
    }
  } catch {
    // Fallback to direct anchor download below
  }

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
