import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminOrManager, isAdminPayload } from '@/lib/auth';

// GET /api/admin/advances?month=YYYY-MM — every employee's advance total for that month
export async function GET(request: NextRequest) {
  const auth = requireAdminOrManager(request);
  if (!isAdminPayload(auth)) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ success: false, message: 'Invalid or missing month (expected YYYY-MM)' }, { status: 400 });
    }

    const advances = await prisma.salaryAdvance.findMany({ where: { month } });

    return NextResponse.json({ success: true, advances });
  } catch (error) {
    console.error('Error fetching advances:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch advances' }, { status: 500 });
  }
}

// POST /api/admin/advances — set an employee's total advance for a month (upsert)
export async function POST(request: NextRequest) {
  const auth = requireAdminOrManager(request);
  if (!isAdminPayload(auth)) return auth;

  try {
    const { employeeId, month, amount } = await request.json();

    if (!employeeId || !month || !/^\d{4}-\d{2}$/.test(month) || amount === undefined) {
      return NextResponse.json({ success: false, message: 'employeeId, month, and amount are required' }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      return NextResponse.json({ success: false, message: 'Amount must be a non-negative number' }, { status: 400 });
    }

    const advance = await prisma.salaryAdvance.upsert({
      where: { employeeId_month: { employeeId: parseInt(employeeId), month } },
      update: { amount: parsedAmount },
      create: { employeeId: parseInt(employeeId), month, amount: parsedAmount },
    });

    return NextResponse.json({ success: true, advance });
  } catch (error) {
    console.error('Error saving advance:', error);
    return NextResponse.json({ success: false, message: 'Failed to save advance' }, { status: 500 });
  }
}
