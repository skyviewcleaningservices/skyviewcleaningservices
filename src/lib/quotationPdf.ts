import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';

interface QuotationItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface QuotationDoc {
  number: string;
  type: 'QUOTATION' | 'INVOICE';
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerAddress?: string | null;
  gstNumber?: string | null;
  applyGst: boolean;
  gstPercent?: number | null;
  date: string;
  notes?: string | null;
  subtotal: number;
  gstAmount: number;
  total: number;
  items: QuotationItem[];
}

// "Rs." not "₹" — jsPDF's built-in fonts don't include the Rupee glyph.
const money = (amount: number) => `Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function generateQuotationPdf(doc: QuotationDoc): jsPDF {
  const pdf = new jsPDF();
  const title = doc.type === 'INVOICE' ? 'TAX INVOICE' : 'QUOTATION';

  // Company header
  pdf.setFontSize(18);
  pdf.setTextColor(20);
  pdf.text('SkyView Cleaning Services', 14, 18);
  pdf.setFontSize(9);
  pdf.setTextColor(100);
  pdf.text('Ranjan Society, near PDCC Bank, Shukrawar Peth, Pune - 411002', 14, 24);
  pdf.text('+91 9623029057', 14, 29);

  // Document title + number/date, right-aligned
  pdf.setFontSize(16);
  pdf.setTextColor(79, 70, 229);
  pdf.text(title, 196, 18, { align: 'right' });
  pdf.setFontSize(10);
  pdf.setTextColor(90);
  pdf.text(`No: ${doc.number}`, 196, 24, { align: 'right' });
  pdf.text(`Date: ${new Date(doc.date).toLocaleDateString('en-IN')}`, 196, 29, { align: 'right' });

  pdf.setDrawColor(210);
  pdf.line(14, 33, 196, 33);

  // Bill To block
  let y = 42;
  pdf.setFontSize(9);
  pdf.setTextColor(130);
  pdf.text('BILL TO', 14, y);
  y += 6;
  pdf.setFontSize(11);
  pdf.setTextColor(20);
  pdf.text(doc.customerName, 14, y);
  y += 6;
  pdf.setFontSize(9);
  pdf.setTextColor(90);
  if (doc.customerAddress) {
    const lines = pdf.splitTextToSize(doc.customerAddress, 100);
    pdf.text(lines, 14, y);
    y += lines.length * 4.5;
  }
  if (doc.customerPhone) {
    pdf.text(`Phone: ${doc.customerPhone}`, 14, y);
    y += 4.5;
  }
  if (doc.customerEmail) {
    pdf.text(`Email: ${doc.customerEmail}`, 14, y);
    y += 4.5;
  }
  if (doc.gstNumber) {
    pdf.text(`GSTIN: ${doc.gstNumber}`, 14, y);
    y += 4.5;
  }

  const tableStartY = Math.max(y + 6, 68);

  autoTable(pdf, {
    startY: tableStartY,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [79, 70, 229] },
    columnStyles: {
      0: { cellWidth: 10 },
      2: { cellWidth: 22, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 32, halign: 'right' },
    },
    head: [['#', 'Description', 'Qty', 'Rate', 'Amount']],
    body: doc.items.map((item, i) => [
      String(i + 1),
      item.description,
      String(item.quantity),
      money(item.rate),
      money(item.amount),
    ]),
  });

  // @ts-expect-error - lastAutoTable is attached by the plugin at runtime
  let totalsY = (pdf.lastAutoTable?.finalY || tableStartY) + 10;

  pdf.setFontSize(10);
  pdf.setTextColor(90);
  pdf.text('Subtotal', 150, totalsY, { align: 'right' });
  pdf.text(money(doc.subtotal), 196, totalsY, { align: 'right' });
  totalsY += 6;

  if (doc.applyGst && doc.gstPercent) {
    pdf.text(`GST (${doc.gstPercent}%)`, 150, totalsY, { align: 'right' });
    pdf.text(money(doc.gstAmount), 196, totalsY, { align: 'right' });
    totalsY += 6;
  }

  pdf.setDrawColor(210);
  pdf.line(120, totalsY - 2, 196, totalsY - 2);
  pdf.setFontSize(12);
  pdf.setTextColor(20);
  pdf.text('Total', 150, totalsY + 4, { align: 'right' });
  pdf.text(money(doc.total), 196, totalsY + 4, { align: 'right' });
  totalsY += 14;

  if (doc.notes) {
    pdf.setFontSize(9);
    pdf.setTextColor(130);
    pdf.text('NOTES', 14, totalsY);
    totalsY += 5;
    pdf.setTextColor(90);
    const noteLines = pdf.splitTextToSize(doc.notes, 182);
    pdf.text(noteLines, 14, totalsY);
    totalsY += noteLines.length * 4.5;
  }

  pdf.setFontSize(9);
  pdf.setTextColor(150);
  pdf.text('Thank you for your business.', 14, 285);

  return pdf;
}
