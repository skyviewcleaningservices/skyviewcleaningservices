import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireAdminOrManager, isAdminPayload } from '@/lib/auth';
import { SERVED_PUNE_AREAS } from '@/lib/areas';

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (!isAdminPayload(auth)) return auth;

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

// POST - Manually add a booking from the admin side (e.g. a phone-in or walk-in customer).
export async function POST(request: NextRequest) {
  const auth = requireAdminOrManager(request);
  if (!isAdminPayload(auth)) return auth;

  try {
    const formData = await request.json();

    if (!formData.name || !formData.phone || !formData.address || !formData.serviceType ||
        !formData.frequency || !formData.date || !formData.time || !formData.flatType) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!formData.area || !SERVED_PUNE_AREAS.includes(formData.area)) {
      return NextResponse.json(
        { success: false, message: "We don't currently serve this area yet." },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.create({
      data: {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone,
        address: formData.address,
        area: formData.area,
        serviceType: formData.serviceType,
        frequency: formData.frequency,
        preferredDate: new Date(formData.date),
        preferredTime: formData.time,
        flatType: formData.flatType,
        additionalServices: JSON.stringify(formData.additionalServices || []),
        specialInstructions: formData.specialInstructions || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Booking added successfully',
      booking,
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to create booking',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
