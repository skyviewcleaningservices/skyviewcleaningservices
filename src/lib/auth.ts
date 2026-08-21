import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export interface AdminTokenPayload {
  userId: number;
  username: string;
  role: 'ADMIN' | 'STAFF' | 'MANAGER';
}

export function signAdminToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '1h' });
}

export function verifyAdminToken(request: NextRequest): AdminTokenPayload | null {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;

  try {
    return jwt.verify(header.slice(7), process.env.JWT_SECRET!) as unknown as AdminTokenPayload;
  } catch {
    return null;
  }
}

// Route-handler guard: any signed-in user (ADMIN/MANAGER/STAFF) — for read-only
// endpoints the crew view also needs, like the booking list.
export function requireAuth(request: NextRequest): AdminTokenPayload | NextResponse {
  const payload = verifyAdminToken(request);
  if (!payload) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }
  return payload;
}

// Route-handler guard: ADMIN or MANAGER only — for anything that manages data
// (users, pricing, booking edits, reminders). STAFF is read-only by design.
export function requireAdminOrManager(request: NextRequest): AdminTokenPayload | NextResponse {
  const payload = verifyAdminToken(request);
  if (!payload) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }
  if (payload.role !== 'ADMIN' && payload.role !== 'MANAGER') {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
  }
  return payload;
}

export function isAdminPayload(value: AdminTokenPayload | NextResponse): value is AdminTokenPayload {
  return !(value instanceof NextResponse);
}
