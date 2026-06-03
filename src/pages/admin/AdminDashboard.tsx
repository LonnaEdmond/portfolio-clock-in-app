import { useState, useEffect } from 'react';
import { collection, query, getDocs, where, addDoc, setDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Users, Briefcase, Clock, AlertTriangle, Database, RefreshCw } from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminDashboard() {
  const { switchRole } = useAuth();
  const [stats, setStats] = useState({
    activeContractors: 0,
    activeJobs: 0,
    clockedIn: 0,
    missingTime: 0
  });
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const usersSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'contractor')));
      const activeContractors = usersSnap.docs.filter(doc => doc.data().status === 'Active').length;
      
      const jobsSnap = await getDocs(query(collection(db, 'jobs')));
      const activeJobs = jobsSnap.docs.filter(doc => doc.data().status === 'Active').length;
      
      const allLogsSnap = await getDocs(collection(db, 'timeLogs'));
      const activeLogs = allLogsSnap.docs.filter(doc => doc.data().clockOutTime === null).length;
      
      const now = new Date();
      const start = startOfWeek(now, { weekStartsOn: 6 });
      const end = endOfWeek(now, { weekStartsOn: 6 });
      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');
      
      const weeklyLogs = allLogsSnap.docs.filter(doc => {
        const date = doc.data().workDate;
        return date >= startStr && date <= endStr;
      });

      const contractorsWithTime = new Set(weeklyLogs.map(doc => doc.data().contractorUid));
      const missingTime = activeContractors - contractorsWithTime.size;

      setStats({
        activeContractors: activeContractors,
        activeJobs: activeJobs,
        clockedIn: activeLogs,
        missingTime: Math.max(0, missingTime)
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
    setLoading(false);
  };

  const seedData = async () => {
    setSeeding(true);
    try {
      // Seed Jobs
      const jobs = [
        { jobId: '25-177', name: 'Brewer High School', status: 'Active' },
        { jobId: '25-141', name: 'Camden County High School', status: 'Active' },
        { jobId: '25-161', name: 'Camden County Sportsplex', status: 'Active' },
        { jobId: '26-040', name: 'Chateau Elan', status: 'Active' },
        { jobId: '26-057', name: 'Chateau Elan Speed Tables', status: 'Active' },
        { jobId: '24-130', name: 'Evans High School Tennis', status: 'Active' },
        { jobId: '25-283', name: 'Flint Hill Middle School', status: 'Active' },
        { jobId: '25-271', name: 'Hewitt Trussville High School', status: 'Active' },
        { jobId: '25-301', name: 'Johnson Elementary School', status: 'Active' },
        { jobId: '25-254', name: 'Lakewood High School', status: 'Active' },
        { jobId: '25-201', name: 'Lake Wylie High School', status: 'Active' },
        { jobId: '24-165', name: 'Lovejoy HS Track — Hampton', status: 'Active' },
        { jobId: '25-323', name: 'Madison County High School', status: 'Active' },
        { jobId: '24-205', name: 'New South MS / HS', status: 'Active' },
        { jobId: '25-160', name: 'North Central High School', status: 'Active' },
        { jobId: '26-011', name: 'Pine Lake Prep Sports Complex', status: 'Active' },
        { jobId: '25-140', name: 'Percy Julian High School', status: 'Active' },
        { jobId: '25-324', name: 'Porter Ridge High School', status: 'Active' },
        { jobId: '25-215', name: 'Richmond Senior High School', status: 'Active' },
        { jobId: '25-093', name: 'Rome Middle School', status: 'Active' },
        { jobId: '25-290', name: 'University of Alabama Huntsville', status: 'Active' },
        { jobId: '25-135', name: 'Veteran\'s Middle School', status: 'Active' },
        { jobId: '25-145', name: 'Wilson\'s Mill High School — Smithfield', status: 'Active' },
        { jobId: '24-228', name: 'Woodruff HS Tennis', status: 'Active' }
      ];

      for (const job of jobs) {
        await addDoc(collection(db, 'jobs'), job);
      }

      // Seed Contractors (Note: they won't be able to login until they actually sign in with Google,
      // but we can pre-create their profiles. We'll use dummy UIDs for now, or they will be matched by email if we had emails.
      // Since we don't have emails, Lonna will have to add them or they will be created on first login.
      // Let's just create them with dummy UIDs so they show up in the list.)
      const contractors = [
        { uid: 'dummy-1', name: 'Pedro Gutierrez De Lara', hourlyRate: 18.55, paymentTerms: 'Net 7 Arrears', status: 'Active', role: 'contractor', email: 'pedro.g@example.com', contractorId: 'SUB-001', invoicePrefix: 'PG', type: 'Hourly' },
        { uid: 'dummy-2', name: 'Luis Pedro De Lara Aguilar', hourlyRate: 18.55, paymentTerms: 'Net 7 Arrears', status: 'Active', role: 'contractor', email: 'luis.p@example.com', contractorId: 'SUB-002', invoicePrefix: 'LP', type: 'Hourly' },
        { uid: 'dummy-3', name: 'Sergio Yonny Garcia', hourlyRate: 18.55, paymentTerms: 'Net 7 Arrears', status: 'Active', role: 'contractor', email: 'sergio.y@example.com', contractorId: 'SUB-003', invoicePrefix: 'SG', type: 'Hourly' },
        { uid: 'dummy-4', name: 'Jose Enrique Aguilar', hourlyRate: 18.00, paymentTerms: 'Net 7 Arrears', status: 'Active', role: 'contractor', email: 'jose.e@example.com', contractorId: 'SUB-004', invoicePrefix: 'JA', type: 'Hourly' },
        { uid: 'dummy-5', name: 'Christian Morales-Moctezuma', hourlyRate: 18.00, paymentTerms: 'Net 7 Arrears', status: 'Active', role: 'contractor', email: 'christian.m@example.com', contractorId: 'SUB-005', invoicePrefix: 'CM', type: 'Hourly' },
        { uid: 'dummy-6', name: 'Jose Alonso Aguilar Gallegos', hourlyRate: 18.55, paymentTerms: 'Net 7 Arrears', status: 'Active', role: 'contractor', email: 'jose.a@example.com', contractorId: 'SUB-006', invoicePrefix: 'JG', type: 'Hourly' },
        { uid: 'dummy-7', name: 'Pedro De Lara', paymentTerms: 'Weekly', status: 'Active', role: 'contractor', email: 'pedro.d@example.com', contractorId: 'SUB-007', invoicePrefix: 'PD', type: 'Salaried', weeklySalary: 2307.69 }
      ];

      for (const c of contractors) {
        await setDoc(doc(db, 'users', c.uid), c);
      }

      alert("Data seeded successfully!");
      fetchStats();
    } catch (error) {
      console.error("Error seeding data:", error);
      alert("Error seeding data.");
    }
    setSeeding(false);
  };

  if (loading) {
    return <div className="p-8">Loading dashboard...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#222222] uppercase tracking-wider">Command Center</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={() => switchRole('contractor')}
            className="flex items-center gap-2 bg-[#10BE66] text-white px-4 py-2 rounded font-medium hover:bg-[#0e9f55] transition-colors"
            title="Test the app as a contractor"
          >
            <RefreshCw className="w-4 h-4" />
            Test as Contractor
          </button>
          
          {stats.activeJobs === 0 && (
            <button 
              onClick={seedData} 
              disabled={seeding}
              className="flex items-center gap-2 bg-[#222222] text-white px-4 py-2 rounded font-medium hover:bg-[#333333] transition-colors disabled:opacity-50"
            >
              <Database className="w-4 h-4" />
              {seeding ? 'Seeding...' : 'Seed Initial Data'}
            </button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Active Contractors" 
          value={stats.activeContractors} 
          icon={Users} 
          color="bg-blue-500" 
        />
        <StatCard 
          title="Active Jobs" 
          value={stats.activeJobs} 
          icon={Briefcase} 
          color="bg-purple-500" 
        />
        <StatCard 
          title="Currently Clocked In" 
          value={stats.clockedIn} 
          icon={Clock} 
          color="bg-[#10BE66]" 
        />
        <StatCard 
          title="Missing Time (This Wk)" 
          value={stats.missingTime} 
          icon={AlertTriangle} 
          color={stats.missingTime > 0 ? "bg-red-500" : "bg-gray-500"} 
        />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: { title: string, value: number, icon: any, color: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</p>
        <p className="text-3xl font-bold text-[#222222]">{value}</p>
      </div>
    </div>
  );
}
