import PDFDocument from 'pdfkit';
import { formatCurrency } from '../../utils/currency.js';

const COLORS = {
  dark: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
  panel: '#f8fafc',
  white: '#ffffff'
};

export function generatePayslipPdf(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawPayslip(doc, data);
    doc.end();
  });
}

function drawPayslip(doc, data) {
  const { company, employee, period, financials } = data;
  const currency = financials.currency;
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const left = doc.page.margins.left;

  // Header
  doc.font('Helvetica-Bold').fontSize(20).fillColor(COLORS.dark)
    .text(company.name, left, doc.y, { width: pageWidth * 0.55, align: 'left' });

  const headerRightX = left + pageWidth * 0.55;
  doc.font('Helvetica-Bold').fontSize(22).fillColor(COLORS.dark)
    .text('SALARY SLIP', headerRightX, doc.page.margins.top, { width: pageWidth * 0.45, align: 'right' });
  doc.font('Helvetica').fontSize(12).fillColor(COLORS.muted)
    .text(`For ${period.month} ${period.year}`, headerRightX, doc.y, { width: pageWidth * 0.45, align: 'right' });

  doc.font('Helvetica').fontSize(11).fillColor(COLORS.muted)
    .text(company.address, left, doc.page.margins.top + 28, { width: pageWidth * 0.55 });
  doc.text(`Tax ID: ${company.taxId}`, left, doc.y + 4);

  doc.moveDown(2);
  drawLine(doc, left, doc.y, pageWidth, COLORS.dark, 2);
  doc.moveDown(1.2);

  // Employee details panel
  const panelY = doc.y;
  const panelHeight = 88;
  doc.save();
  doc.roundedRect(left, panelY, pageWidth, panelHeight, 6).fill(COLORS.panel);
  doc.restore();

  const colWidth = (pageWidth - 40) / 2;
  const col2X = left + colWidth + 40;
  let detailY = panelY + 16;

  drawDetailRow(doc, left + 16, detailY, colWidth - 16, 'Employee ID', employee.id);
  drawDetailRow(doc, col2X, detailY, colWidth - 16, 'Designation', employee.role);
  detailY += 22;
  drawDetailRow(doc, left + 16, detailY, colWidth - 16, 'Name', employee.name);
  drawDetailRow(doc, col2X, detailY, colWidth - 16, 'Email', employee.email);
  detailY += 22;
  drawDetailRow(doc, left + 16, detailY, colWidth - 16, 'Department', employee.department);
  drawDetailRow(doc, col2X, detailY, colWidth - 16, 'Payslip Reference', data.metadata.payslipId);

  doc.y = panelY + panelHeight + 24;

  // Payment period
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.dark)
    .text('Payment Period', left, doc.y);
  doc.font('Helvetica').fontSize(11).fillColor(COLORS.muted)
    .text(`${period.month} ${period.year}`, left + 120, doc.y - 11);

  doc.moveDown(1.5);

  // Earnings & Deductions columns
  const columnTop = doc.y;
  const columnWidth = (pageWidth - 30) / 2;

  drawSectionTitle(doc, left, columnTop, 'Earnings');
  drawSectionTitle(doc, left + columnWidth + 30, columnTop, 'Deductions');

  let rowY = columnTop + 22;
  rowY = drawAmountRow(doc, left, rowY, columnWidth, 'Basic Salary', financials.earnings.basic, currency);
  rowY = drawAmountRow(doc, left, rowY, columnWidth, 'House Rent Allowance (HRA)', financials.earnings.hra, currency);
  rowY = drawAmountRow(doc, left, rowY, columnWidth, 'Special Allowances', financials.earnings.allowances, currency);
  const earningsEndY = drawTotalRow(doc, left, rowY + 4, columnWidth, 'Gross Earnings', financials.earnings.totalGross, currency);

  let dedY = columnTop + 22;
  dedY = drawAmountRow(doc, left + columnWidth + 30, dedY, columnWidth, 'Income Tax / Deductions', financials.deductions.totalDeductions, currency);
  const deductionsEndY = drawTotalRow(doc, left + columnWidth + 30, dedY + 4, columnWidth, 'Total Deductions', financials.deductions.totalDeductions, currency);

  doc.y = Math.max(earningsEndY, deductionsEndY) + 28;

  // Net pay banner
  const bannerY = doc.y;
  const bannerHeight = 64;
  doc.save();
  doc.roundedRect(left, bannerY, pageWidth, bannerHeight, 6).fill(COLORS.dark);
  doc.restore();

  doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.white)
    .text('NET TAKE-HOME SALARY', left + 20, bannerY + 22);

  const netText = formatCurrency(financials.netPay, currency);
  doc.font('Helvetica-Bold').fontSize(22).fillColor(COLORS.white)
    .text(netText, left, bannerY + 14, { width: pageWidth - 20, align: 'right' });

  doc.font('Helvetica').fontSize(10).fillColor('#94a3b8')
    .text(financials.netPayInWords, left, bannerY + 42, { width: pageWidth - 20, align: 'right' });

  doc.y = bannerY + bannerHeight + 40;

  // Signatures
  drawLine(doc, left, doc.y, 180, COLORS.muted, 1, true);
  drawLine(doc, left + pageWidth - 180, doc.y, 180, COLORS.muted, 1, true);
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.muted)
    .text('Employer Signature', left, doc.y + 6, { width: 180, align: 'center' })
    .text('Employee Signature', left + pageWidth - 180, doc.y - 5, { width: 180, align: 'center' });
}

function drawLine(doc, x, y, width, color, thickness = 1, dashed = false) {
  doc.save();
  doc.lineWidth(thickness).strokeColor(color);
  if (dashed) doc.dash(4, { space: 4 });
  doc.moveTo(x, y).lineTo(x + width, y).stroke();
  doc.restore();
}

function drawSectionTitle(doc, x, y, title) {
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.dark)
    .text(title.toUpperCase(), x, y);
  drawLine(doc, x, y + 16, doc.page.width / 2 - 50, COLORS.border, 1);
}

function drawDetailRow(doc, x, y, width, label, value) {
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.muted).text(label, x, y, { width: width * 0.45 });
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.dark).text(value || '-', x + width * 0.45, y, { width: width * 0.55, align: 'right' });
}

function drawAmountRow(doc, x, y, width, label, amount, currency) {
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.dark).text(label, x, y, { width: width * 0.62 });
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.dark)
    .text(formatCurrency(amount, currency), x, y, { width, align: 'right' });
  return y + 18;
}

function drawTotalRow(doc, x, y, width, label, amount, currency) {
  drawLine(doc, x, y, width, COLORS.border, 1);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.dark).text(label, x, y + 8, { width: width * 0.62 });
  doc.text(formatCurrency(amount, currency), x, y + 8, { width, align: 'right' });
  return y + 28;
}

export function buildPdfFilename(employeeId, month, year) {
  const safeId = String(employeeId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeMonth = String(month).replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
  return `Payslip_${safeId}_${safeMonth}_${year}.pdf`;
}
