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
