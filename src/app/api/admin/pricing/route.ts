import { NextRequest, NextResponse } from 'next/server';
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

// PATCH - update one or more rate/add-on prices
export async function PATCH(request: NextRequest) {
  try {
    const { rates, addOns } = await request.json() as {
      rates?: { id: number; price: number | null }[];
      addOns?: { id: number; price: number | null }[];
    };

    await Promise.all([
      ...(rates ?? []).map(({ id, price }) =>
        prisma.priceRate.update({ where: { id }, data: { price } })
      ),
      ...(addOns ?? []).map(({ id, price }) =>
        prisma.addOnPrice.update({ where: { id }, data: { price } })
      ),
    ]);

    const [updatedRates, updatedAddOns] = await Promise.all([
      prisma.priceRate.findMany(),
      prisma.addOnPrice.findMany(),
    ]);

    return NextResponse.json({ success: true, rates: updatedRates, addOns: updatedAddOns });
  } catch (error) {
    console.error('Error updating pricing:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update pricing' },
      { status: 500 }
    );
  }
}
