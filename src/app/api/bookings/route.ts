import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const bookings = await prisma.booking.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ 
      success: true, 
      bookings 
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch bookings' 
      },
      { status: 500 }
    );
  }
}
