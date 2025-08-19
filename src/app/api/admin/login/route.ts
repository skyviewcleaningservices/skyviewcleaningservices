import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // Validate input
    if (!username || !password) {
      return NextResponse.json({
        success: false,
        message: 'Username and password are required'
      }, { status: 400 });
    }

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'Invalid credentials'
      }, { status: 401 });
    }

    // For now, using simple password comparison
    // In production, you should use bcrypt or similar for password hashing
    if (user.password !== password) {

      return NextResponse.json({
        success: false,
        message: "Invalid credentials"
      }, { status: 401 });
    }

    // Create a simple session token (in production, use JWT)
    const sessionToken = `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Login successful
    return NextResponse.json({
      success: true,
      message: 'Login successful',
      token: sessionToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({
      success: false,
      message: 'Login failed'
    }, { status: 500 });
  }
}
