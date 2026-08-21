import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminOrManager, isAdminPayload } from '@/lib/auth';

const PAYMENT_TYPES = ['CASH', 'CARD', 'UPI', 'BANK_TRANSFER'];

// GET /api/admin/expenses?month=YYYY-MM — every expense recorded that month
export async function GET(request: NextRequest) {
  const auth = requireAdminOrManager(request);
  if (!isAdminPayload(auth)) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ success: false, message: 'Invalid or missing month (expected YYYY-MM)' }, { status: 400 });
    }

    const [year, mon] = month.split('-').map(Number);
    const start = new Date(year, mon - 1, 1);
    const end = new Date(year, mon, 1);

    const expenses = await prisma.expense.findMany({
      where: { date: { gte: start, lt: end } },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json({ success: true, expenses });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch expenses' }, { status: 500 });
  }
}

// POST - Add a new expense
export async function POST(request: NextRequest) {
  const auth = requireAdminOrManager(request);
  if (!isAdminPayload(auth)) return auth;

  try {
    const data = await request.json();

    if (!data.description || !data.amount || !data.date) {
      return NextResponse.json(
        { success: false, message: 'Description, amount, and date are required' },
        { status: 400 }
      );
    }

    const amount = parseFloat(data.amount);
    if (isNaN(amount) || amount < 0) {
      return NextResponse.json({ success: false, message: 'Amount must be a non-negative number' }, { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: {
        description: data.description,
        category: data.category || null,
        amount,
        date: new Date(data.date),
        paymentType: PAYMENT_TYPES.includes(data.paymentType) ? data.paymentType : null,
        notes: data.notes || null,
      },
    });

    return NextResponse.json({ success: true, message: 'Expense added successfully', expense });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ success: false, message: 'Failed to create expense' }, { status: 500 });
  }
}
