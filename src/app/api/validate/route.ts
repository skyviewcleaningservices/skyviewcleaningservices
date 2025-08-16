import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { email, phone } = await request.json();
    
    let existingCustomer = null;
    let validationResult = {
      email: { exists: false, message: '' },
      phone: { exists: false, message: '' }
    };

    // Check for existing customer by email or phone
    if (email || phone) {
      existingCustomer = await prisma.booking.findFirst({
        where: {
          OR: [
            ...(email ? [{ email }] : []),
            ...(phone ? [{ phone }] : [])
          ]
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (existingCustomer) {
        // Check email specifically
        if (email && existingCustomer.email === email) {
          validationResult.email = {
            exists: true,
            message: `Welcome back! We found a previous booking with this email.`
          };
        }

        // Check phone specifically
        if (phone && existingCustomer.phone === phone) {
          validationResult.phone = {
            exists: true,
            message: `Welcome back! We found a previous booking with this phone number.`
          };
        }
      }
    }

    return NextResponse.json({
      success: true,
      validation: validationResult,
      isReturningCustomer: existingCustomer !== null
    });

  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to validate customer information' 
      },
      { status: 500 }
    );
  }
}
