import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import WhatsAppBusinessAPI from '../../services/WhatsAppBusinessAPI';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.json();

    // Check for existing customer and count previous bookings
    let existingCustomer = null;
    let previousBookingsCount = 0;
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

      // Count total previous bookings
      if (existingCustomer) {
        const previousBookings = await prisma.booking.count({
          where: {
            OR: [
              { email: formData.email },
              { phone: formData.phone }
            ]
          }
        });
        previousBookingsCount = previousBookings;
      }
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
          bedrooms: formData.bedrooms,
          bathrooms: formData.bathrooms,
          additionalServices: JSON.stringify(formData.additionalServices),
          specialInstructions: formData.specialInstructions || null,
        },
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Continue with WhatsApp notifications even if database fails
    }

    // Send WhatsApp notifications to both customer and admin
    let whatsappResult = {
      customerSent: false,
      adminSent: false,
      customerError: null as string | null,
      adminError: null as string | null
    };

    try {
      const whatsappService = WhatsAppBusinessAPI.getInstance();
      
      // Send customer notification
      const customerResult = await whatsappService.sendCustomerNotification({
        ...formData,
        bookingId: booking?.id || 'N/A'
      });
      
      // Send admin notification
      const adminResult = await whatsappService.sendAdminNotification({
        ...formData,
        bookingId: booking?.id || 'N/A'
      });

      whatsappResult = {
        customerSent: customerResult.success,
        adminSent: adminResult.success,
        customerError: customerResult.error || null,
        adminError: adminResult.error || null
      };
    } catch (whatsappError) {
      console.error('WhatsApp notification error:', whatsappError);
      whatsappResult = {
        customerSent: false,
        adminSent: false,
        customerError: 'WhatsApp notification failed',
        adminError: 'WhatsApp notification failed'
      };
    }

    // Determine response message based on whether customer is returning
    let responseMessage = 'Booking submitted successfully! We will contact you soon to confirm your appointment.';
    let isReturningCustomer = false;

    if (existingCustomer) {
      isReturningCustomer = true;

      // Personalized message based on number of previous bookings
      if (previousBookingsCount === 1) {
        responseMessage = `Welcome back, ${formData.name}, Ji! 🎉 Thank you for choosing SkyView Cleaning Services again. We're excited to serve you once more and will contact you soon to confirm your appointment.`;
      } else if (previousBookingsCount === 2) {
        responseMessage = `Welcome back, ${formData.name}, ji! 🌟 You're becoming a regular with us! Thank you for your continued trust in SkyView Cleaning Services. We'll contact you soon to confirm your appointment.`;
      } else {
        responseMessage = `Welcome back, ${formData.name}, ji! 🏆 You're one of our valued regular customers! Thank you for your loyalty to SkyView Cleaning Services. We'll contact you soon to confirm your appointment.`;
      }
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: responseMessage,
      bookingId: booking?.id,
      isReturningCustomer: isReturningCustomer,
      previousBookings: previousBookingsCount,
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


