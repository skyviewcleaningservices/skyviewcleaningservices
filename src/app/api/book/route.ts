import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import WhatsAppBusinessAPI from '../../services/WhatsAppBusinessAPI';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.json();

    // Check for existing customer
    let existingCustomer = null;
    try {
      // Find the most recent booking by this customer
      existingCustomer = await prisma.booking.findFirst({
        where: {
          OR: [
            { email: formData.email },
            { phone: formData.phone }
          ]
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } catch (error) {
      console.error('Error checking existing customer:', error);
    }

    // Store booking in database
    let booking;
    try {
      booking = await prisma.booking.create({
        data: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          serviceType: formData.serviceType,
          frequency: formData.frequency,
          preferredDate: new Date(formData.date),
          preferredTime: formData.time,
          flatType: formData.flatType,
          additionalServices: JSON.stringify(formData.additionalServices),
          specialInstructions: formData.specialInstructions || null,
        },
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
    }

    // Send WhatsApp notifications to admin
    let whatsappResult = {
      adminSent: false,
      adminError: null as string | null
    };

    try {
      const whatsappService = WhatsAppBusinessAPI.getInstance();

      // Check if WhatsApp is properly configured
      if (!whatsappService.isConfigured()) {
        console.warn('WhatsApp not configured - skipping notifications');
        whatsappResult = {
          adminSent: false,
          adminError: 'WhatsApp not configured'
        };
      } else {
        console.log('WhatsApp configured, attempting to send notifications');

        // Send admin notification
        const adminResult = await whatsappService.sendAdminNotification({
          ...formData,
          bookingId: booking?.id || 'N/A'
        });

        console.log('Admin notification result:', adminResult);

        whatsappResult = {
          adminSent: adminResult.success,
          adminError: adminResult.error || null
        };
      }
    } catch (whatsappError) {
      console.error('WhatsApp notification error:', {
        error: whatsappError instanceof Error ? whatsappError.message : whatsappError,
        stack: whatsappError instanceof Error ? whatsappError.stack : undefined
      });
      whatsappResult = {
        adminSent: false,
        adminError: 'WhatsApp notification failed'
      };
    }

    // Determine response message based on whether customer is returning
    let responseMessage = 'Booking submitted successfully! We will contact you soon to confirm your appointment.';
    let isReturningCustomer = false;

    if (existingCustomer) {
      isReturningCustomer = true;
      responseMessage = `Welcome back, ${formData.name}! Thank you for choosing SkyView Cleaning Services again. We will contact you soon to confirm your appointment.`;
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: responseMessage,
      bookingId: booking?.id,
      isReturningCustomer: isReturningCustomer,
      whatsappNotifications: whatsappResult
    });

  } catch (error) {
    console.error('Booking submission error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to submit booking. Please try again or contact us directly.'
      },
      { status: 500 }
    );
  }
}


