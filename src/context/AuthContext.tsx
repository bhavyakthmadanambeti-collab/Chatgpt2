import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  changePassword: (current: string, next: string) => Promise<void>;
  updateProfile: (data: { name?: string; avatar?: string }) => Promise<void>;
  mustChangePasswordModalOpen: boolean;
  setMustChangePasswordModalOpen: (open: boolean) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('chatgpt_token'));
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [mustChangePasswordModalOpen, setMustChangePasswordModalOpen] = useState<boolean>(false);

  const fetchCurrentUser = async (authToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        if (data.user?.mustChangePassword) {
          setMustChangePasswordModalOpen(true);
        }
      } else {
        localStorage.removeItem('chatgpt_token');
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to fetch user:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCurrentUser(token);
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    localStorage.setItem('chatgpt_token', data.token);
    setToken(data.token);
    setUser(data.user);

    if (data.user.mustChangePassword) {
      setMustChangePasswordModalOpen(true);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    localStorage.setItem('chatgpt_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('chatgpt_token');
    setToken(null);
    setUser(null);
    setMustChangePasswordModalOpen(false);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!token) throw new Error('Not authenticated');
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Password update failed');
    }

    if (data.token) {
      localStorage.setItem('chatgpt_token', data.token);
      setToken(data.token);
    }
    if (data.user) {
      setUser(data.user);
    }
    setMustChangePasswordModalOpen(false);
  };

  const updateProfile = async (profileData: { name?: string; avatar?: string }) => {
    if (!token) return;
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(profileData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update profile');
    setUser(data.user);
  };

  const refreshUser = async () => {
    if (token) await fetchCurrentUser(token);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        changePassword,
        updateProfile,
        mustChangePasswordModalOpen,
        setMustChangePasswordModalOpen,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
