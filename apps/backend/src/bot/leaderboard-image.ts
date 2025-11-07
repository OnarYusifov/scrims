import { createCanvas, CanvasRenderingContext2D } from 'canvas';
import { MatchResultPayload, MatchResultPlayer } from './types';

const WIDTH = 980;
const HEADER_HEIGHT = 80;
const ROW_HEIGHT = 52;
const FOOTER_HEIGHT = 40;
const SIDE_PADDING = 36;
const COLUMN_CONFIG = [
  { label: '#', width: 60, align: 'center' as const },
  { label: 'Player', width: 320, align: 'left' as const },
  { label: 'K', width: 80, align: 'center' as const },
  { label: 'D', width: 80, align: 'center' as const },
  { label: 'A', width: 80, align: 'center' as const },
  { label: 'ACS', width: 120, align: 'center' as const },
  { label: '+/-', width: 90, align: 'center' as const },
  { label: 'ΔELO', width: 90, align: 'center' as const },
];

function setFont(ctx: CanvasRenderingContext2D, style: 'header' | 'column' | 'row' | 'footer') {
  switch (style) {
    case 'header':
      ctx.font = 'bold 32px "Arial"';
      break;
    case 'column':
      ctx.font = 'bold 20px "Arial"';
      break;
    case 'row':
      ctx.font = '600 20px "Arial"';
      break;
    case 'footer':
      ctx.font = '16px "Arial"';
      break;
  }
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  align: 'left' | 'center' | 'right',
) {
  ctx.textAlign = align;
  ctx.fillText(text, align === 'left' ? x : align === 'center' ? x + width / 2 : x + width, y);
}

function formatDelta(delta?: number): string {
  if (delta === undefined || Number.isNaN(delta)) {
    return '-';
  }
  if (delta === 0) {
    return '0';
  }
  const prefix = delta > 0 ? '+' : '';
  return `${prefix}${delta}`;
}

export function generateLeaderboardImage(payload: MatchResultPayload): Buffer {
  const players: MatchResultPlayer[] = [
    ...payload.teamAlpha.players,
    ...payload.teamBravo.players,
  ];

  // Sort players by ACS desc, break ties with kills
  const sortedPlayers = players
    .slice()
    .sort((a, b) => {
      if (b.acs === a.acs) {
        if (b.kills === a.kills) {
          return (b.elo?.change ?? 0) - (a.elo?.change ?? 0);
        }
        return b.kills - a.kills;
      }
      return b.acs - a.acs;
    });

  const height = HEADER_HEIGHT + FOOTER_HEIGHT + ROW_HEIGHT * sortedPlayers.length;
  const canvas = createCanvas(WIDTH, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, WIDTH, height);

  // Header background
  ctx.fillStyle = '#1d4ed8';
  ctx.fillRect(0, 0, WIDTH, HEADER_HEIGHT);

  setFont(ctx, 'header');
  ctx.fillStyle = '#f8fafc';
  const title = `Match ${payload.teamAlpha.score} - ${payload.teamBravo.score}`;
  drawText(ctx, title, SIDE_PADDING, HEADER_HEIGHT / 2 + 12, WIDTH - SIDE_PADDING * 2, 'center');

  setFont(ctx, 'column');
  ctx.fillStyle = '#93c5fd';
  let columnX = SIDE_PADDING;
  COLUMN_CONFIG.forEach((column) => {
    drawText(ctx, column.label, columnX, HEADER_HEIGHT + 36, column.width, column.align);
    columnX += column.width;
  });

  // Rows
  sortedPlayers.forEach((player, index) => {
    const y = HEADER_HEIGHT + 48 + index * ROW_HEIGHT;
    const rowColor = index % 2 === 0 ? '#1e293b' : '#111827';
    ctx.fillStyle = rowColor;
    ctx.fillRect(SIDE_PADDING - 12, y - 32, WIDTH - (SIDE_PADDING - 12) * 2, ROW_HEIGHT - 4);

    setFont(ctx, 'row');
    ctx.fillStyle = '#f1f5f9';

    let x = SIDE_PADDING;
    const values = [
      String(index + 1),
      `${player.username ?? 'Unknown'} ${player.team === 'ALPHA' ? '(A)' : '(B)'}`,
      String(player.kills),
      String(player.deaths),
      String(player.assists),
      Math.round(player.acs).toString(),
      formatDelta(player.plusMinus),
      formatDelta(player.elo?.change),
    ];

    COLUMN_CONFIG.forEach((column, i) => {
      drawText(ctx, values[i], x, y, column.width, column.align);
      x += column.width;
    });
  });

  // Footer
  setFont(ctx, 'footer');
  ctx.fillStyle = '#94a3b8';
  const footerY = height - FOOTER_HEIGHT / 2 + 6;
  const footerText = payload.completedAt
    ? `Completed: ${payload.completedAt.toISOString()}`
    : 'Match completed';
  drawText(ctx, footerText, SIDE_PADDING, footerY, WIDTH - SIDE_PADDING * 2, 'left');
  drawText(
    ctx,
    'Powered by TrayB Customs',
    SIDE_PADDING,
    footerY,
    WIDTH - SIDE_PADDING * 2,
    'right',
  );

  return canvas.toBuffer('image/png');
}

