import sharp, { Sharp } from 'sharp';
import { createWorker, PSM } from 'tesseract.js';

const BASE_WIDTH = 1440;
const BASE_HEIGHT = 636;

type MetricType = 'number' | 'float' | 'percent' | 'signed';

type NormalisedRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type ColumnConfig = {
  key:
    | 'acs'
    | 'kills'
    | 'deaths'
    | 'assists'
    | 'plusMinus'
    | 'kd'
    | 'damageDelta'
    | 'adr'
    | 'hsPercent'
    | 'kastPercent'
    | 'firstKills'
    | 'firstDeaths'
    | 'multiKills';
  type: MetricType;
  norm: NormalisedRect;
};

type PlayerSlot = {
  norm: NormalisedRect;
};

type TeamLayout = {
  players: PlayerSlot[];
  columns: ColumnConfig[];
};

type Layout = Record<'alpha' | 'bravo', TeamLayout>;

type ExtractedRow = {
  team: 'alpha' | 'bravo';
  position: number;
  playerName: string;
  acs: number | null;
  kills: number | null;
  deaths: number | null;
  assists: number | null;
  plusMinus: number | null;
  kd: number | null;
  damageDelta: number | null;
  adr: number | null;
  hsPercent: number | null;
  kastPercent: number | null;
  firstKills: number | null;
  firstDeaths: number | null;
  multiKills: number | null;
};

type ExtractedResult = {
  alpha: ExtractedRow[];
  bravo: ExtractedRow[];
  width: number;
  height: number;
};

const RAW_LAYOUT = {
  alpha: {
    players: [
      { rect: { x1: 57, y1: 42, x2: 365, y2: 83 } },
      { rect: { x1: 59, y1: 95, x2: 351, y2: 139 } },
      { rect: { x1: 60, y1: 156, x2: 325, y2: 196 } },
      { rect: { x1: 61, y1: 211, x2: 332, y2: 250 } },
      { rect: { x1: 57, y1: 268, x2: 348, y2: 303 } },
    ],
    columns: [
      { key: 'acs', type: 'number', rect: { x1: 441, y1: 2, x2: 531, y2: 312 } },
      { key: 'kills', type: 'number', rect: { x1: 535, y1: 3, x2: 590, y2: 311 } },
      { key: 'deaths', type: 'number', rect: { x1: 603, y1: 2, x2: 663, y2: 307 } },
      { key: 'assists', type: 'number', rect: { x1: 663, y1: 0, x2: 724, y2: 304 } },
      { key: 'plusMinus', type: 'signed', rect: { x1: 726, y1: 4, x2: 792, y2: 310 } },
      { key: 'kd', type: 'float', rect: { x1: 791, y1: 1, x2: 855, y2: 312 } },
      { key: 'damageDelta', type: 'signed', rect: { x1: 862, y1: 1, x2: 941, y2: 309 } },
      { key: 'adr', type: 'number', rect: { x1: 945, y1: 1, x2: 1030, y2: 312 } },
      { key: 'hsPercent', type: 'percent', rect: { x1: 1035, y1: 1, x2: 1113, y2: 309 } },
      { key: 'kastPercent', type: 'percent', rect: { x1: 1113, y1: 4, x2: 1187, y2: 312 } },
      { key: 'firstKills', type: 'number', rect: { x1: 1192, y1: 2, x2: 1252, y2: 313 } },
      { key: 'firstDeaths', type: 'number', rect: { x1: 1260, y1: 4, x2: 1317, y2: 313 } },
      { key: 'multiKills', type: 'number', rect: { x1: 1326, y1: 0, x2: 1374, y2: 309 } },
    ],
  },
  bravo: {
    players: [
      { rect: { x1: 58, y1: 358, x2: 348, y2: 394 } },
      { rect: { x1: 56, y1: 418, x2: 338, y2: 460 } },
      { rect: { x1: 58, y1: 472, x2: 339, y2: 509 } },
      { rect: { x1: 59, y1: 533, x2: 342, y2: 572 } },
      { rect: { x1: 58, y1: 586, x2: 336, y2: 622 } },
    ],
    columns: [
      { key: 'acs', type: 'number', rect: { x1: 440, y1: 320, x2: 529, y2: 620 } },
      { key: 'kills', type: 'number', rect: { x1: 537, y1: 321, x2: 602, y2: 620 } },
      { key: 'deaths', type: 'number', rect: { x1: 606, y1: 319, x2: 663, y2: 610 } },
      { key: 'assists', type: 'number', rect: { x1: 665, y1: 321, x2: 727, y2: 624 } },
      { key: 'plusMinus', type: 'signed', rect: { x1: 721, y1: 319, x2: 791, y2: 619 } },
      { key: 'kd', type: 'float', rect: { x1: 790, y1: 319, x2: 861, y2: 622 } },
      { key: 'damageDelta', type: 'signed', rect: { x1: 865, y1: 320, x2: 937, y2: 624 } },
      { key: 'adr', type: 'number', rect: { x1: 941, y1: 318, x2: 1032, y2: 624 } },
      { key: 'hsPercent', type: 'percent', rect: { x1: 1033, y1: 320, x2: 1109, y2: 623 } },
      { key: 'kastPercent', type: 'percent', rect: { x1: 1115, y1: 320, x2: 1186, y2: 619 } },
      { key: 'firstKills', type: 'number', rect: { x1: 1186, y1: 317, x2: 1262, y2: 623 } },
      { key: 'firstDeaths', type: 'number', rect: { x1: 1258, y1: 318, x2: 1322, y2: 623 } },
      { key: 'multiKills', type: 'number', rect: { x1: 1319, y1: 320, x2: 1381, y2: 624 } },
    ],
  },
};

function toNormalisedRect(rect: { x1: number; y1: number; x2: number; y2: number }): NormalisedRect {
  return {
    left: rect.x1 / BASE_WIDTH,
    top: rect.y1 / BASE_HEIGHT,
    width: (rect.x2 - rect.x1) / BASE_WIDTH,
    height: (rect.y2 - rect.y1) / BASE_HEIGHT,
  };
}

const LAYOUT: Layout = Object.fromEntries(
  Object.entries(RAW_LAYOUT).map(([teamKey, value]) => [
    teamKey as 'alpha' | 'bravo',
    {
      players: value.players.map(slot => ({ norm: toNormalisedRect(slot.rect) })),
      columns: value.columns.map(col => ({
        key: col.key,
        type: col.type,
        norm: toNormalisedRect(col.rect),
      })),
    },
  ]),
) as Layout;

function denormaliseRect(norm: NormalisedRect, width: number, height: number) {
  const left = Math.max(0, Math.round(norm.left * width));
  const top = Math.max(0, Math.round(norm.top * height));
  const rawWidth = Math.max(1, Math.round(norm.width * width));
  const rawHeight = Math.max(1, Math.round(norm.height * height));
  const boundedWidth = Math.min(rawWidth, width - left);
  const boundedHeight = Math.min(rawHeight, height - top);
  return {
    left,
    top,
    width: Math.max(1, boundedWidth),
    height: Math.max(1, boundedHeight),
  };
}

async function preprocessRegion(buffer: Buffer) {
  return sharp(buffer)
    .ensureAlpha()
    .grayscale()
    .normalize()
    .resize({ height: 80, withoutEnlargement: true })
    .sharpen()
    .threshold(135)
    .toBuffer();
}

function whitelistForType(type: MetricType): string {
  switch (type) {
    case 'percent':
      return '0123456789.%';
    case 'float':
      return '0123456789.';
    case 'signed':
      return '+-0123456789';
    default:
      return '0123456789';
  }
}

function parseValue(raw: string, type: MetricType): number | null {
  const cleaned = raw.replace(/[^0-9+\-.%]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '+' || cleaned === '.') {
    return null;
  }

  if (type === 'percent') {
    const numeric = Number.parseFloat(cleaned.replace('%', ''));
    return Number.isFinite(numeric) ? numeric : null;
  }

  if (type === 'float') {
    const numeric = Number.parseFloat(cleaned);
    return Number.isFinite(numeric) ? numeric : null;
  }

  if (type === 'signed') {
    const numeric = Number.parseInt(cleaned, 10);
    return Number.isNaN(numeric) ? null : numeric;
  }

  const numeric = Number.parseInt(cleaned, 10);
  return Number.isNaN(numeric) ? null : numeric;
}

async function recogniseMetric(
  worker: Awaited<ReturnType<typeof createWorker>>,
  buffer: Buffer,
  type: MetricType,
) {
  const whitelist = whitelistForType(type);
  if (whitelist) {
    await (worker as any).setParameters({ tessedit_char_whitelist: whitelist });
  }
  const {
    data: { text },
  } = await (worker as any).recognize(buffer, undefined, { tessedit_pageseg_mode: 7 });
  if (whitelist) {
    await (worker as any).setParameters({ tessedit_char_whitelist: '' });
  }
  return parseValue((text || '').trim(), type);
}

async function recogniseName(
  worker: Awaited<ReturnType<typeof createWorker>>,
  buffer: Buffer,
) {
  const {
    data: { text },
  } = await (worker as any).recognize(buffer, undefined, { tessedit_pageseg_mode: 7 });
  return (text || '').trim();
}

async function extractTeam(
  team: 'alpha' | 'bravo',
  image: Sharp,
  width: number,
  height: number,
  worker: Awaited<ReturnType<typeof createWorker>>,
): Promise<ExtractedRow[]> {
  const layout = LAYOUT[team];
  const rows: ExtractedRow[] = [];

  for (let index = 0; index < layout.players.length; index += 1) {
    const slot = layout.players[index];
    const rect = denormaliseRect(slot.norm, width, height);
    const nameBuffer = await image
      .clone()
      .extract(rect)
      .resize({ height: 60, withoutEnlargement: true })
      .grayscale()
      .normalize()
      .toBuffer();
    const playerName = await recogniseName(worker, nameBuffer);

    const resultRow: ExtractedRow = {
      team,
      position: index + 1,
      playerName,
      acs: null,
      kills: null,
      deaths: null,
      assists: null,
      plusMinus: null,
      kd: null,
      damageDelta: null,
      adr: null,
      hsPercent: null,
      kastPercent: null,
      firstKills: null,
      firstDeaths: null,
      multiKills: null,
    };

    for (const column of layout.columns) {
      const metricRect = denormaliseRect(column.norm, width, height);
      const metricBuffer = await preprocessRegion(
        await image.clone().extract(metricRect).toBuffer(),
      );
      resultRow[column.key] = await recogniseMetric(worker, metricBuffer, column.type);
    }

    rows.push(resultRow);
  }

  return rows;
}

export async function extractScoreboard(imagePath: string): Promise<ExtractedResult> {
  const image = sharp(imagePath);
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error('Unable to determine scoreboard dimensions');
  }

  const worker = await createWorker();
  const anyWorker = worker as any;
  await anyWorker.loadLanguage('eng');
  await anyWorker.initialize('eng');

  try {
    const alpha = await extractTeam('alpha', image, metadata.width, metadata.height, worker);
    const bravo = await extractTeam('bravo', image, metadata.width, metadata.height, worker);
    return {
      alpha,
      bravo,
      width: metadata.width,
      height: metadata.height,
    };
  } finally {
    await (worker as any).terminate();
  }
}

export type { ExtractedRow, ExtractedResult };
