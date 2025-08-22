import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab');

    // Get today's date at midnight (start of day) in local timezone
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);



    let whereClause: any = {};
    
    // Handle different tab types
    if (tab === 'all') {
      // Return all bookings for count calculations
      whereClause = {};
    } else if (tab === 'upcoming') {
      // For upcoming bookings, get all bookings with dates from today onwards
      const todayString = today.toISOString().split('T')[0]; // Get YYYY-MM-DD format
      whereClause = {
        preferredDate: {
          gte: new Date(todayString + 'T00:00:00.000Z')
        }
      };
    } else if (tab === 'past') {
      // For past bookings, get all bookings with dates before today
      const todayString = today.toISOString().split('T')[0]; // Get YYYY-MM-DD format
      whereClause = {
        preferredDate: {
          lt: new Date(todayString + 'T00:00:00.000Z')
        }
      };
    } else if (tab === 'pending') {
      whereClause = {
        status: 'PENDING'
      };
    } else if (tab === 'completed') {
      whereClause = {
        status: 'COMPLETED'
      };
    } else if (tab === 'cancelled') {
      whereClause = {
        status: 'CANCELLED'
      };
    } else {
      // Default to upcoming
      whereClause = {
        preferredDate: {
          gte: todayEnd
        }
      };
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      orderBy: {
        preferredDate: 'asc'
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
        message: 'Failed to fetch bookings',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
