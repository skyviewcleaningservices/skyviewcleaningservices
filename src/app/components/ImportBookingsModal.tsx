'use client';

import { useState, useRef } from 'react';
import { authFetch } from '@/lib/tokenUtils';
import { parseCsv, normalizeHeader } from '@/lib/csv';

interface ImportBookingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}

interface ParsedRow {
  name?: string;
  phone?: string;
  address?: string;
  lastServiceDate?: string;
  review?: string;
  paymentAmount?: string;
  serviceType?: string;
}

interface ImportResult {
  created: number;
  failed: { row: number; reason: string }[];
  skipped: { row: number; reason: string }[];
}

// Matches the server's MAX_ROWS in api/bookings/import — chunking here keeps
// each request comfortably under the 30s function timeout regardless of how
// large the uploaded file is.
const CHUNK_SIZE = 300;

const HEADER_ALIASES: Record<keyof ParsedRow, string[]> = {
  name: ['name', 'customer name', 'customer'],
  phone: ['phone', 'mobile', 'mobile number', 'phone number', 'contact number'],
  address: ['address', 'customer address'],
  lastServiceDate: ['last service date', 'service date', 'date'],
  review: ['review', 'remarks', 'feedback', 'notes'],
  paymentAmount: ['payment amount', 'amount', 'amount paid', 'payment'],
  serviceType: ['service', 'service type', 'service given', 'service that we given'],
};

function mapRows(table: string[][]): ParsedRow[] {
  if (table.length === 0) return [];
  const headers = table[0].map(normalizeHeader);

  const columnFor = (field: keyof ParsedRow): number =>
    headers.findIndex(h => HEADER_ALIASES[field].includes(h));

  const columns = {
    name: columnFor('name'),
    phone: columnFor('phone'),
    address: columnFor('address'),
    lastServiceDate: columnFor('lastServiceDate'),
    review: columnFor('review'),
    paymentAmount: columnFor('paymentAmount'),
    serviceType: columnFor('serviceType'),
  };

  return table.slice(1).map(cells => ({
    name: columns.name >= 0 ? cells[columns.name] : undefined,
    phone: columns.phone >= 0 ? cells[columns.phone] : undefined,
    address: columns.address >= 0 ? cells[columns.address] : undefined,
    lastServiceDate: columns.lastServiceDate >= 0 ? cells[columns.lastServiceDate] : undefined,
    review: columns.review >= 0 ? cells[columns.review] : undefined,
    paymentAmount: columns.paymentAmount >= 0 ? cells[columns.paymentAmount] : undefined,
    serviceType: columns.serviceType >= 0 ? cells[columns.serviceType] : undefined,
  }));
}

export default function ImportBookingsModal({ isOpen, onClose, onImported }: ImportBookingsModalProps) {
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [error, setError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const reset = () => {
    setFileName('');
    setRows([]);
    setError('');
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setResult(null);
    setFileName(file.name);

    try {
      const text = await file.text();
      const table = parseCsv(text);
      const parsed = mapRows(table);

      if (parsed.length === 0) {
        setError('No rows found in this file.');
        setRows([]);
        return;
      }
      if (!table[0].some(h => HEADER_ALIASES.name.includes(normalizeHeader(h))) ||
          !table[0].some(h => HEADER_ALIASES.phone.includes(normalizeHeader(h)))) {
        setError('CSV must have a "Name" column and a "Mobile Number" column.');
        setRows([]);
        return;
      }

      setRows(parsed);
    } catch (err) {
      setError('Could not read this file. Make sure it\'s a valid CSV.');
      setRows([]);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    setError('');
    setProgress(0);

    const combined: ImportResult = { created: 0, failed: [], skipped: [] };

    try {
      for (let start = 0; start < rows.length; start += CHUNK_SIZE) {
        const chunk = rows.slice(start, start + CHUNK_SIZE);
        const response = await authFetch('/api/bookings/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows: chunk }),
        });
        const data = await response.json();

        if (!data.success) {
          setError(
            `${data.message || 'Import failed.'} (${combined.created} row${combined.created === 1 ? '' : 's'} were already imported before this happened.)`
          );
          setResult(combined.created > 0 ? combined : null);
          if (combined.created > 0) onImported();
          return;
        }

        combined.created += data.created;
        // Row numbers from the server are relative to its chunk — offset them
        // back to the row's position in the original uploaded file.
        combined.failed.push(
          ...(data.failed || []).map((f: { row: number; reason: string }) => ({
            row: f.row + start,
            reason: f.reason,
          }))
        );
        combined.skipped.push(
          ...(data.skipped || []).map((s: { row: number; reason: string }) => ({
            row: s.row + start,
            reason: s.reason,
          }))
        );

        setProgress(Math.min(start + CHUNK_SIZE, rows.length));
      }

      setResult(combined);
      if (combined.created > 0) onImported();
    } catch (err) {
      setError(
        `Import failed. (${combined.created} row${combined.created === 1 ? '' : 's'} were already imported before this happened.)`
      );
      if (combined.created > 0) {
        setResult(combined);
        onImported();
      }
    } finally {
      setIsImporting(false);
    }
  };

  const validRowCount = rows.filter(r => r.name?.trim() && r.phone?.trim()).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Import Customers</h2>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">
              ×
            </button>
          </div>

          {!result && (
            <>
              <p className="text-sm text-gray-500 mb-4">
                Upload a CSV with columns for customer name, mobile number, last service date,
                review, payment amount, and service given (address is optional). Each row is
                added as a completed booking so it shows up in Booking Management and customer
                history.
              </p>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
                />
                {fileName && !error && (
                  <p className="text-sm text-gray-600 mt-3">
                    <span className="font-medium">{fileName}</span> — {validRowCount} row{validRowCount === 1 ? '' : 's'} ready to import
                    {rows.length !== validRowCount && (
                      <span className="text-amber-600"> ({rows.length - validRowCount} missing name/phone will be skipped)</span>
                    )}
                  </p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {isImporting && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Importing bookings...</span>
                    <span>{progress} / {rows.length} ({Math.round((progress / rows.length) * 100)}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${Math.round((progress / rows.length) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isImporting}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={validRowCount === 0 || isImporting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isImporting
                    ? `Importing... ${progress}/${rows.length}`
                    : `Import ${validRowCount || ''} Booking${validRowCount === 1 ? '' : 's'}`}
                </button>
              </div>
            </>
          )}

          {result && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <p className="text-sm text-green-800 font-medium">
                  Imported {result.created} booking{result.created === 1 ? '' : 's'} successfully.
                </p>
              </div>

              {result.skipped.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
                  <p className="text-sm text-amber-800 font-medium mb-2">
                    {result.skipped.length} row{result.skipped.length === 1 ? '' : 's'} skipped as duplicates (mobile number already had a booking on that date):
                  </p>
                  <ul className="text-sm text-amber-700 space-y-1 max-h-40 overflow-y-auto">
                    {result.skipped.map((s, idx) => (
                      <li key={idx}>Row {s.row}: {s.reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.failed.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-sm text-red-800 font-medium mb-2">
                    {result.failed.length} row{result.failed.length === 1 ? '' : 's'} failed:
                  </p>
                  <ul className="text-sm text-red-700 space-y-1 max-h-40 overflow-y-auto">
                    {result.failed.map((f, idx) => (
                      <li key={idx}>Row {f.row}: {f.reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={reset}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Import Another File
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
