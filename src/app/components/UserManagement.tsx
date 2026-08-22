'use client';

import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/tokenUtils';
import ConfirmDialog from './ConfirmDialog';
import Toast, { type ToastState } from './Toast';

interface User {
  id: number;
  username: string;
  email: string | null;
  phone: string | null;
  role: 'ADMIN' | 'STAFF' | 'MANAGER';
  createdAt: string;
  updatedAt: string;
}

interface UserFormData {
  username: string;
  password: string;
  email: string;
  phone: string;
  role: 'ADMIN' | 'STAFF' | 'MANAGER';
}

const EMPTY_FORM: UserFormData = { username: '', password: '', email: '', phone: '', role: 'STAFF' };

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [formData, setFormData] = useState<UserFormData>(EMPTY_FORM);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await authFetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      } else {
        setError('Failed to fetch users');
      }
    } catch (err) {
      setError('Error fetching users');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof UserFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.username.trim()) {
      setToast({ message: 'Username is required', type: 'error' });
      return;
    }

    if (!editingUser && !formData.password.trim()) {
      setToast({ message: 'Password is required for new users', type: 'error' });
      return;
    }
    
    try {
      const url = editingUser 
        ? `/api/admin/users/${editingUser.id}`
        : '/api/admin/users';
      
      const method = editingUser ? 'PATCH' : 'POST';
      
      // Prepare data to send
      const dataToSend: Partial<UserFormData> = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        role: formData.role
      };

      // Only include password if it's not empty (for new users or when updating)
      if (formData.password.trim()) {
        dataToSend.password = formData.password;
      }

      const response = await authFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (response.ok) {
        const data = await response.json();
        setToast({ message: data.message, type: 'success' });
        setShowAddForm(false);
        setEditingUser(null);
        setFormData(EMPTY_FORM);
        fetchUsers();
      } else {
        const errorData = await response.json();
        setToast({ message: errorData.message, type: 'error' });
      }
    } catch (err) {
      console.error('Error saving user:', err);
      setToast({ message: 'Error saving user. Please try again.', type: 'error' });
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role
    });
    setShowAddForm(true);
  };

  const handleDelete = async () => {
    if (!deletingUser) return;

    setIsDeleting(true);
    try {
      const response = await authFetch(`/api/admin/users/${deletingUser.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        setToast({ message: data.message, type: 'success' });
        setDeletingUser(null);
        fetchUsers();
      } else {
        const errorData = await response.json();
        setToast({ message: errorData.message, type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Error deleting user', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      case 'MANAGER': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'STAFF': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  if (loading) {
    return <div className="text-center py-4 text-muted">Loading users...</div>;
  }

  if (error) {
    return <div className="text-red-600 dark:text-red-400 text-center py-4">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-heading">User Management</h2>
        <button
          onClick={() => {
            setShowAddForm(true);
            setEditingUser(null);
            setFormData(EMPTY_FORM);
          }}
          className="btn-primary"
        >
          Add New User
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="panel p-6">
          <h3 className="text-lg font-medium text-heading mb-4">
            {editingUser ? 'Edit User' : 'Add New User'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="field-label mb-2">
                Username
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                required
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label mb-2">
                Password {editingUser && '(leave blank to keep current)'}
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                required={!editingUser}
                minLength={8}
                className="field-input"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="field-label mb-2">
                  Email <span className="text-subtle font-normal normal-case">(for forgot-password)</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="field-input"
                />
              </div>
              <div>
                <label className="field-label mb-2">
                  Phone <span className="text-subtle font-normal normal-case">(for forgot-password)</span>
                </label>
                <input
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="field-input"
                />
              </div>
            </div>
            <div>
              <label className="field-label mb-2">
                Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value as 'ADMIN' | 'STAFF' | 'MANAGER')}
                className="field-input"
              >
                <option value="STAFF">Staff</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                {editingUser ? 'Update User' : 'Create User'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingUser(null);
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

      {/* Users Table */}
      <div className="panel-table">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-heading">Users</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-indigo-50/70 dark:bg-indigo-950/40">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-indigo-900/80 dark:text-indigo-300 uppercase tracking-wider border-b-2 border-indigo-100 dark:border-indigo-900/50">
                  Username
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-indigo-900/80 dark:text-indigo-300 uppercase tracking-wider border-b-2 border-indigo-100 dark:border-indigo-900/50">
                  Role
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-indigo-900/80 dark:text-indigo-300 uppercase tracking-wider border-b-2 border-indigo-100 dark:border-indigo-900/50">
                  Contact
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-indigo-900/80 dark:text-indigo-300 uppercase tracking-wider border-b-2 border-indigo-100 dark:border-indigo-900/50">
                  Created
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-indigo-900/80 dark:text-indigo-300 uppercase tracking-wider border-b-2 border-indigo-100 dark:border-indigo-900/50">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="table-body">
              {users.map((user) => (
                <tr key={user.id} className="odd:bg-white dark:odd:bg-gray-800 even:bg-gray-50/60 dark:even:bg-gray-900/30 hover:bg-indigo-50/60 dark:hover:bg-indigo-900/20 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-heading">
                    {user.username}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
                    {user.email || user.phone ? (
                      <>
                        {user.email && <div>{user.email}</div>}
                        {user.phone && <div>{user.phone}</div>}
                      </>
                    ) : (
                      <span className="text-subtle">Not set</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeletingUser(user)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deletingUser}
        title="Delete User?"
        message={`"${deletingUser?.username}" will be permanently deleted.`}
        isConfirming={isDeleting}
        onCancel={() => setDeletingUser(null)}
        onConfirm={handleDelete}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
