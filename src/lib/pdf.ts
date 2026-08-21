import { jsPDF } from 'jspdf';

// Starts a PDF with the shared SkyView header (name, report title, generated-on
// date) so every export in the app looks consistent. Returns the doc positioned
// just below the header — pass `startY` (36) into autoTable or draw from there.
export function startPdf(title: string): jsPDF {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.setTextColor(20);
  doc.text('SkyView Cleaning Services', 14, 16);

  doc.setFontSize(11);
  doc.setTextColor(90);
  doc.text(title, 14, 24);
  doc.text(`Generated ${new Date().toLocaleString('en-IN')}`, 14, 30);

  doc.setDrawColor(210);
  doc.line(14, 33, 196, 33);
  doc.setTextColor(0);

  return doc;
}

export const PDF_TABLE_START_Y = 38;
