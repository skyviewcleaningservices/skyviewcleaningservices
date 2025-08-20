import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includePast = searchParams.get('includePast') === 'true';

    // Get today's date at midnight (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let whereClause = {};
    
    if (includePast) {
      // Show past bookings (before today)
      whereClause = {
        preferredDate: {
          lt: today
        }
      };
    } else {
      // Show upcoming bookings (from today onwards)
      whereClause = {
        preferredDate: {
          gte: today
        }
      };
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      orderBy: {
        preferredDate: 'asc' // Sort by preferred date in ascending order
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
