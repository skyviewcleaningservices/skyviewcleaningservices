import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateOtp, hashOtp, OTP_EXPIRY_MINUTES, RESEND_COOLDOWN_SECONDS } from '@/lib/otp';
import WhatsAppBusinessAPI from '@/lib/whatsapp';
import EmailService from '@/lib/email';

// A function, not a shared constant — a NextResponse's body stream can only
// be consumed once, so reusing one instance across requests would leave
// every call after the first returning an empty body.
const genericResponse = () =>
  NextResponse.json({
    success: true,
    message: 'If that account exists and has this contact method on file, a code has been sent.',
  });

export async function POST(request: NextRequest) {
  try {
    const { username, channel } = await request.json();

    if (!username || (channel !== 'EMAIL' && channel !== 'WHATSAPP')) {
      return NextResponse.json(
        { success: false, message: 'Username and a valid channel are required.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { username } });

    // Same response whether the user exists or not, or has the channel
    // configured or not — never reveal account existence to an unauthenticated caller.
    const target = channel === 'EMAIL' ? user?.email : user?.phone;
    if (!user || !target) {
      return genericResponse();
    }

    // DB-backed cooldown — works correctly across separate serverless
    // invocations, unlike an in-memory rate limiter would on Vercel.
    const recent = await prisma.passwordResetOtp.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    if (recent && Date.now() - recent.createdAt.getTime() < RESEND_COOLDOWN_SECONDS * 1000) {
      return genericResponse();
    }

    const code = generateOtp();
    await prisma.passwordResetOtp.create({
      data: {
        userId: user.id,
        codeHash: hashOtp(code),
        channel,
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
      },
    });

    try {
      if (channel === 'EMAIL') {
        await EmailService.getInstance().sendOtpEmail(target, code);
      } else {
        await WhatsAppBusinessAPI.getInstance().sendTestMessage(
          target,
          `Your SkyView admin password reset code is ${code}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`
        );
      }
    } catch (sendError) {
      // Logged, not surfaced — the response stays generic either way.
      console.error('Error sending OTP:', sendError);
    }

    return genericResponse();
  } catch (error) {
    console.error('Forgot-password request error:', error);
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
