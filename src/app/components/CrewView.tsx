'use client';

import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/tokenUtils';

interface Job {
  id: number;
  name: string;
  phone: string;
  address: string;
  area?: string;
  serviceType: string;
  preferredDate: string;
  preferredTime: string;
  flatType: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
}

const getTodayKey = () => new Date().toISOString().slice(0, 10);

export default function CrewView() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authFetch('/api/bookings?tab=upcoming')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch jobs');
        return res.json();
      })
      .then(data => {
        const todayKey = getTodayKey();
        const todaysJobs: Job[] = data.bookings.filter(
          (b: Job) => b.status === 'CONFIRMED' && b.preferredDate.slice(0, 10) === todayKey
        );
        setJobs(todaysJobs.sort((a, b) => a.preferredTime.localeCompare(b.preferredTime)));
      })
      .catch(err => {
        console.error(err);
        setError('Error loading today’s jobs. Please try again.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-8 text-gray-600">Loading today&apos;s jobs...</div>;
  if (error) return <div className="text-center py-8 text-red-600">{error}</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h2 className="text-xl font-bold text-gray-900">
        Today&apos;s Jobs
        <span className="ml-2 text-base font-normal text-gray-500">({jobs.length})</span>
      </h2>

      {jobs.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200 text-gray-500">
          No confirmed jobs for today.
        </div>
      )}

      <div className="space-y-3">
        {jobs.map(job => (
          <div key={job.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="flex justify-between items-start mb-2">
              <span className="text-lg font-bold text-indigo-700">{job.preferredTime}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                {job.serviceType}
              </span>
            </div>
            <div className="text-base font-medium text-gray-900">{job.name}</div>
            <a href={`tel:${job.phone}`} className="text-sm text-indigo-600 underline">
              {job.phone}
            </a>
            <div className="text-sm text-gray-600 mt-1">
              {job.address}
              {job.area && `, ${job.area}`}
            </div>
            <div className="text-xs text-gray-400 mt-1">{job.flatType.replace('_', ' ')}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
