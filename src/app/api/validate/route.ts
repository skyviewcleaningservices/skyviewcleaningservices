import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { email, phone } = await request.json();

    // Initialize validation result with defaults
    const validationResult = {
      email: { exists: false, message: "" },
      phone: { exists: false, message: "" },
    };

    // Early exit if no data provided
    if (!email && !phone) {
      return NextResponse.json({
        success: true,
        validation: validationResult,
        isReturningCustomer: false,
        message: "No validation data provided",
      });
    }

    try {
      // Build dynamic conditions only if values exist
      const conditions = [];
      if (email) conditions.push({ email: email.trim() });
      if (phone) conditions.push({ phone: phone.trim() });

      const existingCustomer = await prisma.booking.findFirst({
        where: { OR: conditions },
        orderBy: { createdAt: "desc" },
      });

      if (existingCustomer) {
        if (email && existingCustomer.email === email.trim()) {
          validationResult.email = {
            exists: true,
            message: "Welcome back! We found a previous booking with this email.",
          };
        }
        if (phone && existingCustomer.phone === phone.trim()) {
          validationResult.phone = {
            exists: true,
            message: "Welcome back! We found a previous booking with this phone number.",
          };
        }
      }
    } catch (dbError) {
      console.error("Database validation error:", dbError);
      // Safe to continue with default validationResult
    }

    return NextResponse.json({
      success: true,
      validation: validationResult,
      isReturningCustomer:
        validationResult.email.exists || validationResult.phone.exists,
    });
  } catch (error) {
    console.error("Validation error:", error);

    // Return fallback response
    return NextResponse.json({
      success: true,
      validation: {
        email: { exists: false, message: "" },
        phone: { exists: false, message: "" },
      },
      isReturningCustomer: false,
      message: "Validation completed with default values",
    });
  }
}
