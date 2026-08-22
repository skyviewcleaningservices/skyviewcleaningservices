import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import WhatsAppBusinessAPI from '@/lib/whatsapp';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.json();

    // Only the phone number is mandatory for a public booking.
    const digitsOnly = typeof formData.phone === 'string' ? formData.phone.replace(/\D/g, '') : '';
    if (digitsOnly.length !== 10) {
      return NextResponse.json(
        { success: false, message: 'A valid 10-digit mobile number is required.' },
        { status: 400 }
      );
    }

    // Area is optional — only reject when the customer explicitly told us
    // their area isn't one we serve.
    if (formData.area === 'Other') {
      return NextResponse.json(
        {
          success: false,
          message: "Sorry, we don't currently serve this area yet."
        },
        { status: 400 }
      );
    }

    // Check for existing customer
    let existingCustomer = null;
    try {
      // Match on phone, and on email only when one was actually given — an
      // empty-string email would otherwise match every other blank-email
      // booking and wrongly flag brand-new customers as returning ones.
      const matchConditions: Array<{ phone: string } | { email: string }> = [{ phone: formData.phone }];
      if (formData.email) matchConditions.push({ email: formData.email });

      // Find the most recent booking by this customer
      existingCustomer = await prisma.booking.findFirst({
        where: { OR: matchConditions },
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
      console.log('Creating booking with data:', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        serviceType: formData.serviceType,
        frequency: formData.frequency,
        date: formData.date,
        time: formData.time,
        flatType: formData.flatType,
        additionalServices: formData.additionalServices
      });

      // preferredDate is a required column — when the customer skips it (it's
      // optional on the form), fall back to today's date as a placeholder;
      // we'll call them to confirm the actual date anyway.
      const preferredDate = formData.date ? new Date(formData.date) : new Date();

      booking = await prisma.booking.create({
        data: {
          name: formData.name || '',
          email: formData.email || null,
          phone: formData.phone,
          address: formData.address || '',
          area: formData.area || null,
          serviceType: formData.serviceType || 'deep-cleaning',
          frequency: formData.frequency || 'one-time',
          preferredDate,
          preferredTime: formData.time || '',
          flatType: formData.flatType || 'ONE_BHK',
          additionalServices: JSON.stringify(formData.additionalServices || []),
          specialInstructions: formData.specialInstructions || null,
        },
      });

      console.log('Booking created successfully:', booking.id);
    } catch (dbError) {
      console.error('Database error:', dbError);
      throw new Error(`Failed to create booking: ${dbError instanceof Error ? dbError.message : 'Unknown database error'}`);
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
      const greeting = formData.name ? `Welcome back, ${formData.name}!` : 'Welcome back!';
      responseMessage = `${greeting} Thank you for choosing SkyView Cleaning Services again. We will contact you soon to confirm your appointment.`;
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


