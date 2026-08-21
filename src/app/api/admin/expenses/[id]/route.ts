import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminOrManager, isAdminPayload } from '@/lib/auth';

const PAYMENT_TYPES = ['CASH', 'CARD', 'UPI', 'BANK_TRANSFER'];

// PATCH - Update an expense
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAdminOrManager(request);
  if (!isAdminPayload(auth)) return auth;

  try {
    const { id } = await params;
    const data = await request.json();

    const existing = await prisma.expense.findUnique({ where: { id: parseInt(id) } });
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Expense not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category || null;
    if (data.notes !== undefined) updateData.notes = data.notes || null;
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.paymentType !== undefined) {
      updateData.paymentType = PAYMENT_TYPES.includes(data.paymentType) ? data.paymentType : null;
    }
    if (data.amount !== undefined) {
      const amount = parseFloat(data.amount);
      if (isNaN(amount) || amount < 0) {
        return NextResponse.json({ success: false, message: 'Amount must be a non-negative number' }, { status: 400 });
      }
      updateData.amount = amount;
    }

    const expense = await prisma.expense.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    return NextResponse.json({ success: true, message: 'Expense updated successfully', expense });
  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json({ success: false, message: 'Failed to update expense' }, { status: 500 });
  }
}

// DELETE - Remove an expense
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAdminOrManager(request);
  if (!isAdminPayload(auth)) return auth;

  try {
    const { id } = await params;

    const existing = await prisma.expense.findUnique({ where: { id: parseInt(id) } });
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Expense not found' }, { status: 404 });
    }

    await prisma.expense.delete({ where: { id: parseInt(id) } });

    return NextResponse.json({ success: true, message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json({ success: false, message: 'Failed to delete expense' }, { status: 500 });
  }
}
