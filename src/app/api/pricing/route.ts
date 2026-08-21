import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [rates, addOns] = await Promise.all([
      prisma.priceRate.findMany(),
      prisma.addOnPrice.findMany(),
    ]);

    return NextResponse.json({ success: true, rates, addOns });
  } catch (error) {
    console.error('Error fetching pricing:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch pricing' },
      { status: 500 }
    );
  }
}
