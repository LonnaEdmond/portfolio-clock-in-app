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
