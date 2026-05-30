import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import XLSX from 'xlsx';
import { AppError } from '../middleware/errorHandler.js';

const SUPPORTED_EXTENSIONS = ['.csv', '.xls', '.xlsx'];
const MAX_ROWS = 5000;

export function detectFormat(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    throw new AppError('Unsupported file type. Use CSV or Excel.', 400, 'UNSUPPORTED_FILE_TYPE');
  }
  if (ext === '.csv') return 'csv';
  return 'xlsx';
}

export async function parseFile(filePath, originalName) {
  const format = detectFormat(originalName);

  let rows;
  if (format === 'csv') {
    rows = await parseCsv(filePath);
  } else {
    rows = parseXlsx(filePath);
  }

  if (rows.length > MAX_ROWS) {
    throw new AppError(
      `File exceeds the maximum of ${MAX_ROWS} rows.`,
      400,
      'ROW_LIMIT_EXCEEDED'
    );
  }

  return rows;
}

function parseCsv(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];

    fs.createReadStream(filePath)
      .pipe(csv({ mapHeaders: ({ header }) => header.trim().toLowerCase() }))
      .on('data', (row) => {
        rows.push(normalizeRow(row));
      })
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

function parseXlsx(filePath) {
  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new AppError('Excel file contains no worksheets.', 400, 'EMPTY_WORKBOOK');
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  return rawRows.map(normalizeRow);
}

function normalizeRow(row) {
  const normalized = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[String(key).trim().toLowerCase()] = normalizeCell(value);
  }
  return normalized;
}

function normalizeCell(value) {
  if (value == null) return '';
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  return String(value).trim();
}
