import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { LogIn, LogOut, MapPin, Clock, Calendar, LayoutDashboard } from 'lucide-react';
import { format, startOfWeek, endOfWeek, differenceInMinutes } from 'date-fns';

interface Job {
  id: string;
  jobId: string;
  name: string;
}

interface TimeLog {
  id: string;
  jobName: string;
  clockInTime: string;
  clockOutTime?: string;
  totalHours?: number;
  workDate: string;
}

export default function Home() {
  const { user, logout } = useAuth();
  const [activeLog, setActiveLog] = useState<TimeLog | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<string>('');
  const [weeklyLogs, setWeeklyLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch active jobs
      const jobsQuery = query(collection(db, 'jobs'), where('status', '==', 'Active'));
      const jobsSnapshot = await getDocs(jobsQuery);
      const jobsData = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
      setJobs(jobsData);

      // Fetch all logs for this user to avoid composite index requirements
      const logsQuery = query(
        collection(db, 'timeLogs'),
        where('contractorUid', '==', user.uid)
      );
      const logsSnapshot = await getDocs(logsQuery);
      const allLogs = logsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimeLog));

      // Find current active log
      const active = allLogs.find(log => log.clockOutTime === null);
      if (active) {
        setActiveLog(active);
      }

      // Filter this week's logs in memory
      const now = new Date();
      const start = startOfWeek(now, { weekStartsOn: 6 }); // Saturday start for Friday end
      const end = endOfWeek(now, { weekStartsOn: 6 });
      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');
      
      const weeklyData = allLogs
        .filter(log => log.workDate >= startStr && log.workDate <= endStr)
        .sort((a, b) => b.workDate.localeCompare(a.workDate)); // Descending
      
      setWeeklyLogs(weeklyData);

    } catch (err) {
      console.error(err);
      setError('Failed to load data.');
    }
    setLoading(false);
  };

  const getPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
      } else {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      }
    });
  };

  const handleStartJob = async () => {
    if (!selectedJob) {
      setError('Please select a job first.');
      return;
    }
    setActionLoading(true);
    setError('');
    try {
      const position = await getPosition();
      const job = jobs.find(j => j.id === selectedJob);
      if (!job) throw new Error('Job not found');

      const now = new Date();
      const workDate = format(now, 'yyyy-MM-dd');
      
      // Calculate week ending (Next Friday)
      let weekEndingDate = new Date(now);
      const day = weekEndingDate.getDay();
      const diff = (day <= 5 ? 5 - day : 12 - day); // Friday is 5
      weekEndingDate.setDate(weekEndingDate.getDate() + diff);
      const weekEnding = format(weekEndingDate, 'yyyy-MM-dd');

      const newLog = {
        contractorUid: user!.uid,
        contractorName: user!.name,
        contractorId: user!.contractorId || '',
        jobId: job.jobId,
        jobName: job.name,
        clockInTime: now.toISOString(),
        clockInLat: position.coords.latitude,
        clockInLng: position.coords.longitude,
        clockOutTime: null,
        clockOutLat: null,
        clockOutLng: null,
        totalHours: 0,
        workDate,
        weekEnding,
        hourlyRate: user!.hourlyRate || 0,
        lineTotal: 0,
        invoiced: false,
        invoiceNumber: '',
        perDiem: false
      };

      const docRef = await addDoc(collection(db, 'timeLogs'), newLog);
      setActiveLog({ id: docRef.id, ...newLog });
      setSelectedJob('');
      fetchData();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to start job. Please ensure location services are enabled.');
    }
    setActionLoading(false);
  };

  const [perDiem, setPerDiem] = useState(false);
  const [showEndJobModal, setShowEndJobModal] = useState(false);

  // ... (inside handleClockOut, renamed to handleEndJob)
  const handleEndJob = async () => {
    if (!activeLog) return;
    setActionLoading(true);
    setError('');
    try {
      const position = await getPosition();
      const now = new Date();
      
      const clockInTime = new Date(activeLog.clockInTime);
      const minutes = differenceInMinutes(now, clockInTime);
      // Round to nearest 0.25 hours (15 mins)
      const hours = Math.round((minutes / 60) * 4) / 4;
      const lineTotal = hours * (user!.hourlyRate || 0);

      await updateDoc(doc(db, 'timeLogs', activeLog.id), {
        clockOutTime: now.toISOString(),
        clockOutLat: position.coords.latitude,
        clockOutLng: position.coords.longitude,
        totalHours: hours,
        lineTotal: lineTotal,
        perDiem: perDiem
      });

      setActiveLog(null);
      setShowEndJobModal(false);
      setPerDiem(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to end job. Please ensure location services are enabled.');
    }
    setActionLoading(false);
  };

  const [language, setLanguage] = useState<'EN' | 'ES'>('EN');

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#222222] text-white">Loading...</div>;
  }

  const totalWeeklyHours = weeklyLogs.reduce((sum, log) => sum + (log.totalHours || 0), 0);

  return (
    <div className="min-h-screen bg-[#222222] text-white flex flex-col">
      <header className="bg-[#A7AFB5] text-[#222222] p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Sunbelt Sports" className="h-8 object-contain" onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            const fallback = document.getElementById('home-logo-fallback');
            if (fallback) fallback.style.display = 'block';
          }} />
          <h1 id="home-logo-fallback" className="hidden font-bold text-xl uppercase tracking-wider">Sunbelt Sports</h1>
          <div className="h-8 w-px bg-gray-400 mx-2 hidden sm:block"></div>
          <p className="text-sm font-medium hidden sm:block">{user?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setLanguage(l => l === 'EN' ? 'ES' : 'EN')}
            className="font-bold text-sm bg-white/50 hover:bg-white px-2 py-1 rounded transition-colors"
          >
            {language}
          </button>
          <p className="text-sm font-medium sm:hidden">{user?.name?.split(' ')[0]}</p>
          {localStorage.getItem('overrideRole') === 'contractor' && (
            <button 
              onClick={() => {
                localStorage.removeItem('overrideRole');
                window.location.href = '/admin';
              }} 
              className="p-2 hover:bg-white/20 rounded-full transition-colors bg-red-500 text-white" 
              title="Return to Admin View"
            >
              <LayoutDashboard className="w-5 h-5" />
            </button>
          )}
          {user?.role === 'admin' && !localStorage.getItem('overrideRole') && (
            <button onClick={() => window.location.href = '/admin'} className="p-2 hover:bg-white/20 rounded-full transition-colors" title="Back to Admin">
              <LayoutDashboard className="w-6 h-6" />
            </button>
          )}
          <button onClick={logout} className="p-2 hover:bg-white/20 rounded-full transition-colors" title="Sign Out">
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-md mx-auto w-full flex flex-col gap-6">
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-100 p-3 rounded text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg overflow-hidden text-[#222222]">
          <div className="p-6 flex flex-col items-center text-center border-b border-gray-200">
            {activeLog ? (
              <>
                <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mb-4">
                  <Clock className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold mb-1">{language === 'EN' ? 'Job Active' : 'Trabajo Activo'}</h2>
                <p className="text-gray-600 font-medium mb-1">{activeLog.jobName}</p>
                <p className="text-sm text-gray-500">{language === 'EN' ? 'Started at' : 'Iniciado a las'} {format(new Date(activeLog.clockInTime), 'h:mm a')}</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-4">
                  <MapPin className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold mb-1">{language === 'EN' ? 'Ready to Work' : 'Listo para Trabajar'}</h2>
                <p className="text-gray-500 text-sm">{language === 'EN' ? 'Select a job to start logging your time.' : 'Seleccione un trabajo para empezar a registrar su tiempo.'}</p>
              </>
            )}
          </div>

          <div className="p-6 bg-gray-50">
            {activeLog ? (
              showEndJobModal ? (
                <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4">
                  <div className="bg-white p-4 rounded border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-lg mb-2">{language === 'EN' ? 'End Job Details' : 'Detalles de Fin de Trabajo'}</h3>
                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded cursor-pointer hover:bg-gray-50 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={perDiem}
                        onChange={(e) => setPerDiem(e.target.checked)}
                        className="w-5 h-5 text-[#10BE66] rounded focus:ring-[#10BE66]"
                      />
                      <span className="font-medium">{language === 'EN' ? 'I am claiming Per Diem ($50) for today' : 'Reclamo Viáticos ($50) por hoy'}</span>
                    </label>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowEndJobModal(false)}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-[#222222] font-bold py-4 px-6 rounded-lg text-lg uppercase tracking-wider transition-colors"
                    >
                      {language === 'EN' ? 'Cancel' : 'Cancelar'}
                    </button>
                    <button
                      onClick={handleEndJob}
                      disabled={actionLoading}
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-lg text-lg uppercase tracking-wider transition-colors shadow-md"
                    >
                      {actionLoading ? (language === 'EN' ? 'Processing...' : 'Procesando...') : (language === 'EN' ? 'Confirm End' : 'Confirmar Fin')}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowEndJobModal(true)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-lg text-lg uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-md"
                >
                  {language === 'EN' ? 'End Job' : 'Terminar Trabajo'}
                </button>
              )
            ) : (
              <div className="flex flex-col gap-4">
                <select
                  value={selectedJob}
                  onChange={(e) => setSelectedJob(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg bg-white text-[#222222] font-medium focus:ring-2 focus:ring-[#10BE66] focus:border-transparent outline-none"
                >
                  <option value="">-- {language === 'EN' ? 'Select Job' : 'Seleccionar Trabajo'} --</option>
                  {jobs.map(job => (
                    <option key={job.id} value={job.id}>{job.jobId} - {job.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleStartJob}
                  disabled={actionLoading || !selectedJob}
                  className="w-full bg-[#10BE66] hover:bg-[#0e9f55] disabled:opacity-50 text-white font-bold py-4 px-6 rounded-lg text-lg uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-md"
                >
                  {actionLoading ? (language === 'EN' ? 'Processing...' : 'Procesando...') : (language === 'EN' ? 'Start Job' : 'Empezar Trabajo')}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden text-[#222222]">
          <div className="bg-[#222222] text-white p-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#10BE66]" />
            <h3 className="font-bold uppercase tracking-wider">{language === 'EN' ? "This Week's Hours" : "Horas de esta semana"}</h3>
          </div>
          <div className="p-0">
            {weeklyLogs.length === 0 ? (
              <p className="p-6 text-center text-gray-500 italic">{language === 'EN' ? 'No time logged this week.' : 'No hay tiempo registrado esta semana.'}</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="text-left p-3 font-semibold text-gray-600">{language === 'EN' ? 'Date' : 'Fecha'}</th>
                    <th className="text-left p-3 font-semibold text-gray-600">{language === 'EN' ? 'Job' : 'Trabajo'}</th>
                    <th className="text-right p-3 font-semibold text-gray-600">{language === 'EN' ? 'Hours' : 'Horas'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {weeklyLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="p-3">
                        {format(new Date(log.workDate), 'MM/dd')}
                        {log.perDiem && <span className="block text-xs text-yellow-600 font-medium">{language === 'EN' ? '+ Per Diem' : '+ Viáticos'}</span>}
                      </td>
                      <td className="p-3 truncate max-w-[120px]">{log.jobName}</td>
                      <td className="p-3 text-right font-mono">{log.totalHours?.toFixed(2) || '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-bold">
                  <tr>
                    <td colSpan={2} className="p-3 text-right">{language === 'EN' ? 'Total:' : 'Total:'}</td>
                    <td className="p-3 text-right font-mono text-[#10BE66]">{totalWeeklyHours.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
