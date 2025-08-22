import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';

// GET - Get specific user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: number }> }
) {
  try {
    const { id } = await params;
    
    const user = await prisma.user.findUnique({
      where: { id: id as any }, 
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true
        // Don't include password for security
      }
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch user'
    }, { status: 500 });
  }
}

// PATCH - Update user
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { username, password, role } = await request.json();

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: id as any }
    });

    if (!existingUser) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    // Prepare update data
    const updateData: {
      username?: string;
      password?: string;
      role?: 'ADMIN' | 'STAFF' | 'MANAGER';
    } = {};
    if (username) updateData.username = username;
    if (password && password.trim() !== '') updateData.password = password;
    if (role && ['ADMIN', 'STAFF', 'MANAGER'].includes(role)) {
      updateData.role = role as 'ADMIN' | 'STAFF' | 'MANAGER';
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: id as any },
      data: updateData,
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
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update user'
    }, { status: 500 });
  }
}

// DELETE - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: id as any }
    });

    if (!existingUser) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    // Prevent deleting the last admin user
    if (existingUser.role === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN' }
      });
      
      if (adminCount <= 1) {
        return NextResponse.json({
          success: false,
          message: 'Cannot delete the last admin user'
        }, { status: 400 });
      }
    }

    // Delete user
    await prisma.user.delete({
      where: { id: id as any }
    });

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to delete user'
    }, { status: 500 });
  }
}
