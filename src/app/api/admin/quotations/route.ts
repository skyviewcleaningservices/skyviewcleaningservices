import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminOrManager, isAdminPayload } from '@/lib/auth';

const DOCUMENT_TYPES = ['QUOTATION', 'INVOICE'];

interface ItemInput {
  description: string;
  quantity: number;
  rate: number;
}

// GET /api/admin/quotations — every quotation/invoice, most recent first
export async function GET(request: NextRequest) {
  const auth = requireAdminOrManager(request);
  if (!isAdminPayload(auth)) return auth;

  try {
    const quotations = await prisma.quotation.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, quotations });
  } catch (error) {
    console.error('Error fetching quotations:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch quotations' }, { status: 500 });
  }
}

// POST — create a new quotation or invoice, auto-numbered per type
export async function POST(request: NextRequest) {
  const auth = requireAdminOrManager(request);
  if (!isAdminPayload(auth)) return auth;

  try {
    const data = await request.json();

    if (!data.customerName || !data.customerName.trim()) {
      return NextResponse.json({ success: false, message: 'Customer name is required' }, { status: 400 });
    }

    const type = DOCUMENT_TYPES.includes(data.type) ? data.type : 'QUOTATION';

    const items: ItemInput[] = Array.isArray(data.items) ? data.items : [];
    const cleanItems = items
      .filter(item => item.description && item.description.trim())
      .map(item => {
        const quantity = parseFloat(String(item.quantity)) || 0;
        const rate = parseFloat(String(item.rate)) || 0;
        return { description: item.description.trim(), quantity, rate, amount: quantity * rate };
      });

    if (cleanItems.length === 0) {
      return NextResponse.json({ success: false, message: 'At least one line item is required' }, { status: 400 });
    }

    const subtotal = cleanItems.reduce((sum, item) => sum + item.amount, 0);
    const applyGst = !!data.applyGst;
    const gstPercent = applyGst ? parseFloat(String(data.gstPercent)) || 0 : null;
    const gstAmount = applyGst && gstPercent ? (subtotal * gstPercent) / 100 : 0;
    const total = subtotal + gstAmount;

    // Sequential per-type number — QTN-0001, INV-0001, etc.
    const prefix = type === 'INVOICE' ? 'INV' : 'QTN';
    const countForType = await prisma.quotation.count({ where: { type } });
    const number = `${prefix}-${String(countForType + 1).padStart(4, '0')}`;

    const quotation = await prisma.quotation.create({
      data: {
        number,
        type,
        customerName: data.customerName.trim(),
        customerPhone: data.customerPhone || null,
        customerEmail: data.customerEmail || null,
        customerAddress: data.customerAddress || null,
        gstNumber: data.gstNumber || null,
        applyGst,
        gstPercent,
        date: data.date ? new Date(data.date) : new Date(),
        notes: data.notes || null,
        subtotal,
        gstAmount,
        total,
        items: {
          create: cleanItems,
        },
      },
      include: { items: true },
    });

    return NextResponse.json({ success: true, message: `${type === 'INVOICE' ? 'Invoice' : 'Quotation'} created`, quotation });
  } catch (error) {
    console.error('Error creating quotation:', error);
    return NextResponse.json({ success: false, message: 'Failed to create quotation' }, { status: 500 });
  }
}
