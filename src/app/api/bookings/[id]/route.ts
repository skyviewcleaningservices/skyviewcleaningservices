import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const booking = await prisma.booking.findUnique({
      where: { id }
    });

    if (!booking) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Booking not found' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      booking 
    });
  } catch (error) {
    console.error('Error fetching booking:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch booking',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await request.json();

    // Only update the fields that are provided
    const updateData: {
      status?: string;
      remarks?: string | null;
      paymentAmount?: number | null;
      paymentType?: string | null;
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      serviceType?: string;
      frequency?: string;
      preferredDate?: Date;
      preferredTime?: string;
      bedrooms?: string;
      bathrooms?: string;
      additionalServices?: string;
      specialInstructions?: string;
    } = {};
    
    if (formData.status !== undefined) updateData.status = formData.status;
    if (formData.remarks !== undefined) updateData.remarks = formData.remarks || null;
    if (formData.paymentAmount !== undefined) updateData.paymentAmount = formData.paymentAmount || null;
    if (formData.paymentType !== undefined) updateData.paymentType = formData.paymentType || null;
    
    // If all booking fields are provided (for the detailed edit page), update them too
    if (formData.name !== undefined) updateData.name = formData.name;
    if (formData.email !== undefined) updateData.email = formData.email;
    if (formData.phone !== undefined) updateData.phone = formData.phone;
    if (formData.address !== undefined) updateData.address = formData.address;
    if (formData.serviceType !== undefined) updateData.serviceType = formData.serviceType;
    if (formData.frequency !== undefined) updateData.frequency = formData.frequency;
    if (formData.preferredDate !== undefined) updateData.preferredDate = formData.preferredDate ? new Date(formData.preferredDate) : undefined;
    if (formData.preferredTime !== undefined) updateData.preferredTime = formData.preferredTime;
    if (formData.bedrooms !== undefined) updateData.bedrooms = formData.bedrooms;
    if (formData.bathrooms !== undefined) updateData.bathrooms = formData.bathrooms;
    if (formData.additionalServices !== undefined) updateData.additionalServices = formData.additionalServices;
    if (formData.specialInstructions !== undefined) updateData.specialInstructions = formData.specialInstructions;

    const booking = await prisma.booking.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ 
      success: true, 
      booking 
    });
  } catch (error) {
    console.error('Error updating booking:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to update booking',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
