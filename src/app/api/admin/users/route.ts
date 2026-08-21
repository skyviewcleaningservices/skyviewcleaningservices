import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminOrManager, isAdminPayload } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// GET - List all users
export async function GET(request: NextRequest) {
  const auth = requireAdminOrManager(request);
  if (!isAdminPayload(auth)) return auth;

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true
        // Don't include password for security
      }
    });

    return NextResponse.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch users'
    }, { status: 500 });
  }
}

// POST - Create new user
export async function POST(request: NextRequest) {
  const auth = requireAdminOrManager(request);
  if (!isAdminPayload(auth)) return auth;

  try {
    const { username, password, role = 'STAFF' } = await request.json();

    // Validate input
    if (!username || !password) {
      return NextResponse.json({
        success: false,
        message: 'Username and password are required'
      }, { status: 400 });
    }

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUser) {
      return NextResponse.json({
        success: false,
        message: 'Username already exists'
      }, { status: 400 });
    }

    // Create new user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role
      },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: newUser
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create user'
    }, { status: 500 });
  }
}
