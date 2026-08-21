import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminOrManager, isAdminPayload } from '@/lib/auth';
import EmailService from '@/lib/email';

export async function POST(request: NextRequest) {
  const auth = requireAdminOrManager(request);
  if (!isAdminPayload(auth)) return auth;

  try {
    const { bookingId } = await request.json();

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }
    if (!booking.email) {
      return NextResponse.json({ success: false, message: 'This customer has no email on file' }, { status: 400 });
    }

    const emailService = EmailService.getInstance();
    if (!emailService.isConfigured()) {
      return NextResponse.json({ success: false, message: 'Email is not configured' }, { status: 503 });
    }

    const result = await emailService.sendReminderEmail({
      to: booking.email,
      name: booking.name,
      serviceType: booking.serviceType,
      lastCleanDate: booking.preferredDate,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.error || 'Failed to send reminder' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Reminder sent' });
  } catch (error) {
    console.error('Error sending reminder:', error);
    return NextResponse.json({ success: false, message: 'Failed to send reminder' }, { status: 500 });
  }
}
