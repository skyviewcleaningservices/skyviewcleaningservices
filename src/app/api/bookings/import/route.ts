import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminOrManager, isAdminPayload } from '@/lib/auth';

interface ImportRow {
  name?: string;
  phone?: string;
  address?: string;
  lastServiceDate?: string;
  review?: string;
  paymentAmount?: string;
  serviceType?: string;
}

// Kept low so one request comfortably finishes within the 30s function
// timeout (see vercel.json) even at CONCURRENCY below — the client chunks
// larger files into batches this size (see ImportBookingsModal).
const MAX_ROWS = 300;
const CONCURRENCY = 20;

// Parses dates in ISO (YYYY-MM-DD) or DD/MM/YYYY / DD-MM-YYYY form — the two
// formats a customer spreadsheet from this (India-based) business is likely to use.
function parseServiceDate(value?: string): Date | null {
  if (!value || !value.trim()) return null;
  const trimmed = value.trim();

  const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const year = y.length === 2 ? 2000 + parseInt(y, 10) : parseInt(y, 10);
    const date = new Date(year, parseInt(m, 10) - 1, parseInt(d, 10));
    return isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function parsePaymentAmount(value?: string): number | null {
  if (!value || !value.trim()) return null;
  const cleaned = value.replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const amount = parseFloat(cleaned);
  return isNaN(amount) ? null : amount;
}

// POST - Bulk-import past customer/service records from a CSV (parsed client-side)
// as COMPLETED bookings, so they show up in Booking Management / Reports / customer history.
export async function POST(request: NextRequest) {
  const auth = requireAdminOrManager(request);
  if (!isAdminPayload(auth)) return auth;

  try {
    const { rows } = await request.json() as { rows: ImportRow[] };

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: false, message: 'No rows to import' }, { status: 400 });
    }
    if (rows.length > MAX_ROWS) {
      return NextResponse.json(
        { success: false, message: `Too many rows — max ${MAX_ROWS} per import` },
        { status: 400 }
      );
    }

    let created = 0;
    const failed: { row: number; reason: string }[] = [];
    const skipped: { row: number; reason: string }[] = [];

    const createRow = async (row: ImportRow, index: number) => {
      const name = row.name?.trim();
      const phone = row.phone?.trim();

      if (!name || !phone) {
        failed.push({ row: index + 1, reason: 'Missing name or phone number' });
        return;
      }

      const serviceDate = parseServiceDate(row.lastServiceDate) || new Date();

      // Same phone + same service date already on file — almost certainly this
      // exact row imported before (e.g. a retry after a partial failure), not
      // a second real booking. Skip instead of creating a duplicate.
      const existing = await prisma.booking.findFirst({
        where: { phone, preferredDate: serviceDate },
        select: { id: true },
      });
      if (existing) {
        skipped.push({ row: index + 1, reason: `Mobile number ${phone} already has a booking on this date` });
        return;
      }

      try {
        await prisma.booking.create({
          data: {
            name,
            email: '',
            phone,
            address: row.address?.trim() || '',
            area: null,
            serviceType: row.serviceType?.trim() || 'regular-cleaning',
            frequency: 'one-time',
            preferredDate: serviceDate,
            preferredTime: 'N/A',
            flatType: 'ONE_BHK',
            additionalServices: '[]',
            specialInstructions: null,
            status: 'COMPLETED',
            paymentAmount: parsePaymentAmount(row.paymentAmount),
            remarks: row.review?.trim() || null,
          },
        });
        created++;
      } catch (rowError) {
        failed.push({
          row: index + 1,
          reason: rowError instanceof Error ? rowError.message : 'Failed to save row',
        });
      }
    };

    // Bounded concurrency instead of one-row-at-a-time — a fully sequential
    // loop of network round-trips to the database was blowing past the 30s
    // function timeout partway through large imports.
    for (let i = 0; i < rows.length; i += CONCURRENCY) {
      const batch = rows.slice(i, i + CONCURRENCY);
      await Promise.all(batch.map((row, j) => createRow(row, i + j)));
    }

    return NextResponse.json({ success: true, created, failed, skipped });
  } catch (error) {
    console.error('Error importing bookings:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to import bookings',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
