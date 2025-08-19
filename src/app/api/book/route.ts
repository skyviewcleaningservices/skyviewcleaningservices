import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import WhatsAppBusinessAPI from '../../services/WhatsAppBusinessAPI';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.json();
    
    // Email content
    const emailContent = `
New Booking Request - SkyView Cleaning Services

Customer Information:
- Name: ${formData.name}
- Email: ${formData.email}
- Phone: ${formData.phone}
- Address: ${formData.address}

Service Details:
- Service Type: ${formData.serviceType}
- Frequency: ${formData.frequency}
- Preferred Date: ${formData.date}
- Preferred Time: ${formData.time}

Property Details:
- Bedrooms: ${formData.bedrooms}
- Bathrooms: ${formData.bathrooms}

Additional Services: ${formData.additionalServices.length > 0 ? formData.additionalServices.join(', ') : 'None'}

Special Instructions: ${formData.specialInstructions || 'None'}

Submitted on: ${new Date().toLocaleString()}
    `;

    // For now, we'll use a simple email service
    // You can replace this with your preferred email service (SendGrid, Mailgun, etc.)
    const emailData = {
      to: 'info@skyviewcleaning.com', // Replace with your email
      subject: 'New Booking Request - SkyView Cleaning Services',
      text: emailContent,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4f46e5;">New Booking Request - SkyView Cleaning Services</h2>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0;">Customer Information</h3>
            <p><strong>Name:</strong> ${formData.name}</p>
            <p><strong>Email:</strong> ${formData.email}</p>
            <p><strong>Phone:</strong> ${formData.phone}</p>
            <p><strong>Address:</strong> ${formData.address}</p>
          </div>

          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0;">Service Details</h3>
            <p><strong>Service Type:</strong> ${formData.serviceType}</p>
            <p><strong>Frequency:</strong> ${formData.frequency}</p>
            <p><strong>Preferred Date:</strong> ${formData.date}</p>
            <p><strong>Preferred Time:</strong> ${formData.time}</p>
          </div>

          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0;">Property Details</h3>
            <p><strong>Bedrooms:</strong> ${formData.bedrooms}</p>
            <p><strong>Bathrooms:</strong> ${formData.bathrooms}</p>
          </div>

          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0;">Additional Services</h3>
            <p>${formData.additionalServices.length > 0 ? formData.additionalServices.join(', ') : 'None'}</p>
          </div>

          ${formData.specialInstructions ? `
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0;">Special Instructions</h3>
            <p>${formData.specialInstructions}</p>
          </div>
          ` : ''}

          <div style="background-color: #e0e7ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #3730a3;"><strong>Submitted on:</strong> ${new Date().toLocaleString()}</p>
          </div>
        </div>
      `
    };

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
      // Continue with email even if database fails
    }

    // Send email using a simple service (you can replace this with your preferred email service)
    const emailResponse = await sendEmail(emailData);

    // Send WhatsApp notifications to both customer and admin using template
    const whatsappService = WhatsAppBusinessAPI.getInstance();
    const whatsappResult = await whatsappService.sendBookingTemplateNotification({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      serviceType: formData.serviceType,
      frequency: formData.frequency,
      date: formData.date,
      time: formData.time,
      bedrooms: formData.bedrooms,
      bathrooms: formData.bathrooms,
      additionalServices: formData.additionalServices,
      specialInstructions: formData.specialInstructions,
      bookingId: booking?.id
    });

    // Log WhatsApp results
    console.log('WhatsApp notification results:', {
      customerSuccess: whatsappResult.customerSuccess,
      adminSuccess: whatsappResult.adminSuccess,
      customerError: whatsappResult.customerError,
      adminError: whatsappResult.adminError
    });

    // Determine response message based on whether customer is returning
    let responseMessage = 'Booking submitted successfully! We will contact you soon to confirm your appointment.';
    let isReturningCustomer = false;
    
    if (existingCustomer) {
      isReturningCustomer = true;
      
      // Personalized message based on number of previous bookings
      if (previousBookingsCount === 1) {
        responseMessage = `Welcome back, ${formData.name}! 🎉 Thank you for choosing SkyView Cleaning Services again. We're excited to serve you once more and will contact you soon to confirm your appointment.`;
      } else if (previousBookingsCount === 2) {
        responseMessage = `Welcome back, ${formData.name}! 🌟 You're becoming a regular with us! Thank you for your continued trust in SkyView Cleaning Services. We'll contact you soon to confirm your appointment.`;
      } else {
        responseMessage = `Welcome back, ${formData.name}! 🏆 You're one of our valued regular customers! Thank you for your loyalty to SkyView Cleaning Services. We'll contact you soon to confirm your appointment.`;
      }
    }

    if (emailResponse.success) {
      return NextResponse.json({ 
        success: true, 
        message: responseMessage,
        bookingId: booking?.id,
        isReturningCustomer: isReturningCustomer,
        previousBookings: previousBookingsCount,
        whatsappNotifications: {
          customerSent: whatsappResult.customerSuccess,
          adminSent: whatsappResult.adminSuccess,
          customerError: whatsappResult.customerError,
          adminError: whatsappResult.adminError
        }
      });
    } else {
      // If email fails but database succeeded, still return success
      if (booking) {
        return NextResponse.json({ 
          success: true, 
          message: responseMessage,
          bookingId: booking.id,
          isReturningCustomer: isReturningCustomer,
          previousBookings: previousBookingsCount,
          whatsappNotifications: {
            customerSent: whatsappResult.customerSuccess,
            adminSent: whatsappResult.adminSuccess,
            customerError: whatsappResult.customerError,
            adminError: whatsappResult.adminError
          }
        });
      }
      throw new Error('Failed to send email and save booking');
    }

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

// Email sending function using EmailJS
async function sendEmail(emailData: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  try {
    // For production, you should use a proper email service
    // Here are some options:
    
    // Option 1: SendGrid (recommended for production)
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // await sgMail.send(emailData);
    
    // Option 2: Nodemailer with SMTP
    // const nodemailer = require('nodemailer');
    // const transporter = nodemailer.createTransporter({
    //   host: process.env.SMTP_HOST,
    //   port: process.env.SMTP_PORT,
    //   secure: true,
    //   auth: {
    //     user: process.env.SMTP_USER,
    //     pass: process.env.SMTP_PASS,
    //   },
    // });
    // await transporter.sendMail(emailData);
    
    // Option 3: AWS SES
    // const AWS = require('aws-sdk');
    // const ses = new AWS.SES();
    // await ses.sendEmail(emailData).promise();
    
    // For now, we'll log the email data and simulate success
    // In production, replace this with one of the above options
    console.log('=== EMAIL WOULD BE SENT ===');
    console.log('To:', emailData.to);
    console.log('Subject:', emailData.subject);
    console.log('Content:', emailData.text);
    console.log('==========================');
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return { success: true };
    
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error };
  }
}
