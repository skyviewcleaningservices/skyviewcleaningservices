'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { authFetch } from '@/lib/tokenUtils';

interface Employee {
  id: number;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  salaryAmount: number | null;
  salaryType: 'MONTHLY' | 'DAILY' | 'PER_JOB' | null;
}

interface AttendanceRecord {
  employeeId: number;
  date: string;
}

interface AdvanceRecord {
  employeeId: number;
  amount: number;
}

const SALARY_TYPE_LABELS: Record<string, string> = {
  MONTHLY: 'Monthly',
  DAILY: 'Daily',
  PER_JOB: 'Per Job',
};

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// "2026-08" -> "August 2026"
const formatMonthLabel = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const key = (employeeId: number, day: number) => `${employeeId}-${day}`;

export default function AttendanceView() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [presentDays, setPresentDays] = useState<Set<string>>(new Set());
  const [advances, setAdvances] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savingAdvanceFor, setSavingAdvanceFor] = useState<number | null>(null);
  const [unlockedForEdit, setUnlockedForEdit] = useState(false);
  const [advancesUnlocked, setAdvancesUnlocked] = useState(false);

  const [year, month] = selectedMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const dayNumbers = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

  // Only today's checkbox is editable without unlocking — every other day
  // (past or future) is locked by default, so attendance can't be marked
  // ahead of time or rewritten in passing while scrolling the grid.
  const isLockedDay = useCallback((day: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cellDate = new Date(year, month - 1, day);
    return cellDate.getTime() !== today.getTime();
  }, [year, month]);

  const hasLockedDays = dayNumbers.some(isLockedDay);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [employeesRes, attendanceRes, advancesRes] = await Promise.all([
        authFetch('/api/admin/employees'),
        authFetch(`/api/admin/attendance?month=${selectedMonth}`),
        authFetch(`/api/admin/advances?month=${selectedMonth}`),
      ]);

      if (!employeesRes.ok || !attendanceRes.ok || !advancesRes.ok) throw new Error('Failed to load');

      const employeesData = await employeesRes.json();
      const attendanceData = await attendanceRes.json();
      const advancesData = await advancesRes.json();

      setEmployees(employeesData.employees);

      const days = new Set<string>();
      for (const record of attendanceData.records as AttendanceRecord[]) {
        const day = new Date(record.date).getUTCDate();
        days.add(key(record.employeeId, day));
      }
      setPresentDays(days);

      const advanceMap: Record<number, string> = {};
      for (const advance of advancesData.advances as AdvanceRecord[]) {
        advanceMap[advance.employeeId] = String(advance.amount);
      }
      setAdvances(advanceMap);
    } catch (err) {
      setError('Error loading attendance data');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleDay = async (employeeId: number, day: number) => {
    const k = key(employeeId, day);
    const wasPresent = presentDays.has(k);
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    setSavingKey(k);
    setPresentDays(prev => {
      const next = new Set(prev);
      if (wasPresent) next.delete(k);
      else next.add(k);
      return next;
    });

    try {
      const res = await authFetch('/api/admin/attendance', {
        method: wasPresent ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, date: dateStr }),
      });
      if (!res.ok) throw new Error('Failed');
    } catch (err) {
      // Roll back on failure
      setPresentDays(prev => {
        const next = new Set(prev);
        if (wasPresent) next.add(k);
        else next.delete(k);
        return next;
      });
    } finally {
      setSavingKey(null);
    }
  };

  const daysWorked = (employeeId: number) =>
    dayNumbers.filter(day => presentDays.has(key(employeeId, day))).length;

  const calculateSalary = (employee: Employee, worked: number): number | null => {
    if (!employee.salaryAmount) return null;
    // Prorated against a flat 30-day month, not the actual days in the
    // selected month — matches the per-day rate this business already uses.
    if (employee.salaryType === 'MONTHLY') return Math.round((employee.salaryAmount / 30) * worked);
    if (employee.salaryType === 'DAILY') return employee.salaryAmount * worked;
    return null; // Per Job isn't derivable from day-level attendance alone
  };

  const handleAdvanceChange = (employeeId: number, value: string) => {
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) return;
    setAdvances(prev => ({ ...prev, [employeeId]: value }));
  };

  const persistAdvance = async (employeeId: number, amount: number) => {
    setSavingAdvanceFor(employeeId);
    try {
      await authFetch('/api/admin/advances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, month: selectedMonth, amount }),
      });
    } catch (err) {
      // Leave the typed value as-is — worst case it re-saves next blur
    } finally {
      setSavingAdvanceFor(null);
    }
  };

  const saveAdvance = (employeeId: number) => {
    const amount = parseFloat(advances[employeeId] || '0') || 0;
    persistAdvance(employeeId, amount);
  };

  const addToAdvance = (employeeId: number, delta: number) => {
    const current = parseFloat(advances[employeeId] || '0') || 0;
    const next = current + delta;
    setAdvances(prev => ({ ...prev, [employeeId]: String(next) }));
    persistAdvance(employeeId, next);
  };

  const activeEmployees = employees.filter(e => e.status === 'ACTIVE');

  if (loading) return <div className="text-center py-4 text-muted">Loading attendance...</div>;
  if (error) return <div className="text-red-600 dark:text-red-400 text-center py-4">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-heading">Attendance</h2>
          <p className="text-sm text-muted mt-1">Check a day to mark that employee as worked.</p>
        </div>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => {
            setSelectedMonth(e.target.value);
            setUnlockedForEdit(false);
            setAdvancesUnlocked(false);
          }}
          className="field-input w-auto"
        />
      </div>

      <div className="panel-table">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-heading">Daily Attendance</h3>
            {hasLockedDays && (
              <p className="text-xs text-muted mt-0.5">
                {unlockedForEdit ? 'All days are unlocked — click Save when done.' : 'Only today can be marked directly. Click Edit to change other days.'}
              </p>
            )}
          </div>
          {hasLockedDays && (
            <button
              onClick={() => setUnlockedForEdit(prev => !prev)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                unlockedForEdit ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50'
              }`}
            >
              {unlockedForEdit ? 'Save' : 'Edit'}
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-indigo-50/70 dark:bg-indigo-950/40">
              <tr>
                <th className="sticky left-0 bg-indigo-50/70 dark:bg-indigo-950/40 px-4 py-2.5 text-left text-xs font-semibold text-indigo-900/80 dark:text-indigo-300 uppercase tracking-wider whitespace-nowrap border-b-2 border-indigo-100 dark:border-indigo-900/50">
                  Employee
                </th>
                {dayNumbers.map(day => (
                  <th key={day} className="px-1.5 py-2.5 text-center text-xs font-medium text-indigo-900/60 dark:text-indigo-400/70 w-8 border-b-2 border-indigo-100 dark:border-indigo-900/50">
                    {day}
                  </th>
                ))}
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-indigo-900/80 dark:text-indigo-300 uppercase tracking-wider whitespace-nowrap border-b-2 border-indigo-100 dark:border-indigo-900/50">
                  Days Worked
                </th>
              </tr>
            </thead>
            <tbody className="table-body">
              {activeEmployees.length === 0 && (
                <tr>
                  <td colSpan={daysInMonth + 2} className="px-6 py-8 text-center text-sm text-muted">
                    No active employees to track.
                  </td>
                </tr>
              )}
              {activeEmployees.map(employee => (
                <tr key={employee.id} className="odd:bg-white dark:odd:bg-gray-800 even:bg-gray-50/60 dark:even:bg-gray-900/30 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/20 transition-colors">
                  <td className="sticky left-0 bg-inherit px-4 py-2 text-sm font-medium text-heading whitespace-nowrap">
                    {employee.name}
                  </td>
                  {dayNumbers.map(day => {
                    const k = key(employee.id, day);
                    const locked = isLockedDay(day) && !unlockedForEdit;
                    return (
                      <td key={day} className="px-1.5 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={presentDays.has(k)}
                          disabled={savingKey === k || locked}
                          onChange={() => toggleDay(employee.id, day)}
                          title={locked ? 'Click Edit to mark attendance for a day other than today' : undefined}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded disabled:opacity-50"
                        />
                      </td>
                    );
                  })}
                  <td className="px-4 py-2 text-center text-sm font-semibold text-heading">
                    {daysWorked(employee.id)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel-table">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-heading">Salary Calculation — {formatMonthLabel(selectedMonth)}</h3>
            <p className="text-xs text-muted mt-1">
              Monthly-rate staff are (monthly salary ÷ 30) × days worked; daily-rate staff are days worked × rate. Per Job isn&apos;t computed from attendance alone.
            </p>
          </div>
          <button
            onClick={() => setAdvancesUnlocked(prev => !prev)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap ${
              advancesUnlocked ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50'
            }`}
          >
            {advancesUnlocked ? 'Save' : 'Edit'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-indigo-50/70 dark:bg-indigo-950/40">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-indigo-900/80 dark:text-indigo-300 uppercase tracking-wider border-b-2 border-indigo-100 dark:border-indigo-900/50">Employee</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-indigo-900/80 dark:text-indigo-300 uppercase tracking-wider border-b-2 border-indigo-100 dark:border-indigo-900/50">Days Worked</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-indigo-900/80 dark:text-indigo-300 uppercase tracking-wider border-b-2 border-indigo-100 dark:border-indigo-900/50">Rate</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-indigo-900/80 dark:text-indigo-300 uppercase tracking-wider border-b-2 border-indigo-100 dark:border-indigo-900/50">Gross Salary</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-indigo-900/80 dark:text-indigo-300 uppercase tracking-wider border-b-2 border-indigo-100 dark:border-indigo-900/50">Advance Taken</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/50 border-b-2 border-indigo-200 dark:border-indigo-800">Total Pay</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {activeEmployees.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-muted">No active employees.</td>
                </tr>
              )}
              {activeEmployees.map(employee => {
                const worked = daysWorked(employee.id);
                const salary = calculateSalary(employee, worked);
                const advance = parseFloat(advances[employee.id] || '0') || 0;
                const totalPay = salary !== null ? salary - advance : null;
                return (
                  <tr key={employee.id} className="odd:bg-white dark:odd:bg-gray-800 even:bg-gray-50/60 dark:even:bg-gray-900/30 hover:bg-indigo-50/60 dark:hover:bg-indigo-900/20 transition-colors">
                    <td className="px-6 py-3 text-sm font-medium text-heading whitespace-nowrap">{employee.name}</td>
                    <td className="px-6 py-3 text-sm text-muted text-right tabular-nums">{worked}</td>
                    <td className="px-6 py-3 text-sm text-muted whitespace-nowrap">
                      {employee.salaryAmount
                        ? <span className="tabular-nums">₹{employee.salaryAmount.toLocaleString('en-IN')} <span className="text-subtle">({SALARY_TYPE_LABELS[employee.salaryType || ''] || '—'})</span></span>
                        : '—'}
                    </td>
                    <td className="px-6 py-3 text-sm text-muted text-right tabular-nums">
                      {salary !== null ? `₹${salary.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="px-6 py-3 text-sm text-muted">
                      <div className="flex items-center justify-end gap-2">
                        <input
                          type="text"
                          placeholder="0"
                          value={advances[employee.id] || ''}
                          onChange={(e) => handleAdvanceChange(employee.id, e.target.value)}
                          onBlur={() => saveAdvance(employee.id)}
                          readOnly={!advancesUnlocked}
                          disabled={savingAdvanceFor === employee.id}
                          title={!advancesUnlocked ? 'Click Edit to change the advance' : undefined}
                          className={`w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-100 text-right tabular-nums disabled:opacity-50 ${
                            !advancesUnlocked ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed' : 'bg-white dark:bg-gray-700'
                          }`}
                        />
                        {advancesUnlocked && (
                          <div className="flex gap-1">
                            {[100, 200, 500].map(amount => (
                              <button
                                key={amount}
                                type="button"
                                onClick={() => addToAdvance(employee.id, amount)}
                                disabled={savingAdvanceFor === employee.id}
                                className="px-1.5 py-0.5 text-xs font-medium rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
                              >
                                +{amount}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className={`px-6 py-3 text-sm font-semibold text-right tabular-nums bg-indigo-50/50 dark:bg-indigo-900/20 ${totalPay !== null && totalPay < 0 ? 'text-red-600 dark:text-red-400' : 'text-heading'}`}>
                      {totalPay !== null ? `₹${totalPay.toLocaleString('en-IN')}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {activeEmployees.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40">
                  <td colSpan={5} className="px-6 py-3 text-sm font-semibold text-body text-right">
                    Total payroll for {formatMonthLabel(selectedMonth)}
                  </td>
                  <td className="px-6 py-3 text-sm font-bold text-heading text-right tabular-nums bg-indigo-100 dark:bg-indigo-900/50">
                    ₹{activeEmployees
                      .reduce((sum, employee) => {
                        const worked = daysWorked(employee.id);
                        const salary = calculateSalary(employee, worked);
                        const advance = parseFloat(advances[employee.id] || '0') || 0;
                        return sum + (salary !== null ? salary - advance : 0);
                      }, 0)
                      .toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
