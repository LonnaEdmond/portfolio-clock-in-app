import { useState, useEffect } from 'react';
import { collection, query, getDocs, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AppUser } from '../../contexts/AuthContext';

export default function AdminContractors() {
  const [contractors, setContractors] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContractors();
  }, []);

  const fetchContractors = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'contractor'));
      const snapshot = await getDocs(q);
      setContractors(snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as AppUser)));
    } catch (error) {
      console.error("Error fetching contractors:", error);
    }
    setLoading(false);
  };

  const toggleStatus = async (contractor: AppUser) => {
    const newStatus = contractor.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await updateDoc(doc(db, 'users', contractor.uid), { status: newStatus });
      fetchContractors();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  if (loading) return <div className="p-8">Loading contractors...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#222222] uppercase tracking-wider">Contractors</h2>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200 text-sm uppercase tracking-wider text-gray-600">
              <th className="p-4 font-semibold">Name</th>
              <th className="p-4 font-semibold">Email</th>
              <th className="p-4 font-semibold">Type</th>
              <th className="p-4 font-semibold">Rate / Salary</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {contractors.map(contractor => (
              <tr key={contractor.uid} className="hover:bg-gray-50">
                <td className="p-4 font-medium text-[#222222]">{contractor.name || 'N/A'}</td>
                <td className="p-4 text-gray-600">{contractor.email}</td>
                <td className="p-4 text-gray-600">{contractor.type || 'Hourly'}</td>
                <td className="p-4 text-gray-600">
                  {contractor.type === 'Salaried' 
                    ? `$${contractor.weeklySalary?.toFixed(2)}/wk` 
                    : `$${contractor.hourlyRate?.toFixed(2)}/hr`}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${
                    contractor.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {contractor.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button 
                    onClick={() => toggleStatus(contractor)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    {contractor.status === 'Active' ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
            {contractors.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">No contractors found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
