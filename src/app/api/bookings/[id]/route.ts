import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminOrManager, isAdminPayload } from '@/lib/auth';

// Helper for consistent JSON responses
const jsonResponse = (success: boolean, data: any, status: number = 200) =>
  NextResponse.json({ success, ...data }, { status });

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAdminOrManager(request);
  if (!isAdminPayload(auth)) return auth;

  try {
    const { id } = await params;

    const booking = await prisma.booking.findUnique({ where: { id: parseInt(id) } });

    if (!booking) {
      return jsonResponse(false, { message: 'Booking not found' }, 404);
    }

    return jsonResponse(true, { booking });
  } catch (error) {
    console.error('Error fetching booking:', error);
    return jsonResponse(false, {
      message: 'Failed to fetch booking',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAdminOrManager(request);
  if (!isAdminPayload(auth)) return auth;

  try {
    const { id } = await params;
    const formData = await request.json();

    const allowedStatus = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
    const allowedPaymentTypes = ['CASH', 'CARD', 'UPI', 'BANK_TRANSFER'];

    const updateData: Record<string, any> = {};

    // ✅ Conditional mapping with validations
    if (allowedStatus.includes(formData.status)) {
      updateData.status = formData.status;
    }
    if (allowedPaymentTypes.includes(formData.paymentType)) {
      updateData.paymentType = formData.paymentType;
    } else if (formData.paymentType === null || formData.paymentType === '') {
      updateData.paymentType = null;
    }

    // Required (NOT NULL) columns — an empty string is fine, but null would
    // violate the schema, so these are never converted to null.
    ['name', 'phone', 'address', 'serviceType', 'frequency',
     'preferredTime', 'flatType', 'additionalServices',
    ].forEach((field) => {
      if (formData[field] !== undefined) {
        updateData[field] = formData[field];
      }
    });

    // Actually-nullable columns (email is optional — only phone is required)
    ['email', 'remarks', 'paymentAmount', 'specialInstructions', 'statusReason', 'area'
    ].forEach((field) => {
      if (formData[field] !== undefined) {
        updateData[field] = formData[field] || null;
      }
    });

    // preferredDate is required too — only update it when a valid date is
    // given, never null it out.
    if (formData.preferredDate) {
      updateData.preferredDate = new Date(formData.preferredDate);
    }

    const booking = await prisma.booking.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    return jsonResponse(true, { booking });
  } catch (error) {
    console.error('Error updating booking:', error);
    return jsonResponse(false, {
      message: 'Failed to update booking',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAdminOrManager(request);
  if (!isAdminPayload(auth)) return auth;

  try {
    const { id } = await params;

    const existing = await prisma.booking.findUnique({ where: { id: parseInt(id) } });
    if (!existing) {
      return jsonResponse(false, { message: 'Booking not found' }, 404);
    }

    await prisma.booking.delete({ where: { id: parseInt(id) } });

    return jsonResponse(true, { message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Error deleting booking:', error);
    return jsonResponse(false, {
      message: 'Failed to delete booking',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
}
