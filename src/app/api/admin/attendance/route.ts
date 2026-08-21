import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminOrManager, isAdminPayload } from '@/lib/auth';

// GET /api/admin/attendance?month=YYYY-MM — all attendance rows for that month
export async function GET(request: NextRequest) {
  const auth = requireAdminOrManager(request);
  if (!isAdminPayload(auth)) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // "YYYY-MM"

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ success: false, message: 'Invalid or missing month (expected YYYY-MM)' }, { status: 400 });
    }

    const [year, mon] = month.split('-').map(Number);
    const start = new Date(year, mon - 1, 1);
    const end = new Date(year, mon, 1);

    const records = await prisma.attendance.findMany({
      where: { date: { gte: start, lt: end } },
    });

    return NextResponse.json({ success: true, records });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch attendance' }, { status: 500 });
  }
}

// POST /api/admin/attendance — mark an employee present on a date (idempotent)
export async function POST(request: NextRequest) {
  const auth = requireAdminOrManager(request);
  if (!isAdminPayload(auth)) return auth;

  try {
    const { employeeId, date } = await request.json();
    if (!employeeId || !date) {
      return NextResponse.json({ success: false, message: 'employeeId and date are required' }, { status: 400 });
    }

    const parsedDate = new Date(date);
    const record = await prisma.attendance.upsert({
      where: { employeeId_date: { employeeId: parseInt(employeeId), date: parsedDate } },
      update: {},
      create: { employeeId: parseInt(employeeId), date: parsedDate },
    });

    return NextResponse.json({ success: true, record });
  } catch (error) {
    console.error('Error marking attendance:', error);
    return NextResponse.json({ success: false, message: 'Failed to mark attendance' }, { status: 500 });
  }
}

// DELETE /api/admin/attendance — unmark an employee's attendance on a date
export async function DELETE(request: NextRequest) {
  const auth = requireAdminOrManager(request);
  if (!isAdminPayload(auth)) return auth;

  try {
    const { employeeId, date } = await request.json();
    if (!employeeId || !date) {
      return NextResponse.json({ success: false, message: 'employeeId and date are required' }, { status: 400 });
    }

    const parsedDate = new Date(date);
    await prisma.attendance.deleteMany({
      where: { employeeId: parseInt(employeeId), date: parsedDate },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unmarking attendance:', error);
    return NextResponse.json({ success: false, message: 'Failed to unmark attendance' }, { status: 500 });
  }
}
