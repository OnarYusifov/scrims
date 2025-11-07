#!/usr/bin/env node

import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import { createObjectCsvWriter } from 'csv-writer';
import path from 'node:path';

async function preprocessImage(sourcePath) {
  return sharp(sourcePath)
    .ensureAlpha() // helps threshold behave predictably
    .resize({ width: 2000, withoutEnlargement: true })
    .grayscale()
    .threshold(140)
    .toBuffer();
}

async function runOcr(buffer) {
  const worker = await createWorker();

  await worker.loadLanguage('eng');
  await worker.initialize('eng');
  const {
    data: { text },
  } = await worker.recognize(buffer);
  await worker.terminate();
  return text;
}

function normaliseWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function splitRow(line) {
  // Try commas first, then tabs or large spaces
  if (line.includes(',')) {
    return line.split(',').map(normaliseWhitespace);
  }
  if (line.includes('\t')) {
    return line.split('\t').map(normaliseWhitespace);
  }
  return line
    .split(/\s{2,}/)
    .map(normaliseWhitespace)
    .filter(Boolean);
}

function parseTable(rawText) {
  const rows = rawText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(splitRow)
    .filter(row => row.length > 0);

  if (!rows.length) {
    return { headers: [], data: [] };
  }

  const maxColumns = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const headers = Array.from({ length: maxColumns }, (_, idx) => `col${idx + 1}`);

  const data = rows.map(row => {
    if (row.length === maxColumns) {
      return row;
    }
    // pad missing cells
    return [...row, ...Array(maxColumns - row.length).fill('')];
  });

  return { headers, data };
}

async function writeCsv(headers, data, outputPath) {
  if (!headers.length) {
    console.warn('No rows detected; skipping CSV write.');
    return;
  }

  const writer = createObjectCsvWriter({
    path: outputPath,
    header: headers.map(header => ({ id: header, title: header })),
  });

  const records = data.map(row =>
    Object.fromEntries(headers.map((header, idx) => [header, row[idx] ?? '']))
  );

  await writer.writeRecords(records);
}

async function main() {
  const [imagePath, csvPathArg] = process.argv.slice(2);

  if (!imagePath) {
    console.error('Usage: node scripts/ocr-to-csv.mjs <imagePath> [outputCsvPath]');
    process.exit(1);
  }

  const csvPath =
    csvPathArg ||
    path.join(
      path.dirname(imagePath),
      `${path.parse(imagePath).name}.csv`
    );

  console.log(`> Pre-processing image: ${imagePath}`);
  const buffer = await preprocessImage(imagePath);

  console.log('> Running OCR (this can take a moment)...');
  const text = await runOcr(buffer);

  console.log('> Parsing OCR text...');
  const { headers, data } = parseTable(text);

  console.log(`> Writing CSV with ${data.length} row(s) to ${csvPath}`);
  await writeCsv(headers, data, csvPath);

  console.log('Done.');
}

main().catch(error => {
  console.error('Failed to process image:', error);
  process.exit(1);
});


