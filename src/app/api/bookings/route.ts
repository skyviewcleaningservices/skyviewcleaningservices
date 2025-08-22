import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includePast = searchParams.get('includePast') === 'true';
    const status = searchParams.get('status');
    const tab = searchParams.get('tab');

    // Get today's date at midnight (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let whereClause: any = {};
    
    // Handle different tab types
    if (tab === 'all') {
      // Return all bookings for count calculations
      whereClause = {};
    } else if (tab === 'upcoming') {
      whereClause = {
        preferredDate: {
          gte: today
        }
      };
    } else if (tab === 'past') {
      whereClause = {
        preferredDate: {
          lt: today
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
      // Fallback to original logic
      if (includePast) {
        whereClause = {
          preferredDate: {
            lt: today
          }
        };
      } else {
        whereClause = {
          preferredDate: {
            gte: today
          }
        };
      }
    }

    // Add status filter if provided
    if (status) {
      whereClause.status = status;
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
        message: 'Failed to fetch bookings' 
      },
      { status: 500 }
    );
  }
}
