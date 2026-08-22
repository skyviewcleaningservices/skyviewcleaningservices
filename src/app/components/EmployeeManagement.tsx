'use client';

import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/tokenUtils';
import ConfirmDialog from './ConfirmDialog';
import Toast, { type ToastState } from './Toast';

interface Employee {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  role: string | null;
  aadharNumber: string | null;
  panNumber: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  joiningDate: string | null;
  salaryAmount: number | null;
  salaryType: 'MONTHLY' | 'DAILY' | 'PER_JOB' | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

interface EmployeeFormData {
  name: string;
  phone: string;
  email: string;
  address: string;
  role: string;
  aadharNumber: string;
  panNumber: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  joiningDate: string;
  salaryAmount: string;
  salaryType: 'MONTHLY' | 'DAILY' | 'PER_JOB' | '';
  status: 'ACTIVE' | 'INACTIVE';
}

const SALARY_TYPE_LABELS: Record<string, string> = {
  MONTHLY: '/ month',
  DAILY: '/ day',
  PER_JOB: '/ job',
};

const EMPTY_FORM: EmployeeFormData = {
  name: '',
  phone: '',
  email: '',
  address: '',
  role: '',
  aadharNumber: '',
  panNumber: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  joiningDate: '',
  salaryAmount: '',
  salaryType: '',
  status: 'ACTIVE',
};

// Shows only the last 4 characters — the full number is only ever visible in
// the edit form, not the list view.
const mask = (value: string | null) => {
  if (!value) return '—';
  const visible = value.slice(-4);
  return `${'•'.repeat(Math.max(value.length - 4, 0))}${visible}`;
};

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await authFetch('/api/admin/employees');
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees);
      } else {
        setError('Failed to fetch employees');
      }
    } catch (err) {
      setError('Error fetching employees');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof EmployeeFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.phone.trim()) {
      setToast({ message: 'Name and phone are required', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const url = editingEmployee ? `/api/admin/employees/${editingEmployee.id}` : '/api/admin/employees';
      const method = editingEmployee ? 'PATCH' : 'POST';

      const response = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        setToast({ message: data.message, type: 'success' });
        setShowAddForm(false);
        setEditingEmployee(null);
        setFormData(EMPTY_FORM);
        fetchEmployees();
      } else {
        const errorData = await response.json();
        setToast({ message: errorData.message, type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Error saving employee. Please try again.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      phone: employee.phone,
      email: employee.email || '',
      address: employee.address || '',
      role: employee.role || '',
      aadharNumber: employee.aadharNumber || '',
      panNumber: employee.panNumber || '',
      emergencyContactName: employee.emergencyContactName || '',
      emergencyContactPhone: employee.emergencyContactPhone || '',
      joiningDate: employee.joiningDate ? employee.joiningDate.slice(0, 10) : '',
      salaryAmount: employee.salaryAmount !== null ? String(employee.salaryAmount) : '',
      salaryType: employee.salaryType || '',
      status: employee.status,
    });
    setShowAddForm(true);
  };

  const handleDelete = async () => {
    if (!deletingEmployee) return;

    setIsDeleting(true);
    try {
      const response = await authFetch(`/api/admin/employees/${deletingEmployee.id}`, { method: 'DELETE' });
      if (response.ok) {
        const data = await response.json();
        setToast({ message: data.message, type: 'success' });
        setDeletingEmployee(null);
        fetchEmployees();
      } else {
        const errorData = await response.json();
        setToast({ message: errorData.message, type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Error deleting employee', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  if (loading) return <div className="text-center py-4">Loading employees...</div>;
  if (error) return <div className="text-red-600 text-center py-4">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Employee Management</h2>
          <p className="text-sm text-gray-500 mt-1">
            Aadhar and PAN numbers are masked in this list — full details are only shown when editing a record.
          </p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(true);
            setEditingEmployee(null);
            setFormData(EMPTY_FORM);
          }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Add Employee
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <input
                  type="text"
                  placeholder="e.g. Cleaner, Supervisor"
                  value={formData.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea
                rows={2}
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700"
              />
            </div>

            <div className="border-t pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Identity documents</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aadhar Number</label>
                  <input
                    type="text"
                    placeholder="12-digit Aadhar number"
                    value={formData.aadharNumber}
                    onChange={(e) => handleInputChange('aadharNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PAN Card Number</label>
                  <input
                    type="text"
                    placeholder="e.g. ABCDE1234F"
                    value={formData.panNumber}
                    onChange={(e) => handleInputChange('panNumber', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Emergency contact</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={formData.emergencyContactName}
                    onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={formData.emergencyContactPhone}
                    onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Salary</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salary Amount</label>
                  <input
                    type="text"
                    placeholder="e.g. 15000"
                    value={formData.salaryAmount}
                    onChange={(e) => handleInputChange('salaryAmount', e.target.value.replace(/[^0-9.]/g, ''))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salary Type</label>
                  <select
                    value={formData.salaryType}
                    onChange={(e) => handleInputChange('salaryType', e.target.value as EmployeeFormData['salaryType'])}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700"
                  >
                    <option value="">Select type</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="DAILY">Daily</option>
                    <option value="PER_JOB">Per Job</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date</label>
                <input
                  type="date"
                  value={formData.joiningDate}
                  onChange={(e) => handleInputChange('joiningDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value as 'ACTIVE' | 'INACTIVE')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingEmployee ? 'Update Employee' : 'Add Employee'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingEmployee(null);
                  setFormData(EMPTY_FORM);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Employees ({employees.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-indigo-50/70">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-indigo-900/80 uppercase tracking-wider border-b-2 border-indigo-100">Name</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-indigo-900/80 uppercase tracking-wider border-b-2 border-indigo-100">Role</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-indigo-900/80 uppercase tracking-wider border-b-2 border-indigo-100">Joined</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-indigo-900/80 uppercase tracking-wider border-b-2 border-indigo-100">Aadhar</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-indigo-900/80 uppercase tracking-wider border-b-2 border-indigo-100">PAN</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-indigo-900/80 uppercase tracking-wider border-b-2 border-indigo-100 w-48">Emergency Contact</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-indigo-900/80 uppercase tracking-wider border-b-2 border-indigo-100">Salary</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-indigo-900/80 uppercase tracking-wider border-b-2 border-indigo-100">Status</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-indigo-900/80 uppercase tracking-wider border-b-2 border-indigo-100">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100">
              {employees.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-sm text-gray-500">
                    No employees added yet.
                  </td>
                </tr>
              )}
              {employees.map((employee) => (
                <tr key={employee.id} className="odd:bg-white even:bg-gray-50/60 hover:bg-indigo-50/60 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                    <div className="text-sm text-gray-500">{employee.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{employee.role || '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(employee.joiningDate)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{mask(employee.aadharNumber)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{mask(employee.panNumber)}</td>
                  <td className="px-6 py-4 w-48 text-sm text-gray-500 break-words">
                    {employee.emergencyContactName || '—'}
                    {employee.emergencyContactPhone && (
                      <span className="text-gray-400"> · {employee.emergencyContactPhone}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {employee.salaryAmount !== null
                      ? `₹${employee.salaryAmount.toLocaleString('en-IN')} ${employee.salaryType ? SALARY_TYPE_LABELS[employee.salaryType] : ''}`
                      : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      employee.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {employee.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button onClick={() => handleEdit(employee)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                      <button onClick={() => setDeletingEmployee(employee)} className="text-red-600 hover:text-red-900">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deletingEmployee}
        title="Delete Employee?"
        message={`${deletingEmployee?.name}'s record will be permanently deleted.`}
        isConfirming={isDeleting}
        onCancel={() => setDeletingEmployee(null)}
        onConfirm={handleDelete}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
