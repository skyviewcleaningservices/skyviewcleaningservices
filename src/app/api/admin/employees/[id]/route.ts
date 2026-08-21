import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminOrManager, isAdminPayload } from '@/lib/auth';

// GET - Get a specific employee
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAdminOrManager(request);
  if (!isAdminPayload(auth)) return auth;

  try {
    const { id } = await params;
    const employee = await prisma.employee.findUnique({ where: { id: parseInt(id) } });

    if (!employee) {
      return NextResponse.json({ success: false, message: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, employee });
  } catch (error) {
    console.error('Error fetching employee:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch employee' }, { status: 500 });
  }
}

// PATCH - Update an employee
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAdminOrManager(request);
  if (!isAdminPayload(auth)) return auth;

  try {
    const { id } = await params;
    const data = await request.json();

    const existing = await prisma.employee.findUnique({ where: { id: parseInt(id) } });
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Employee not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const stringFields = [
      'name', 'phone', 'email', 'address', 'role',
      'aadharNumber', 'panNumber', 'emergencyContactName', 'emergencyContactPhone',
    ];
    for (const field of stringFields) {
      if (data[field] !== undefined) updateData[field] = data[field] || null;
    }
    if (data.joiningDate !== undefined) {
      updateData.joiningDate = data.joiningDate ? new Date(data.joiningDate) : null;
    }
    if (data.status === 'ACTIVE' || data.status === 'INACTIVE') {
      updateData.status = data.status;
    }

    const employee = await prisma.employee.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    return NextResponse.json({ success: true, message: 'Employee updated successfully', employee });
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json({ success: false, message: 'Failed to update employee' }, { status: 500 });
  }
}

// DELETE - Remove an employee
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAdminOrManager(request);
  if (!isAdminPayload(auth)) return auth;

  try {
    const { id } = await params;

    const existing = await prisma.employee.findUnique({ where: { id: parseInt(id) } });
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Employee not found' }, { status: 404 });
    }

    await prisma.employee.delete({ where: { id: parseInt(id) } });

    return NextResponse.json({ success: true, message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    return NextResponse.json({ success: false, message: 'Failed to delete employee' }, { status: 500 });
  }
}
