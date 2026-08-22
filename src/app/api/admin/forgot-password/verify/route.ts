import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { hashOtp, MAX_ATTEMPTS } from '@/lib/otp';

// A function, not a shared constant — a NextResponse's body stream can only
// be consumed once, so reusing one instance across requests would leave
// every call after the first returning an empty body.
const invalidCodeResponse = () =>
  NextResponse.json({ success: false, message: 'Invalid or expired code.' }, { status: 400 });

export async function POST(request: NextRequest) {
  try {
    const { username, otp, newPassword } = await request.json();

    if (!username || !otp || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'Username, code, and new password are required.' },
        { status: 400 }
      );
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 8 characters.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return invalidCodeResponse();
    }

    const record = await prisma.passwordResetOtp.findFirst({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) {
      return invalidCodeResponse();
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { success: false, message: 'Too many attempts. Please request a new code.' },
        { status: 400 }
      );
    }

    await prisma.passwordResetOtp.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });

    if (hashOtp(otp) !== record.codeHash) {
      return invalidCodeResponse();
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } }),
      prisma.passwordResetOtp.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);

    return NextResponse.json({ success: true, message: 'Password reset successfully.' });
  } catch (error) {
    console.error('Forgot-password verify error:', error);
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
