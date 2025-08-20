import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';

// Helper for consistent JSON responses
const jsonResponse = (success: boolean, data: any, status: number = 200) =>
  NextResponse.json({ success, ...data }, { status });

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const booking = await prisma.booking.findUnique({ where: { id } });

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
    }

    // ✅ Handle nullable fields
    ['remarks', 'paymentAmount', 'name', 'email', 'phone', 'address',
     'serviceType', 'frequency', 'preferredTime', 'bedrooms', 'bathrooms',
     'additionalServices', 'specialInstructions'
    ].forEach((field) => {
      if (formData[field] !== undefined) {
        updateData[field] = formData[field] || null;
      }
    });

    // ✅ Safely parse date
    if (formData.preferredDate !== undefined) {
      updateData.preferredDate = formData.preferredDate
        ? new Date(formData.preferredDate)
        : null;
    }

    const booking = await prisma.booking.update({
      where: { id },
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
