import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminOrManager, isAdminPayload } from '@/lib/auth';

const SALARY_TYPES = ['MONTHLY', 'DAILY', 'PER_JOB'];

// GET - List all employees. Restricted to ADMIN/MANAGER (not STAFF) — this
// record holds sensitive PII (Aadhar/PAN), not general operational data.
export async function GET(request: NextRequest) {
  const auth = requireAdminOrManager(request);
  if (!isAdminPayload(auth)) return auth;

  try {
    const employees = await prisma.employee.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, employees });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}

// POST - Add a new employee
export async function POST(request: NextRequest) {
  const auth = requireAdminOrManager(request);
  if (!isAdminPayload(auth)) return auth;

  try {
    const data = await request.json();

    if (!data.name || !data.phone) {
      return NextResponse.json(
        { success: false, message: 'Name and phone are required' },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        address: data.address || null,
        role: data.role || null,
        aadharNumber: data.aadharNumber || null,
        panNumber: data.panNumber || null,
        emergencyContactName: data.emergencyContactName || null,
        emergencyContactPhone: data.emergencyContactPhone || null,
        joiningDate: data.joiningDate ? new Date(data.joiningDate) : null,
        salaryAmount: data.salaryAmount !== undefined && data.salaryAmount !== ''
          ? parseFloat(data.salaryAmount) : null,
        salaryType: SALARY_TYPES.includes(data.salaryType) ? data.salaryType : null,
        status: data.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Employee added successfully',
      employee,
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create employee' },
      { status: 500 }
    );
  }
}
