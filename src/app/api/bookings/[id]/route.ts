import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { status } = await request.json();

    const booking = await prisma.booking.update({
      where: { id },
      data: { status }
    });

    return NextResponse.json({ 
      success: true, 
      booking 
    });
  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to update booking' 
      },
      { status: 500 }
    );
  }
}
