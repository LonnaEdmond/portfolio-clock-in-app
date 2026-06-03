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
