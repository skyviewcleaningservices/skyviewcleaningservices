import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminOrManager, isAdminPayload } from '@/lib/auth';

// GET - Fetch a single quotation/invoice (with items) for viewing or re-downloading
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAdminOrManager(request);
  if (!isAdminPayload(auth)) return auth;

  try {
    const { id } = await params;

    const quotation = await prisma.quotation.findUnique({
      where: { id: parseInt(id) },
      include: { items: true },
    });

    if (!quotation) {
      return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, quotation });
  } catch (error) {
    console.error('Error fetching quotation:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch quotation' }, { status: 500 });
  }
}

// DELETE - Remove a quotation/invoice
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAdminOrManager(request);
  if (!isAdminPayload(auth)) return auth;

  try {
    const { id } = await params;

    const existing = await prisma.quotation.findUnique({ where: { id: parseInt(id) } });
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    }

    await prisma.quotation.delete({ where: { id: parseInt(id) } });

    return NextResponse.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting quotation:', error);
    return NextResponse.json({ success: false, message: 'Failed to delete' }, { status: 500 });
  }
}
