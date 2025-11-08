#!/usr/bin/env node

import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE_WIDTH = 1440;
const BASE_HEIGHT = 636;

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

function normaliseRect(rect) {
  return {
    left: rect.x1 / BASE_WIDTH,
    top: rect.y1 / BASE_HEIGHT,
    width: (rect.x2 - rect.x1) / BASE_WIDTH,
    height: (rect.y2 - rect.y1) / BASE_HEIGHT,
  };
}

const NORMALISED_LAYOUT = Object.fromEntries(
  Object.entries(RAW_LAYOUT).map(([team, data]) => [
    team,
    {
      players: data.players.map(slot => ({
        ...slot,
        norm: normaliseRect(slot.rect),
      })),
      columns: data.columns.map(col => ({
        ...col,
        norm: normaliseRect(col.rect),
      })),
    },
  ]),
);

function denormalise(normRect, width, height) {
  const left = Math.max(0, Math.round(normRect.left * width));
  const top = Math.max(0, Math.round(normRect.top * height));
  const calcWidth = Math.max(1, Math.round(normRect.width * width));
  const calcHeight = Math.max(1, Math.round(normRect.height * height));
  const boundedWidth = Math.min(calcWidth, width - left);
  const boundedHeight = Math.min(calcHeight, height - top);
  return {
    left,
    top,
    width: Math.max(1, boundedWidth),
    height: Math.max(1, boundedHeight),
  };
}

async function loadImage(sourcePath) {
  const image = sharp(sourcePath);
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error('Unable to determine image dimensions.');
  }
  return { image, width: metadata.width, height: metadata.height };
}

async function preprocessRegion(buffer) {
  return sharp(buffer)
    .ensureAlpha()
    .grayscale()
    .normalize()
    .resize({ height: 80, withoutEnlargement: true })
    .sharpen()
    .threshold(135)
    .toBuffer();
}

function valueWhitelist(type) {
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

function parseValue(text, type) {
  const cleaned = text.replace(/[^0-9+\-.%]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.' || cleaned === '+') {
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

async function recogniseRegion(worker, buffer, type) {
  const whitelist = valueWhitelist(type);
  if (whitelist) {
    await worker.setParameters({ tessedit_char_whitelist: whitelist });
  }
  const {
    data: { text },
  } = await worker.recognize(buffer, undefined, {
    tessedit_pageseg_mode: 7,
  });
  if (whitelist) {
    await worker.setParameters({ tessedit_char_whitelist: '' });
  }
  return (text || '').trim();
}

async function recogniseName(worker, buffer) {
  const {
    data: { text },
  } = await worker.recognize(buffer, undefined, {
    tessedit_pageseg_mode: 7,
  });
  return (text || '').trim();
}

async function extractTeam(teamKey, image, width, height, worker) {
  const layout = NORMALISED_LAYOUT[teamKey];
  const rows = [];

  for (let idx = 0; idx < layout.players.length; idx += 1) {
    const playerSlot = layout.players[idx];
    const playerRect = denormalise(playerSlot.norm, width, height);
    const playerBuffer = await image
      .extract(playerRect)
      .resize({ height: 60, withoutEnlargement: true })
      .grayscale()
      .normalize()
      .toBuffer();
    const playerName = await recogniseName(worker, playerBuffer);

    const row = {
      team: teamKey,
      position: idx + 1,
      playerName,
    };

    for (const column of layout.columns) {
      const metricRect = denormalise(column.norm, width, height);
      const metricBuffer = await preprocessRegion(
        await image.extract(metricRect).toBuffer(),
      );
      const rawValue = await recogniseRegion(worker, metricBuffer, column.type);
      row[column.key] = parseValue(rawValue, column.type);
    }

    rows.push(row);
  }

  return rows;
}

async function extractScoreboard(imagePath) {
  const { image, width, height } = await loadImage(imagePath);
  const worker = await createWorker();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');

  try {
    const alpha = await extractTeam('alpha', image.clone(), width, height, worker);
    const bravo = await extractTeam('bravo', image.clone(), width, height, worker);
    return { alpha, bravo, width, height };
  } finally {
    await worker.terminate();
  }
}

function buildCsvRows(data) {
  const header = [
    'team',
    'position',
    'playerName',
    'acs',
    'kills',
    'deaths',
    'assists',
    'plusMinus',
    'kd',
    'damageDelta',
    'adr',
    'hsPercent',
    'kastPercent',
    'firstKills',
    'firstDeaths',
    'multiKills',
  ];

  const rows = [header];
  const appendRows = (teamKey, list) => {
    list.forEach(row => {
      rows.push([
        teamKey,
        row.position,
        row.playerName,
        row.acs ?? '',
        row.kills ?? '',
        row.deaths ?? '',
        row.assists ?? '',
        row.plusMinus ?? '',
        row.kd ?? '',
        row.damageDelta ?? '',
        row.adr ?? '',
        row.hsPercent ?? '',
        row.kastPercent ?? '',
        row.firstKills ?? '',
        row.firstDeaths ?? '',
        row.multiKills ?? '',
      ]);
    });
  };

  appendRows('alpha', data.alpha);
  appendRows('bravo', data.bravo);
  return rows;
}

async function writeCsv(outputPath, rows) {
  const csv = rows.map(row => row.join(',')).join('\n');
  await fs.writeFile(outputPath, csv, 'utf8');
}

export async function ocrImageToCsv(imagePath, options = {}) {
  const result = await extractScoreboard(imagePath);
  const rows = buildCsvRows(result);

  const parsed = path.parse(imagePath);
  const outputPath =
    options.outputPath || path.join(parsed.dir, `${parsed.name}-stats.csv`);

  await writeCsv(outputPath, rows);

  return {
    outputPath,
    alphaRows: result.alpha.length,
    bravoRows: result.bravo.length,
    imageWidth: result.width,
    imageHeight: result.height,
  };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const [, , imagePath] = process.argv;
  if (!imagePath) {
    console.error('Usage: ./ocr-to-csv.mjs <path-to-image>');
    process.exit(1);
  }

  ocrImageToCsv(imagePath)
    .then(result => {
      console.log(
        `✅ Extracted ${result.alphaRows + result.bravoRows} rows to ${result.outputPath}`,
      );
    })
    .catch(error => {
      console.error('❌ OCR failed:', error.message);
      process.exit(1);
    });
}
