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
