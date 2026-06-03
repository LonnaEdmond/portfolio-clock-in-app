# Sunbelt Sports 1099 Clock-In App - Codex Handoff

This document contains the complete React/Vite/TypeScript codebase for the Sunbelt Sports 1099 Contractor Time Tracking & Invoicing App.
The user is handing this over to Codex to finish and launch. Please review the UI, logic, and context, and continue the development.

## File: `package.json`

```json
{
  "name": "react-example",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port=3000 --host=0.0.0.0",
    "build": "vite build",
    "preview": "vite preview",
    "clean": "rm -rf dist",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@google/genai": "^1.29.0",
    "@tailwindcss/vite": "^4.1.14",
    "@vitejs/plugin-react": "^5.0.4",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "dotenv": "^17.2.3",
    "firebase": "^12.11.0",
    "jspdf": "^4.2.1",
    "jspdf-autotable": "^5.0.7",
    "lucide-react": "^0.546.0",
    "motion": "^12.23.24",
    "papaparse": "^5.5.3",
    "pdfkit": "^0.18.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.14.0",
    "tailwind-merge": "^3.5.0",
    "vite": "^6.2.0"
  },
  "devDependencies": {
    "@types/node": "^22.14.0",
    "@types/papaparse": "^5.5.2",
    "@types/pdfkit": "^0.17.5",
    "autoprefixer": "^10.4.21",
    "tailwindcss": "^4.1.14",
    "tsx": "^4.21.0",
    "typescript": "~5.8.2",
    "vite": "^6.2.0"
  }
}

```

## File: `vite.config.ts`

```tsx
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});

```

## File: `src/App.tsx`

```tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Home from './pages/Home';
import Admin from './pages/Admin';
import Login from './pages/Login';

function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) {
  const { user, loading, authError } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#222222] text-white p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#10BE66] mb-4"></div>
        <p className="text-[#A7AFB5] font-medium tracking-wider uppercase">Loading Sunbelt Sports...</p>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#222222] text-white p-6 text-center">
        <div className="bg-red-500/10 border border-red-500 p-6 rounded-lg max-w-md">
          <h2 className="text-xl font-bold text-red-500 mb-2">Authentication Error</h2>
          <p className="text-gray-300 mb-4">{authError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-[#10BE66] text-white px-4 py-2 rounded font-bold hover:bg-[#0e9f55] transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  if (user.status === 'Inactive' && user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#222222] text-white p-6 text-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">Account Inactive</h1>
          <p className="text-[#A7AFB5]">Your account is currently inactive. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/*" 
            element={
              <ProtectedRoute requireAdmin>
                <Admin />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

```

## File: `src/contexts/AuthContext.tsx`

```tsx
import React, { createContext, useContext, useEffect, useState } from 'react';

export interface AppUser {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'contractor';
  contractorId?: string;
  hourlyRate?: number;
  paymentTerms?: string;
  status: 'Active' | 'Inactive';
  invoicePrefix?: string;
  type?: 'Hourly' | 'Salaried';
  weeklySalary?: number;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  authError: string | null;
  login: (role: 'admin' | 'contractor') => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: 'admin' | 'contractor') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('mockUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (role: 'admin' | 'contractor') => {
    try {
      setLoading(true);
      setAuthError(null);
      
      const mockUser: AppUser = {
        uid: role === 'admin' ? 'admin-123' : 'contractor-456',
        email: role === 'admin' ? 'lonna.edmond@sunbeltsports.com' : 'contractor@test.com',
        name: role === 'admin' ? 'Lonna Edmond' : 'Test Contractor',
        role: role,
        status: 'Active',
        type: 'Hourly',
        hourlyRate: 18.55,
        ...(role === 'contractor' ? {
          contractorId: 'SUB-999',
          invoicePrefix: 'TC'
        } : {})
      };
      
      setUser(mockUser);
      localStorage.setItem('mockUser', JSON.stringify(mockUser));
    } catch (error: any) {
      console.error("Login error:", error);
      setAuthError(error.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem('mockUser');
    localStorage.removeItem('overrideRole');
  };

  const switchRole = (role: 'admin' | 'contractor') => {
    if (user) {
      const updatedUser = { ...user, role };
      setUser(updatedUser);
      localStorage.setItem('mockUser', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, authError, login, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

```

## File: `src/pages/Home.tsx`

```tsx
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

```

## File: `src/pages/Login.tsx`

```tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { HardHat, ShieldCheck } from 'lucide-react';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#222222] text-white p-6">
      <div className="w-full max-w-md bg-white text-[#222222] rounded-lg shadow-xl overflow-hidden">
        <div className="bg-[#A7AFB5] p-6 flex flex-col items-center justify-center border-b-4 border-[#10BE66]">
          <img src="/logo.png" alt="Sunbelt Sports" className="h-16 mb-4 object-contain" onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            const fallback = document.getElementById('logo-fallback');
            if (fallback) fallback.style.display = 'flex';
          }} />
          <div id="logo-fallback" className="hidden flex-col items-center">
            <h1 className="text-3xl font-bold uppercase tracking-wider text-[#222222]">Sunbelt Sports</h1>
          </div>
          <p className="text-sm font-medium uppercase tracking-widest text-[#222222]/70">Command Center</p>
        </div>
        <div className="p-8 flex flex-col gap-4">
          <button 
            onClick={() => login('admin')}
            className="w-full bg-[#222222] hover:bg-black text-white font-bold py-4 px-4 rounded transition-colors flex items-center justify-center gap-3 uppercase tracking-wider"
          >
            <ShieldCheck className="w-6 h-6" />
            Enter as Admin
          </button>

          <button 
            onClick={() => login('contractor')}
            className="w-full bg-[#10BE66] hover:bg-[#0e9f55] text-white font-bold py-4 px-4 rounded transition-colors flex items-center justify-center gap-3 uppercase tracking-wider"
          >
            <HardHat className="w-6 h-6" />
            Enter as Contractor
          </button>
        </div>
      </div>
    </div>
  );
}

```

## File: `src/pages/Admin.tsx`

```tsx
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Users, Briefcase, FileText, LogOut, HardHat } from 'lucide-react';
import { cn } from '../lib/utils';
import AdminDashboard from './admin/AdminDashboard';
import AdminContractors from './admin/AdminContractors';
import AdminJobs from './admin/AdminJobs';
import AdminInvoices from './admin/AdminInvoices';

export default function Admin() {
  const { logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/contractors', label: 'Contractors', icon: Users },
    { path: '/admin/jobs', label: 'Jobs', icon: Briefcase },
    { path: '/admin/invoices', label: 'Invoices', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-[#222222] text-white flex flex-col">
        <div className="p-6 border-b border-gray-700 flex items-center justify-center bg-white">
          <img src="/logo.png" alt="Sunbelt Sports" className="h-10 object-contain" onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            const fallback = document.getElementById('admin-logo-fallback');
            if (fallback) fallback.style.display = 'block';
          }} />
          <h1 id="admin-logo-fallback" className="hidden text-xl font-bold uppercase tracking-wider text-[#10BE66]">Sunbelt Admin</h1>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium",
                  isActive ? "bg-[#10BE66] text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
          <div className="my-2 border-t border-gray-700"></div>
          <Link
            to="/"
            className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            <HardHat className="w-5 h-5" />
            Contractor View
          </Link>
        </nav>
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 w-full text-left text-gray-400 hover:bg-gray-800 hover:text-white rounded-lg transition-colors font-medium"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<AdminDashboard />} />
          <Route path="/contractors" element={<AdminContractors />} />
          <Route path="/jobs" element={<AdminJobs />} />
          <Route path="/invoices" element={<AdminInvoices />} />
        </Routes>
      </main>
    </div>
  );
}

```

## File: `src/pages/admin/AdminDashboard.tsx`

```tsx
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

```

## File: `src/pages/admin/AdminContractors.tsx`

```tsx
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

```

## File: `src/pages/admin/AdminJobs.tsx`

```tsx
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

```

## File: `src/pages/admin/AdminInvoices.tsx`

```tsx
import { useState, useEffect } from 'react';
import { collection, query, getDocs, where, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { Eye } from 'lucide-react';

interface TimeLog {
  id: string;
  contractorUid: string;
  contractorName: string;
  contractorId: string;
  jobId: string;
  jobName: string;
  clockInTime: string;
  clockOutTime?: string;
  totalHours: number;
  workDate: string;
  weekEnding: string;
  hourlyRate: number;
  lineTotal: number;
  invoiced: boolean;
  perDiem?: boolean;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  contractorName: string;
  weekEnding: string;
  totalHours: number;
  totalAmount: number;
  invoiceDate: string;
  status: string;
}

export default function AdminInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [weekEnding, setWeekEnding] = useState('');

  useEffect(() => {
    const now = new Date();
    let weDate = new Date(now);
    const day = weDate.getDay();
    const diff = (day <= 5 ? 5 - day : 12 - day);
    weDate.setDate(weDate.getDate() + diff);
    setWeekEnding(format(weDate, 'yyyy-MM-dd'));
    
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'invoices'));
      const snapshot = await getDocs(q);
      setInvoices(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Invoice)));
    } catch (error) {
      console.error("Error fetching invoices:", error);
    }
    setLoading(false);
  };

  const previewInvoice = async (invoice: Invoice) => {
    try {
      // Fetch time logs for this invoice
      const logsQuery = query(
        collection(db, 'timeLogs'),
        where('invoiceNumber', '==', invoice.invoiceNumber)
      );
      const logsSnap = await getDocs(logsQuery);
      const contractorLogs = logsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimeLog));

      if (contractorLogs.length === 0) {
        alert("No time logs found for this invoice.");
        return;
      }

      const uid = contractorLogs[0].contractorUid;
      const userSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', uid)));
      const userData = userSnap.empty ? null : userSnap.docs[0].data();
      
      const isSalaried = userData?.type === 'Salaried';
      const weeklySalary = userData?.weeklySalary || 0;

      // Calculate hours, overtime, and per diem
      let totalRegularHours = 0;
      let totalOvertimeHours = 0;
      let perDiemDays = 0;
      
      const jobBreakdown: Record<string, { hours: number, rate: number }> = {};

      contractorLogs.forEach(log => {
        const hours = log.totalHours || 0;
        const rate = log.hourlyRate || 0;
        const jobKey = `${log.jobId} ${log.jobName}`;
        
        if (!jobBreakdown[jobKey]) {
          jobBreakdown[jobKey] = { hours: 0, rate };
        }
        jobBreakdown[jobKey].hours += hours;
        
        if (log.perDiem) {
          perDiemDays += 1;
        }
      });

      const totalHours = contractorLogs.reduce((sum, log) => sum + (log.totalHours || 0), 0);
      
      if (totalHours > 40) {
        totalRegularHours = 40;
        totalOvertimeHours = totalHours - 40;
      } else {
        totalRegularHours = totalHours;
      }

      const baseRate = contractorLogs[0]?.hourlyRate || 0;
      const otRate = baseRate * 1.5;
      const perDiemRate = 50.00;

      let totalAmount = 0;
      if (isSalaried) {
        totalAmount = weeklySalary + (perDiemDays * perDiemRate);
      } else {
        totalAmount = (totalRegularHours * baseRate) + (totalOvertimeHours * otRate) + (perDiemDays * perDiemRate);
      }

      // Create PDF
      const docPDF = new jsPDF();
      
      // Brand Colors
      const charcoal = '#222222';
      const concrete = '#A7AFB5';
      const green = '#10BE66';

      // Header
      docPDF.setTextColor(charcoal);
      docPDF.setFont("helvetica", "bold");
      docPDF.setFontSize(24);
      docPDF.text(invoice.contractorName, 14, 22);
      
      docPDF.setTextColor(concrete);
      docPDF.setFontSize(20);
      docPDF.text("INVOICE", 150, 22);
      
      // Sub-header (Job Code)
      docPDF.setTextColor(charcoal);
      docPDF.setFontSize(10);
      docPDF.text(`Base-5106`, 100, 35); // Defaulting to Base 1099 job code for now
      
      // Info Table
      autoTable(docPDF, {
        startY: 38,
        margin: { left: 100 },
        head: [['INVOICE #', 'DATE']],
        body: [[invoice.invoiceNumber, format(new Date(invoice.invoiceDate), 'M/d/yyyy')]],
        theme: 'plain',
        headStyles: { fillColor: [34, 34, 34], textColor: 255, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { halign: 'center', textColor: [34, 34, 34], fontStyle: 'bold' },
        styles: { cellPadding: 2, fontSize: 10 }
      });

      // Pay Period
      const weDate = new Date(invoice.weekEnding);
      const ppStart = new Date(weDate);
      ppStart.setDate(ppStart.getDate() - 6);
      docPDF.setFontSize(10);
      docPDF.text(`${format(ppStart, 'MM/dd/yy')}-${format(weDate, 'MM/dd/yyyy')}`, 100, 55);

      // Main Table
      const tableRows: any[] = [];
      
      if (isSalaried) {
        tableRows.push(["", "Weekly Salary", "1.00", weeklySalary.toFixed(2), weeklySalary.toFixed(2)]);
      } else {
        // Regular Hours per job
        let remainingReg = totalRegularHours;
        for (const [job, data] of Object.entries(jobBreakdown)) {
          if (remainingReg <= 0) break;
          const hoursToBill = Math.min(data.hours, remainingReg);
          tableRows.push([
            "", // Date column left blank as per example
            job,
            hoursToBill.toFixed(2),
            data.rate.toFixed(2),
            (hoursToBill * data.rate).toFixed(2)
          ]);
          remainingReg -= hoursToBill;
        }
        
        // Overtime Row
        if (totalOvertimeHours > 0) {
          tableRows.push([
            "",
            "Overtime (1.5x)",
            totalOvertimeHours.toFixed(2),
            otRate.toFixed(2),
            (totalOvertimeHours * otRate).toFixed(2)
          ]);
        }
      }

      // Empty rows for spacing
      for(let i=0; i<3; i++) tableRows.push(["", "", "", "", "-"]);

      // Per Diem Row
      if (perDiemDays > 0) {
        tableRows.push([
          "",
          "Per Diem",
          perDiemDays.toFixed(2),
          perDiemRate.toFixed(2),
          (perDiemDays * perDiemRate).toFixed(2)
        ]);
      } else {
        tableRows.push(["", "Per Diem", "", "", "-"]);
      }

      // More empty rows
      for(let i=0; i<3; i++) tableRows.push(["", "", "", "", "-"]);

      autoTable(docPDF, {
        startY: 60,
        head: [['Date', 'Job', 'QTY', 'UNIT PRICE', 'AMOUNT']],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [34, 34, 34], textColor: 255, fontStyle: 'bold' },
        bodyStyles: { textColor: [34, 34, 34] },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 70 },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 30, halign: 'right' },
          4: { cellWidth: 30, halign: 'right' }
        },
        styles: { fontSize: 10, cellPadding: 3, lineColor: [167, 175, 181], lineWidth: 0.1 }
      });

      const finalY = (docPDF as any).lastAutoTable.finalY || 60;
      
      // Footer
      docPDF.setTextColor(16, 190, 102); // Green
      docPDF.setFont("helvetica", "italic");
      docPDF.text("Thank you for your business!", 14, finalY + 8);
      
      // Total Box
      docPDF.setFillColor(167, 175, 181); // Concrete Gray
      docPDF.rect(100, finalY, 85, 10, 'F');
      docPDF.setTextColor(34, 34, 34);
      docPDF.setFont("helvetica", "bold");
      docPDF.text("TOTAL", 105, finalY + 7);
      docPDF.text(totalAmount.toFixed(2), 170, finalY + 7, { align: 'right' });

      const pdfUrl = docPDF.output('bloburl');
      window.open(pdfUrl, '_blank');
    } catch (error) {
      console.error("Error previewing invoice:", error);
      alert("An error occurred while generating the preview.");
    }
  };

  const generateInvoices = async () => {
    setGenerating(true);
    try {
      // 1. Get all time logs for the selected week ending, then filter uninvoiced
      const logsQuery = query(
        collection(db, 'timeLogs'),
        where('weekEnding', '==', weekEnding)
      );
      const logsSnap = await getDocs(logsQuery);
      const logs = logsSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as TimeLog))
        .filter(log => log.invoiced === false);

      if (logs.length === 0) {
        alert("No uninvoiced time logs found for this week ending.");
        setGenerating(false);
        return;
      }

      // Group by contractor
      const groupedLogs = logs.reduce((acc, log) => {
        if (!acc[log.contractorUid]) acc[log.contractorUid] = [];
        acc[log.contractorUid].push(log);
        return acc;
      }, {} as Record<string, TimeLog[]>);

      const qbData: any[] = [];

      // Generate invoice for each contractor
      for (const [uid, contractorLogs] of Object.entries(groupedLogs)) {
        const contractorName = contractorLogs[0].contractorName;
        const contractorId = contractorLogs[0].contractorId || 'SUB-000';
        
        // Fetch contractor details for prefix and type
        const userSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', uid)));
        const userData = userSnap.empty ? null : userSnap.docs[0].data();
        
        // Calculate Invoice Number: First Initial + Last Initial - MMDDYY of payday
        const names = contractorName.split(' ');
        const firstInitial = names[0]?.[0] || '';
        const lastInitial = names.length > 1 ? names[names.length - 1][0] : '';
        
        // Payday is the Friday of the weekEnding (which is already a Friday)
        // Wait, "date (mmddyy) of the pay day (that friday). but the pay period is the week prior."
        // If weekEnding is Friday, payday is the NEXT Friday.
        const weDate = new Date(weekEnding);
        const payDate = new Date(weDate);
        payDate.setDate(payDate.getDate() + 7);
        const payDateStr = format(payDate, 'MMddyy');
        
        const invoiceNumber = `${firstInitial}${lastInitial}-${payDateStr}`;

        const isSalaried = userData?.type === 'Salaried';
        const weeklySalary = userData?.weeklySalary || 0;

        // Calculate hours, overtime, and per diem
        let totalRegularHours = 0;
        let totalOvertimeHours = 0;
        let perDiemDays = 0;
        
        const jobBreakdown: Record<string, { hours: number, rate: number }> = {};

        contractorLogs.forEach(log => {
          const hours = log.totalHours || 0;
          const rate = log.hourlyRate || 0;
          const jobKey = `${log.jobId} ${log.jobName}`;
          
          if (!jobBreakdown[jobKey]) {
            jobBreakdown[jobKey] = { hours: 0, rate };
          }
          jobBreakdown[jobKey].hours += hours;
          
          if (log.perDiem) {
            perDiemDays += 1;
          }
        });

        const totalHours = contractorLogs.reduce((sum, log) => sum + (log.totalHours || 0), 0);
        
        if (totalHours > 40) {
          totalRegularHours = 40;
          totalOvertimeHours = totalHours - 40;
        } else {
          totalRegularHours = totalHours;
        }

        const baseRate = contractorLogs[0]?.hourlyRate || 0;
        const otRate = baseRate * 1.5;
        const perDiemRate = 50.00;

        let totalAmount = 0;
        if (isSalaried) {
          totalAmount = weeklySalary + (perDiemDays * perDiemRate);
        } else {
          totalAmount = (totalRegularHours * baseRate) + (totalOvertimeHours * otRate) + (perDiemDays * perDiemRate);
        }

        const invoiceDate = new Date().toISOString();
        const dueDate = payDate;

        // Create PDF
        const docPDF = new jsPDF();
        
        // Brand Colors
        const charcoal = '#222222';
        const concrete = '#A7AFB5';
        const green = '#10BE66';

        // Header
        docPDF.setTextColor(charcoal);
        docPDF.setFont("helvetica", "bold");
        docPDF.setFontSize(24);
        docPDF.text(contractorName, 14, 22);
        
        docPDF.setTextColor(concrete);
        docPDF.setFontSize(20);
        docPDF.text("INVOICE", 150, 22);
        
        // Sub-header (Job Code)
        docPDF.setTextColor(charcoal);
        docPDF.setFontSize(10);
        docPDF.text(`Base-5106`, 100, 35); // Defaulting to Base 1099 job code for now
        
        // Info Table
        autoTable(docPDF, {
          startY: 38,
          margin: { left: 100 },
          head: [['INVOICE #', 'DATE']],
          body: [[invoiceNumber, format(new Date(invoiceDate), 'M/d/yyyy')]],
          theme: 'plain',
          headStyles: { fillColor: [34, 34, 34], textColor: 255, fontStyle: 'bold', halign: 'center' },
          bodyStyles: { halign: 'center', textColor: [34, 34, 34], fontStyle: 'bold' },
          styles: { cellPadding: 2, fontSize: 10 }
        });

        // Pay Period
        const ppStart = new Date(weDate);
        ppStart.setDate(ppStart.getDate() - 6);
        docPDF.setFontSize(10);
        docPDF.text(`${format(ppStart, 'MM/dd/yy')}-${format(weDate, 'MM/dd/yyyy')}`, 100, 55);

        // Main Table
        const tableRows: any[] = [];
        
        if (isSalaried) {
          tableRows.push(["", "Weekly Salary", "1.00", weeklySalary.toFixed(2), weeklySalary.toFixed(2)]);
        } else {
          // Regular Hours per job
          let remainingReg = totalRegularHours;
          for (const [job, data] of Object.entries(jobBreakdown)) {
            if (remainingReg <= 0) break;
            const hoursToBill = Math.min(data.hours, remainingReg);
            tableRows.push([
              "", // Date column left blank as per example
              job,
              hoursToBill.toFixed(2),
              data.rate.toFixed(2),
              (hoursToBill * data.rate).toFixed(2)
            ]);
            remainingReg -= hoursToBill;
          }
          
          // Overtime Row
          if (totalOvertimeHours > 0) {
            tableRows.push([
              "",
              "Overtime (1.5x)",
              totalOvertimeHours.toFixed(2),
              otRate.toFixed(2),
              (totalOvertimeHours * otRate).toFixed(2)
            ]);
          }
        }

        // Empty rows for spacing
        for(let i=0; i<3; i++) tableRows.push(["", "", "", "", "-"]);

        // Per Diem Row
        if (perDiemDays > 0) {
          tableRows.push([
            "",
            "Per Diem",
            perDiemDays.toFixed(2),
            perDiemRate.toFixed(2),
            (perDiemDays * perDiemRate).toFixed(2)
          ]);
        } else {
          tableRows.push(["", "Per Diem", "", "", "-"]);
        }

        // More empty rows
        for(let i=0; i<3; i++) tableRows.push(["", "", "", "", "-"]);

        autoTable(docPDF, {
          startY: 60,
          head: [['Date', 'Job', 'QTY', 'UNIT PRICE', 'AMOUNT']],
          body: tableRows,
          theme: 'grid',
          headStyles: { fillColor: [34, 34, 34], textColor: 255, fontStyle: 'bold' },
          bodyStyles: { textColor: [34, 34, 34] },
          columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 70 },
            2: { cellWidth: 25, halign: 'center' },
            3: { cellWidth: 30, halign: 'right' },
            4: { cellWidth: 30, halign: 'right' }
          },
          styles: { fontSize: 10, cellPadding: 3, lineColor: [167, 175, 181], lineWidth: 0.1 }
        });

        const finalY = (docPDF as any).lastAutoTable.finalY || 60;
        
        // Footer
        docPDF.setTextColor(16, 190, 102); // Green
        docPDF.setFont("helvetica", "italic");
        docPDF.text("Thank you for your business!", 14, finalY + 8);
        
        // Total Box
        docPDF.setFillColor(167, 175, 181); // Concrete Gray
        docPDF.rect(100, finalY, 85, 10, 'F');
        docPDF.setTextColor(34, 34, 34);
        docPDF.setFont("helvetica", "bold");
        docPDF.text("TOTAL", 105, finalY + 7);
        docPDF.text(totalAmount.toFixed(2), 170, finalY + 7, { align: 'right' });

        docPDF.save(`${invoiceNumber}.pdf`);

        // Save Invoice to DB
        await addDoc(collection(db, 'invoices'), {
          invoiceNumber,
          contractorUid: uid,
          contractorName,
          contractorId,
          weekEnding,
          totalHours,
          totalAmount,
          invoiceDate,
          dueDate: dueDate.toISOString(),
          status: 'Generated'
        });

        // Update TimeLogs
        for (const log of contractorLogs) {
          await updateDoc(doc(db, 'timeLogs', log.id), {
            invoiced: true,
            invoiceNumber
          });
        }

        // Add to QB Data
        qbData.push({
          "Vendor Name": contractorName,
          "Bill Date": format(new Date(invoiceDate), 'MM/dd/yyyy'),
          "Due Date": format(dueDate, 'MM/dd/yyyy'),
          "Account": "Subcontractor Labor",
          "Description": `Week ending ${format(new Date(weekEnding), 'MM/dd/yyyy')}`,
          "Amount": totalAmount.toFixed(2),
          "Reference No": invoiceNumber
        });
      }

      // Generate CSV
      const csv = Papa.unparse(qbData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `QB_Import_${weekEnding}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      fetchInvoices();
      alert("Invoices and CSV generated successfully. PDFs and CSV have been downloaded.");
    } catch (error) {
      console.error("Error generating invoices:", error);
      alert("An error occurred while generating invoices.");
    }
    setGenerating(false);
  };

  if (loading) return <div className="p-8">Loading invoices...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#222222] uppercase tracking-wider">Invoices</h2>
        <div className="flex gap-4 items-center">
          <input 
            type="date" 
            value={weekEnding}
            onChange={(e) => setWeekEnding(e.target.value)}
            className="p-2 border border-gray-300 rounded outline-none"
          />
          <button 
            onClick={generateInvoices}
            disabled={generating}
            className="bg-[#10BE66] text-white px-4 py-2 rounded font-bold hover:bg-[#0e9f55] transition-colors disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Run Weekly Invoices'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200 text-sm uppercase tracking-wider text-gray-600">
              <th className="p-4 font-semibold">Invoice #</th>
              <th className="p-4 font-semibold">Contractor</th>
              <th className="p-4 font-semibold">Week Ending</th>
              <th className="p-4 font-semibold">Hours</th>
              <th className="p-4 font-semibold">Amount</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoices.map(invoice => (
              <tr key={invoice.id} className="hover:bg-gray-50">
                <td className="p-4 font-medium text-[#222222]">{invoice.invoiceNumber}</td>
                <td className="p-4 text-gray-600">{invoice.contractorName}</td>
                <td className="p-4 text-gray-600">{format(new Date(invoice.weekEnding), 'MM/dd/yyyy')}</td>
                <td className="p-4 text-gray-600">{invoice.totalHours?.toFixed(2)}</td>
                <td className="p-4 font-medium text-[#222222]">${invoice.totalAmount?.toFixed(2)}</td>
                <td className="p-4">
                  <span className="px-2 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-blue-100 text-blue-800">
                    {invoice.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button 
                    onClick={() => previewInvoice(invoice)}
                    className="p-2 text-gray-500 hover:text-[#10BE66] transition-colors rounded-full hover:bg-gray-100"
                    title="Preview PDF"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">No invoices generated yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

```

## File: `src/lib/utils.ts`

```tsx
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

```

## File: `src/lib/firebase.ts`

```tsx
// Mock Firebase to prevent the app from crashing while we transition to Google Sheets API
export const db = {} as any;
export const app = {} as any;

```

## File: `src/lib/mockFirebase.ts`

```tsx
export const collection = () => ({});
export const query = () => ({});
export const getDocs = async () => ({ docs: [], empty: true, forEach: () => {} });
export const where = () => ({});
export const addDoc = async () => ({ id: 'mock-id' });
export const setDoc = async () => ({});
export const updateDoc = async () => ({});
export const doc = () => ({});
export const serverTimestamp = () => new Date();
export const orderBy = () => ({});

```

## File: `GOOGLE_SHEETS_SETUP.md`

```markdown
# Step 1: Create a Google Apps Script

To connect this app directly to your Google Sheet without Firebase, we'll use a simple Google Apps Script as the bridge.

1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1Vz7uSHlPKeGWYRcv9dW6wEElxtvWxxegzqp36PdeUIQ/edit
2. Click on **Extensions > Apps Script** from the top menu.
3. Replace all the code in the editor with the code below:

```javascript
const SPREADSHEET_ID = '1Vz7uSHlPKeGWYRcv9dW6wEElxtvWxxegzqp36PdeUIQ';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    if (action === 'clockIn') {
      return handleClockIn(data.payload);
    } else if (action === 'clockOut') {
      return handleClockOut(data.payload);
    } else if (action === 'getJobs') {
      return getJobs();
    } else if (action === 'getContractors') {
      return getContractors();
    }
    
    return ContentService.createTextOutput(JSON.stringify({ error: 'Unknown action' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleClockIn(payload) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('TimeLogs');
  // LogID | ContractorEmail | JobID | StartJobTime | EndJobTime | HoursWorked | ClaimPerDiem | Invoiced | InvoiceRef
  const logId = Utilities.getUuid();
  sheet.appendRow([
    logId, 
    payload.contractorEmail, 
    payload.jobId, 
    new Date().toISOString(), 
    '', 
    '', 
    payload.claimPerDiem || false, 
    false, 
    ''
  ]);
  return ContentService.createTextOutput(JSON.stringify({ success: true, logId: logId }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleClockOut(payload) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('TimeLogs');
  const data = sheet.getDataRange().getValues();
  const endTime = new Date();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === payload.logId && !data[i][4]) { // Match ID and end time must be empty
      const startTime = new Date(data[i][3]);
      const hours = Math.abs(endTime - startTime) / 36e5; // Convert ms to hours
      
      sheet.getRange(i + 1, 5).setValue(endTime.toISOString());
      sheet.getRange(i + 1, 6).setValue(hours.toFixed(2));
      return ContentService.createTextOutput(JSON.stringify({ success: true, hours: hours.toFixed(2) }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ error: 'Active log not found' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Ensure CORS for browser requests
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.JSON);
}
```

# Step 2: Publish the Script
1. Click the blue **Deploy** button (top right), then **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Under "Execute as", select **Me**.
4. Under "Who has access", select **Anyone**.
5. Click **Deploy**. (You may need to authorize access – click "Review Permissions", select your Google account, click "Advanced", and "Go to project (unsafe)").
6. **Copy the "Web app URL"** displayed on the final screen.

# Step 3: Connect the App
Once you have the Web App URL, paste it here in our chat, and I will connect the Sunbelt Sports app directly to it!

```

## File: `AppSheet_Migration_Blueprint.md`

```markdown
# Sunbelt Sports - AppSheet Migration Blueprint

This document contains the complete schema, business logic, and design guidelines required to recreate the Sunbelt Sports Command Center & Field Portal in Google AppSheet. 

You can copy and paste this entire document into any AI to have it generate the exact AppSheet formulas, Google Apps Scripts, and configuration steps needed.

## 1. App Concept & Terminology
*   **Purpose:** A dual-sided operational tool. Contractors use it as a mobile field portal to clock in/out and claim per diem. Admins use it as a command center to track active jobs and generate PDF invoices.
*   **Terminology:** Use construction operations terminology (e.g., "Clock In", "Base Alignment", "GAB Tons Laid", "Per Diem"). Avoid generic corporate jargon.

## 2. Design & Branding (AppSheet UX/UI Settings)
*   **Primary Color (Header/Footer):** Asphalt Charcoal (`#222222`)
*   **Secondary/Structural:** Concrete Gray (`#A7AFB5`)
*   **Positive/Action Buttons:** Bright Green (`#10BE66`)
*   **Alerts/Warnings:** Safety Yellow & Red
*   **Typography:** Condensed industrial sans-serif (e.g., Roboto Condensed).
*   **Style:** Ultra-polished, flat, enterprise UI. No glossy 3D effects or drop shadows.

## 3. Database Schema (Google Sheets Structure)
Create a Google Sheet with the following 4 tabs and exact column headers:

### Tab 1: Users
| Column Name | Data Type | Notes / AppSheet Config |
| :--- | :--- | :--- |
| Email | Email | **Key**, Required |
| Name | Text | Required |
| Role | Enum | "Admin" or "Contractor" |
| ContractorID | Text | e.g., "SUB-001" |
| HourlyRate | Price | |
| PaymentTerms | Text | e.g., "Net 7 Arrears", "Weekly" |
| Status | Enum | "Active", "Inactive" |
| Type | Enum | "Hourly", "Salaried" |
| WeeklySalary | Price | |
| InvoicePrefix | Text | e.g., "PG", "LP" |

### Tab 2: Jobs
| Column Name | Data Type | Notes / AppSheet Config |
| :--- | :--- | :--- |
| JobID | Text | **Key**, e.g., "25-177" |
| JobName | Text | Required, e.g., "Brewer High School" |
| Status | Enum | "Active", "Completed" |

### Tab 3: TimeLogs
| Column Name | Data Type | Notes / AppSheet Config |
| :--- | :--- | :--- |
| LogID | Text | **Key**, Initial Value: `UNIQUEID()` |
| ContractorEmail | Ref | Ref to `Users` table. Initial Value: `USEREMAIL()` |
| JobID | Ref | Ref to `Jobs` table. |
| StartJobTime | DateTime | Initial Value: `NOW()` |
| EndJobTime | DateTime | |
| HoursWorked | Decimal | App Formula: `TOTALHOURS([EndJobTime] - [StartJobTime])` |
| ClaimPerDiem | Yes/No | |
| Invoiced | Yes/No | Default: `FALSE` |
| InvoiceRef | Ref | Ref to `Invoices` table (optional until invoiced) |

### Tab 4: Invoices
| Column Name | Data Type | Notes / AppSheet Config |
| :--- | :--- | :--- |
| InvoiceID | Text | **Key**, Initial Value: `UNIQUEID()` |
| InvoiceNumber | Text | e.g., "INV-PG-1024" |
| ContractorEmail | Ref | Ref to `Users` table. |
| WeekEnding | Date | |
| TotalAmount | Price | |
| Status | Enum | "Generated", "Paid" |
| InvoicePDF | File | Generated by AppSheet Automation |

## 4. Security Filters (Data Access Control)
To ensure contractors only see their own data, apply these Security Filters in AppSheet (Data > Security > Security Filters):

*   **TimeLogs Table:** `OR(USEREMAIL() = [ContractorEmail], LOOKUP(USEREMAIL(), "Users", "Email", "Role") = "Admin")`
*   **Invoices Table:** `OR(USEREMAIL() = [ContractorEmail], LOOKUP(USEREMAIL(), "Users", "Email", "Role") = "Admin")`

## 5. Required AppSheet Views (UX)
1.  **Start Job (Form View):** 
    *   Data: `TimeLogs`
    *   Position: Center/Middle (Primary action for contractors).
    *   Fields to show: `JobID`. (`ContractorEmail` and `StartJobTime` are auto-filled).
2.  **My Time (Deck View):**
    *   Data: `TimeLogs`
    *   Sort: `StartJobTime` (Descending).
    *   Show to: Contractors.
3.  **Command Center (Dashboard View):**
    *   Data: `Jobs` and `Users`
    *   Show to: Admins only. `Show If`: `LOOKUP(USEREMAIL(), "Users", "Email", "Role") = "Admin"`

## 6. Automation (PDF Invoice Generation)
*   **Trigger:** Data Change -> Adds Only on the `Invoices` table.
*   **Action:** Create a new file (PDF).
*   **Template Logic:** The PDF template should group `TimeLogs` where `[InvoiceRef] = [_THISROW].[InvoiceID]`.
*   **Calculations in Template:** 
    *   Line Total = `[HoursWorked] * [ContractorEmail].[HourlyRate]`
    *   Per Diem = If `[ClaimPerDiem] = TRUE`, add $50.00.
```

