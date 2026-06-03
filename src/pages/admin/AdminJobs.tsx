import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface Job {
  id: string;
  jobId: string;
  name: string;
  status: 'Active' | 'Inactive';
}

export default function AdminJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newJob, setNewJob] = useState({ jobId: '', name: '' });

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'jobs'));
      const snapshot = await getDocs(q);
      setJobs(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Job)));
    } catch (error) {
      console.error("Error fetching jobs:", error);
    }
    setLoading(false);
  };

  const toggleStatus = async (job: Job) => {
    const newStatus = job.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await updateDoc(doc(db, 'jobs', job.id), { status: newStatus });
      fetchJobs();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleAddJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJob.jobId || !newJob.name) return;
    try {
      await addDoc(collection(db, 'jobs'), {
        ...newJob,
        status: 'Active'
      });
      setNewJob({ jobId: '', name: '' });
      setIsAdding(false);
      fetchJobs();
    } catch (error) {
      console.error("Error adding job:", error);
    }
  };

  if (loading) return <div className="p-8">Loading jobs...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#222222] uppercase tracking-wider">Jobs</h2>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-[#222222] text-white px-4 py-2 rounded font-medium hover:bg-[#333333] transition-colors"
        >
          {isAdding ? 'Cancel' : 'Add Job'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddJob} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6 flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Job ID</label>
            <input 
              type="text" 
              value={newJob.jobId} 
              onChange={e => setNewJob({...newJob, jobId: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#10BE66] outline-none"
              placeholder="e.g., 25-177"
              required
            />
          </div>
          <div className="flex-[2]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Name</label>
            <input 
              type="text" 
              value={newJob.name} 
              onChange={e => setNewJob({...newJob, name: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#10BE66] outline-none"
              placeholder="e.g., Brewer High School"
              required
            />
          </div>
          <button type="submit" className="bg-[#10BE66] text-white px-6 py-2 rounded font-bold hover:bg-[#0e9f55] transition-colors">
            Save Job
          </button>
        </form>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200 text-sm uppercase tracking-wider text-gray-600">
              <th className="p-4 font-semibold">Job ID</th>
              <th className="p-4 font-semibold">Job Name</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {jobs.map(job => (
              <tr key={job.id} className="hover:bg-gray-50">
                <td className="p-4 font-medium text-[#222222]">{job.jobId}</td>
                <td className="p-4 text-gray-600">{job.name}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${
                    job.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {job.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button 
                    onClick={() => toggleStatus(job)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    {job.status === 'Active' ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">No jobs found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
