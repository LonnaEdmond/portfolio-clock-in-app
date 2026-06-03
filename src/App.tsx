import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Database, 
  CheckCircle2, 
  ChevronRight, 
  Crosshair,
  ServerCog,
  Smartphone,
  Cpu,
  RefreshCw,
  GitPullRequest,
  Activity,
  X
} from 'lucide-react';

export default function App() {
  const [viewMode, setViewMode] = useState<'contractor' | 'admin' | 'architecture'>('contractor');
  
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans p-4 md:p-8 lg:p-12 overflow-x-hidden selection:bg-terracotta selection:text-white">
      {/* Top Header */}
      <header className="max-w-7xl mx-auto flex items-center justify-between mb-16 animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <Cpu className="w-4 h-4 text-zinc-400" />
          </div>
          <span className="font-mono text-xs text-zinc-400 uppercase tracking-widest">Portfolio | Case Study 01</span>
        </div>
        <div className="flex gap-4">
           {['contractor', 'admin', 'architecture'].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode as any)}
                className={`py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 uppercase tracking-wider ${
                  viewMode === mode 
                    ? 'bg-zinc-900 border-terracotta border text-white shadow-[0_0_15px_rgba(234,88,12,0.15)]' 
                    : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-50'
                }`}
              >
                {mode === 'architecture' ? 'Architecture' : `${mode} UI`}
              </button>
           ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-12 lg:gap-24 items-start relative pb-20">
        
        {/* Left Column: Context & Narrative */}
        <section className="w-full lg:w-[35%] flex flex-col gap-10 animate-fade-up delay-100 relative z-10">
          <div>
            <h1 className="text-5xl lg:text-6xl font-serif text-white leading-[1.1] mb-6">
              1099 Field Portal & <br />
              <span className="text-zinc-500 italic">Command Center</span>
            </h1>
            <p className="text-zinc-400 text-lg leading-relaxed">
              Bridging the gap between active construction jobsites and backend financial operations. A high-leverage tool replacing manual payroll ingestion with an automated, location-aware digital ledger.
            </p>
          </div>

          <div className="space-y-6">
            <h3 className="font-mono text-sm text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2">Business Bottlenecks Solved</h3>
            
            {/* Context Item 1 */}
            <div className="group flex gap-4 items-start p-4 -mx-4 rounded-xl hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all duration-200 cursor-default">
              <div className="bg-zinc-950 border border-zinc-800 p-2 rounded-lg group-hover:border-terracotta group-hover:text-terracotta transition-colors">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-white font-medium mb-1">Geolocation Compliance Shield</h4>
                <p className="text-sm text-zinc-400 leading-relaxed">Requires a passive GPS ping locking the contractor within a 50m radius of the assigned site before the clock starts. <span className="text-terracotta font-mono text-xs block mt-2">ROI: Prevents thousands in payroll leakage.</span></p>
              </div>
            </div>

            {/* Context Item 2 */}
            <div className="group flex gap-4 items-start p-4 -mx-4 rounded-xl hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all duration-200 cursor-default">
              <div className="bg-zinc-950 border border-zinc-800 p-2 rounded-lg group-hover:border-terracotta group-hover:text-terracotta transition-colors">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-white font-medium mb-1">Per Diem Auto-Tagging</h4>
                <p className="text-sm text-zinc-400 leading-relaxed">Eliminates manual finance review. A single boolean toggle routes a guaranteed $50 stipend directly into the generated invoice metadata payload.</p>
              </div>
            </div>
            
            {/* Boxed Stat */}
            <div className="mt-8 relative overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800 p-6">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                 <Database className="w-24 h-24" />
               </div>
               <p className="font-mono text-terracotta mb-2">Efficiency Gain</p>
               <h4 className="text-2xl font-serif text-white mb-2">40+ hours saved <span className="text-zinc-500 italic">weekly</span></h4>
               <p className="text-sm text-zinc-400">Replaces disparate text messages, paper logs, and manual QuickBooks data entry for a 100+ contractor fleet.</p>
            </div>
          </div>
        </section>


        {/* Right Column: Interactive Prototype / Flow Diagram */}
        <section className="w-full lg:w-[65%] flex justify-center animate-fade-up delay-200 relative z-10">
          {viewMode === 'architecture' ? (
            <ArchitecturePanel />
          ) : (
            <div className="flex gap-8 items-stretch relative">
               <MobileDevice view={viewMode} />
               <LogicOverlayPanel view={viewMode} />
            </div>
          )}
        </section>
      </main>

      {/* Decorative Matrix/Grid Background */}
      <div 
        className="fixed inset-0 z-0 opacity-10 pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '32px 32px' }}
      ></div>
    </div>
  );
}

// -----------------------------
// Interactive Mobile Canvas
// -----------------------------
function MobileDevice({ view }: { view: 'contractor' | 'admin' }) {
  const [clockStatus, setClockStatus] = useState<'idle' | 'locating' | 'clocked-in' | 'clocked-out'>('idle');
  const [logText, setLogText] = useState('Awaiting Input...');
  const [perDiem, setPerDiem] = useState(false);
  const [job, setJob] = useState('25-177 - Brewer High School');

  const handleAction = () => {
    if (clockStatus === 'idle') {
      setClockStatus('locating');
      setLogText('Initializing Sat-Link...');
      setTimeout(() => setLogText('Verifying Site Bounds (50m radius)...'), 600);
      setTimeout(() => setLogText('GPS Lock Established. Writing Ledger...'), 1200);
      setTimeout(() => {
        setClockStatus('clocked-in');
        setLogText('Session Active. Recording metadata.');
      }, 1800);
    } else if (clockStatus === 'clocked-in') {
      setClockStatus('clocked-out');
      setLogText('Session Ended. Ledger Updated.');
      setTimeout(() => {
         setClockStatus('idle');
         setLogText('Awaiting Input...');
      }, 3000);
    }
  };

  return (
    <div className="relative group shrink-0">
      {/* Device Frame */}
      <div className="w-[340px] h-[720px] bg-white rounded-[3rem] border-[10px] border-zinc-900 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden flex flex-col justify-between transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02]">
        
        {/* Dynamic Island / Notch */}
        <div className="absolute top-0 inset-x-0 h-7 flex justify-center z-50 pointer-events-none">
          <div className="w-[120px] bg-zinc-900 h-6 rounded-b-3xl"></div>
        </div>

        {/* View Routing */}
        {view === 'contractor' ? (
          <div className="h-full flex flex-col px-6 pt-14 pb-8 overflow-y-auto custom-scrollbar bg-zinc-50 rounded-[2.5rem] relative">
            
            {/* Top decorative gradient for a premium feel */}
            <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-white to-transparent pointer-events-none"></div>

            {/* Header */}
            <div className="mb-8 relative z-10">
              <h4 className="font-sans font-semibold text-zinc-400 text-[10px] tracking-widest uppercase mb-1.5">Contractor App</h4>
              <h2 className="text-zinc-900 font-semibold text-2xl tracking-tight flex items-center justify-between">
                Field Portal <span className="bg-white text-zinc-600 px-2.5 py-1 rounded-full text-[10px] border border-zinc-200 shadow-sm font-medium tracking-wide">v2.1</span>
              </h2>
            </div>
            
            {/* Job Select */}
            <div className="mb-6 space-y-2.5 relative z-10">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">Target Assignment</label>
              <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 text-sm text-zinc-800 flex justify-between items-center cursor-pointer hover:border-zinc-300 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                <span className="font-medium truncate">{job}</span>
                <div className="bg-zinc-50 p-1 rounded-full"><ChevronRight className="w-4 h-4 text-zinc-400" /></div>
              </div>
            </div>

            {/* Per Diem Toggle */}
            <div className="mb-10 bg-white border border-zinc-200/80 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-zinc-300 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)] relative z-10" onClick={() => setPerDiem(!perDiem)}>
               <div>
                  <h4 className="text-sm font-semibold text-zinc-800 mb-0.5">Per Diem Request</h4>
                  <p className="text-xs text-zinc-500">+ $50.00 Stipend Flag</p>
               </div>
               <div className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ease-in-out relative shadow-inner ${perDiem ? 'bg-terracotta' : 'bg-zinc-200'}`}>
                 <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ease-in-out ${perDiem ? 'translate-x-5' : 'translate-x-0'}`}></div>
               </div>
            </div>

            {/* Big Action Button */}
            <div className="flex-1 flex flex-col items-center justify-center -mt-4 relative z-10">
              <button 
                onClick={handleAction}
                disabled={clockStatus === 'locating'}
                className={`relative w-52 h-52 rounded-full flex flex-col items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  clockStatus === 'idle' || clockStatus === 'clocked-out'
                   ? 'bg-zinc-900 border-[6px] border-white text-[#10BE66] hover:scale-105 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] hover:shadow-[0_25px_50px_-15px_rgba(0,0,0,0.4)]' 
                   : clockStatus === 'locating'
                   ? 'bg-white border border-zinc-200 overflow-hidden mechanical-loading cursor-wait text-terracotta shadow-md'
                   : 'bg-red-500 border-[6px] border-red-50 text-white hover:scale-105 shadow-[0_20px_40px_-15px_rgba(239,68,68,0.4)]'
                }`}
              >
                {clockStatus === 'locating' ? (
                   <Crosshair className="w-12 h-12 animate-pulse mb-3 z-10 text-terracotta" />
                ) : clockStatus === 'idle' || clockStatus === 'clocked-out' ? (
                   <Activity className="w-12 h-12 mb-3 z-10 text-white" />
                ) : (
                   <X className="w-12 h-12 mb-3 z-10 text-white" />
                )}
                <span className={`font-mono font-bold tracking-widest uppercase z-10 text-[13px] ${clockStatus === 'idle' || clockStatus === 'clocked-out' ? 'text-white' : ''}`}>
                  {clockStatus === 'locating' ? 'SCANNING' : clockStatus === 'idle' || clockStatus === 'clocked-out' ? 'CLOCK IN' : 'CLOCK OUT'}
                </span>
                
                {/* Ping rings */}
                {clockStatus === 'locating' && (
                  <div className="absolute inset-0 rounded-full border-2 border-terracotta/20 animate-ping"></div>
                )}
              </button>
            </div>

            {/* Terminal Log */}
            <div className="mt-auto bg-white rounded-2xl p-4 text-[11px] font-mono text-zinc-500 border border-zinc-200/80 flex flex-col shadow-[0_2px_10px_rgba(0,0,0,0.02)] relative z-10">
              <span className="text-zinc-800 border-b border-zinc-100 pb-2 mb-2 uppercase font-semibold tracking-wider text-[10px]">System Output</span>
              <span className={`${clockStatus === 'locating' ? 'text-terracotta font-medium' : 'text-zinc-500'}`}>&gt; {logText}</span>
              {clockStatus === 'clocked-in' && <span className="text-[#10BE66] font-medium mt-1.5">&gt; STATUS: OK - UPLINK ACTIVE</span>}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col bg-[#0f0f12]">
            {/* Top Bar Map View (Mock) */}
            <div className="h-44 bg-zinc-900 border-b border-zinc-800 relative overflow-hidden">
               {/* Grid */}
               <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
               <div className="absolute bottom-4 left-4 font-mono text-xs text-white bg-black/50 px-2 py-1 rounded backdrop-blur border border-zinc-800 z-10">
                 ACTIVE LOCATIONS: 3
               </div>
               {/* Radars */}
               <div className="absolute top-10 left-10 w-4 h-4 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]"></div>
               <div className="absolute top-20 right-16 w-4 h-4 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]"></div>
               <div className="absolute bottom-10 right-20 w-4 h-4 rounded-full bg-terracotta shadow-[0_0_10px_#ea580c] animate-pulse"></div>
            </div>

            <div className="px-5 py-6">
              <h3 className="text-white font-serif text-xl border-b border-zinc-800 pb-3 mb-4">Command Center</h3>
              
              <div className="space-y-3">
                {/* Contractor Item */}
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3 hover:border-zinc-700 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h5 className="text-white text-sm font-medium">Pedro Gutierrez</h5>
                      <span className="text-zinc-500 text-[10px] font-mono">ID: SUB-001</span>
                    </div>
                    <span className="bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-0.5 rounded text-[10px] uppercase font-mono">Active</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400 text-xs">
                    <Clock className="w-3 h-3" />
                    <span>04:15 HRS • 25-177</span>
                  </div>
                </div>

                {/* Contractor Item */}
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3 hover:border-zinc-700 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h5 className="text-white text-sm font-medium">Luis Perez</h5>
                      <span className="text-zinc-500 text-[10px] font-mono">ID: SUB-042</span>
                    </div>
                    <span className="bg-zinc-800 text-zinc-400 border border-zinc-700 px-2 py-0.5 rounded text-[10px] uppercase font-mono">Out</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400 text-xs">
                    <Clock className="w-3 h-3" />
                    <span>--:-- HRS • N/A</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Decorative Glow behind device */}
      <div className="absolute inset-0 bg-terracotta/5 blur-[100px] -z-10 rounded-full scale-105 pointer-events-none transition-opacity duration-1000"></div>
    </div>
  );
}

// -----------------------------
// Side Logical Overlay Panel
// -----------------------------
function LogicOverlayPanel({ view }: { view: 'contractor' | 'admin' }) {
  if (view === 'contractor') {
    return (
      <div className="hidden lg:flex flex-col gap-4 w-[280px] shrink-0 pt-16">
        <div className="font-mono text-xs text-terracotta uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
          <GitPullRequest className="w-4 h-4" /> Live Logic Execution
        </div>
        
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 group hover:border-zinc-700 transition-colors">
          <div className="text-[10px] text-zinc-500 mb-1 font-mono">IF: GPS_Lock === TRUE</div>
          <div className="text-[10px] text-zinc-500 mb-2 font-mono">AND: Job_Selected !== NULL</div>
          <div className="text-white text-sm border-l-2 border-terracotta pl-3">
            Trigger: Allow Write Mutator
          </div>
          <p className="text-xs text-zinc-400 mt-2">Binds current UTC timestamp to Contractor UID and pushes to data pool.</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 group hover:border-zinc-700 transition-colors">
          <div className="text-[10px] text-zinc-500 mb-1 font-mono">ON: POST /payload</div>
          <div className="text-white text-sm border-l-2 border-green-500 pl-3">
            Append: <code>&lbrace; perDiem: true &rbrace;</code>
          </div>
          <p className="text-xs text-zinc-400 mt-2">Forces parsing engine generating PDF invoices to automatically add a $50 stipend line-item.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="hidden lg:flex flex-col gap-4 w-[280px] shrink-0 pt-16">
      <div className="font-mono text-xs text-terracotta uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
        <Database className="w-4 h-4" /> Data Aggregation Map
      </div>
      
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 group hover:border-zinc-700 transition-colors">
        <div className="text-[10px] text-zinc-500 mb-1 font-mono">SECURITY_RULE override</div>
        <div className="text-white text-sm border-l-2 border-blue-500 pl-3">
           <code>ROLE === 'Admin'</code>
        </div>
        <p className="text-xs text-zinc-400 mt-2">Bypasses row-level security limits filtering "My Data Only", mapping 109 independent views onto a single dashboard.</p>
      </div>
    </div>
  );
}

// -----------------------------
// Full Data Flow Architecture Panel
// -----------------------------
function ArchitecturePanel() {
  return (
    <div className="w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-[2rem] p-8 md:p-12 relative overflow-hidden shadow-2xl">
      <div className="absolute top-0 right-0 p-8 opacity-5">
        <ServerCog className="w-64 h-64" />
      </div>

      <div className="relative z-10">
        <div className="mb-10">
          <span className="font-mono text-terracotta text-sm uppercase tracking-widest block mb-2">Systems Pipeline</span>
          <h2 className="text-3xl font-serif text-white">AppSheet &rarr; Google Sheets Migration</h2>
          <p className="text-zinc-400 mt-2 max-w-xl leading-relaxed">
            While building the React prototype, I also designed the transition architecture needed to replace expensive AppSheet publishing fees with a free script-driven Google Sheets backend.
          </p>
        </div>

        {/* Technical Flowchart UI */}
        <div className="relative w-full border border-zinc-800 rounded-xl bg-zinc-950 p-6 font-mono text-[11px] md:text-sm overflow-x-auto text-zinc-400">
           <div className="text-zinc-500 mb-4">// System Block Diagram</div>
           
           <div className="flex flex-col gap-2">
             <div className="flex items-center gap-4">
                <div className="w-40 px-4 py-2 border border-zinc-700 rounded text-white bg-zinc-900 flex justify-center items-center gap-2 transition-all hover:border-terracotta hover:scale-105">
                  <Smartphone className="w-4 h-4" /> Client UI
                </div>
                <div className="text-zinc-600">-&gt; JSON POST</div>
                <div className="flex-1 px-4 py-2 border border-blue-900/50 rounded text-blue-300 bg-blue-950/20 text-center">
                  Google Apps Script (Web App)
                </div>
             </div>
             
             <div className="flex items-center gap-4 ml-[11rem] pl-2 border-l border-zinc-800 py-3">
                <div className="text-zinc-600">| parse() </div>
                <div className="text-zinc-600">| map(uuid, timestamp) </div>
             </div>

             <div className="flex items-center gap-4">
                <div className="w-40 px-4 py-2 opacity-0">Spacer</div>
                <div className="text-zinc-600">---&gt; append()</div>
                <div className="flex-1 px-4 py-2 border border-green-900/50 rounded text-green-400 bg-green-950/20 flex flex-col items-center">
                  <span className="mb-1">Google Sheets DB</span>
                  <span className="text-[10px] text-green-600 border-t border-green-900/50 pt-1 mt-1 w-full text-center">Tabs: TimeLogs, Jobs, Master</span>
                </div>
             </div>
           </div>

           <div className="mt-8 pt-6 border-t border-zinc-800 grid grid-cols-1 md:grid-cols-2 gap-8">
             <div>
               <h4 className="text-white mb-2 pb-1 border-b border-zinc-800">Migration Blueprints Written</h4>
               <ul className="space-y-2">
                 <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-[#10BE66]"/> <code>GOOGLE_SHEETS_SETUP.md</code></li>
                 <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-[#10BE66]"/> <code>AppSheet_Migration.md</code></li>
                 <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-[#10BE66]"/> <code>doPost() App Script</code></li>
               </ul>
             </div>
             <div>
               <h4 className="text-white mb-2 pb-1 border-b border-zinc-800">Security Model</h4>
               <p className="text-zinc-500 leading-relaxed">
                 Migrating to a headless Script DB eliminates AppSheet licensing per user (~$10/user/mo across 109 contractors) while restricting frontend SQL-like exposure.
               </p>
             </div>
           </div>
        </div>

      </div>
    </div>
  );
}
