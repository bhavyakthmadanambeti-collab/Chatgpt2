import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Cpu,
  Settings,
  Terminal,
  Activity,
  HardDrive,
  ShieldCheck,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Save,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { User, SystemHealth, SystemSettings, SystemLog } from '../types';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
}

type TabType = 'overview' | 'providers' | 'users' | 'settings' | 'logs';

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  token,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pingStatus, setPingStatus] = useState<Record<string, { status: string; latency?: number; message?: string }>>({});
  const [userSearch, setUserSearch] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && token) {
      loadAllData();
    }
  }, [isOpen, token]);

  const loadAllData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Health
      const healthRes = await fetch('/api/admin/health', { headers });
      if (healthRes.ok) {
        const data = await healthRes.json();
        setHealth(data);
      }

      // 2. Users
      const usersRes = await fetch('/api/admin/users', { headers });
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users);
      }

      // 3. Settings
      const settingsRes = await fetch('/api/admin/settings', { headers });
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings(data.settings);
      }

      // 4. Logs
      const logsRes = await fetch('/api/admin/logs?limit=100', { headers });
      if (logsRes.ok) {
        const data = await logsRes.json();
        setLogs(data.logs);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load admin metrics');
    } finally {
      setIsLoading(false);
    }
  };

  const testPing = async (provider: string) => {
    setPingStatus(prev => ({ ...prev, [provider]: { status: 'testing' } }));
    try {
      const res = await fetch('/api/ai/ping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      setPingStatus(prev => ({
        ...prev,
        [provider]: {
          status: data.success ? 'online' : 'offline',
          latency: data.latencyMs,
          message: data.message,
        },
      }));
    } catch (err: any) {
      setPingStatus(prev => ({
        ...prev,
        [provider]: {
          status: 'offline',
          message: err.message,
        },
      }));
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    const newStatus = user.status === 'active' ? 'disabled' : 'active';
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update user');
      }
      setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, status: newStatus } : u)));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user and all their conversation history?')) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete user');
      }
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (err: any) {
      alert('Failed to save settings: ' + err.message);
    }
  };

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.name.toLowerCase().includes(userSearch.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[88vh] bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col overflow-hidden text-gray-900 dark:text-gray-100">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#1f1f1f]/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
                <span>Owner & Administrator Dashboard</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  bhavyakthmadanambeti@gmail.com
                </span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                System health, local Ollama & cloud AI providers, registered users, and system configuration.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadAllData}
              disabled={isLoading}
              className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              title="Refresh metrics"
            >
              <RefreshCw size={17} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 px-6 gap-2 bg-gray-50/20 dark:bg-black/10 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'overview'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Activity size={15} />
            <span>Overview & Health</span>
          </button>
          <button
            onClick={() => setActiveTab('providers')}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'providers'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Cpu size={15} />
            <span>AI Providers & Models</span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'users'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Users size={15} />
            <span>User Management ({users.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'settings'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Settings size={15} />
            <span>Branding & Config</span>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'logs'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Terminal size={15} />
            <span>Audit & System Logs</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && health && (
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#222] border border-gray-200 dark:border-gray-800">
                  <div className="text-xs font-medium text-gray-500">Registered Users</div>
                  <div className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                    {health.metrics.totalUsers}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">
                    {health.metrics.activeUsers} Active
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#222] border border-gray-200 dark:border-gray-800">
                  <div className="text-xs font-medium text-gray-500">Total Conversations</div>
                  <div className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">
                    {health.metrics.totalConversations}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">
                    {health.metrics.totalMessages} Messages logged
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#222] border border-gray-200 dark:border-gray-800">
                  <div className="text-xs font-medium text-gray-500">Storage Used</div>
                  <div className="text-2xl font-bold mt-1 text-purple-600 dark:text-purple-400">
                    {health.metrics.storageSizeMB} MB
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">Uploaded Docs & Media</div>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#222] border border-gray-200 dark:border-gray-800">
                  <div className="text-xs font-medium text-gray-500">System Uptime</div>
                  <div className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
                    {(health.metrics.uptimeSeconds / 60).toFixed(0)}m
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">Node {health.environment.nodeVersion}</div>
                </div>
              </div>

              {/* Service Status List */}
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="p-4 bg-gray-50 dark:bg-[#222] font-semibold text-sm border-b border-gray-200 dark:border-gray-800">
                  Core Service Health & Integrations
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-800 text-sm">
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium">Google Gemini Engine</div>
                      <div className="text-xs text-gray-500">Server-side multi-modal SDK integration</div>
                    </div>
                    <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500">
                      <CheckCircle2 size={14} /> Active & Configured
                    </span>
                  </div>

                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium">Web Search Grounding Engine</div>
                      <div className="text-xs text-gray-500">{health.searchHealth.message}</div>
                    </div>
                    <span
                      className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
                        health.searchHealth.status === 'online'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-amber-500/10 text-amber-500'
                      }`}
                    >
                      {health.searchHealth.status === 'online' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                      {health.searchHealth.provider}
                    </span>
                  </div>

                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium">Document RAG & Multi-Format Intelligence</div>
                      <div className="text-xs text-gray-500">PDF, DOCX, CSV, TXT, OCR, and table extraction</div>
                    </div>
                    <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500">
                      <CheckCircle2 size={14} /> Ready
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI PROVIDERS & LIVE PING */}
          {activeTab === 'providers' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm">AI Provider Connection Diagnostics</h3>
                  <p className="text-xs text-gray-500">Test live network connections to each supported AI provider.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Gemini */}
                <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#222]/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                        G
                      </div>
                      <div>
                        <div className="font-semibold text-sm">Google Gemini</div>
                        <div className="text-[11px] text-gray-400">gemini-3.8-flash, gemini-4-argon</div>
                      </div>
                    </div>
                    <button
                      onClick={() => testPing('gemini')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium cursor-pointer"
                    >
                      <Play size={12} /> Test Ping
                    </button>
                  </div>
                  {pingStatus.gemini && (
                    <div className="p-2.5 rounded-xl bg-white dark:bg-black/30 text-xs space-y-1">
                      <div className="font-medium flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${pingStatus.gemini.status === 'online' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span>Status: {pingStatus.gemini.status.toUpperCase()}</span>
                        {pingStatus.gemini.latency && <span className="text-gray-400 font-mono">({pingStatus.gemini.latency}ms)</span>}
                      </div>
                      <p className="text-gray-500">{pingStatus.gemini.message}</p>
                    </div>
                  )}
                </div>

                {/* 2. Ollama */}
                <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#222]/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
                        OL
                      </div>
                      <div>
                        <div className="font-semibold text-sm">Local Ollama Instance</div>
                        <div className="text-[11px] text-gray-400">Llama 3.2, Qwen 2.5, Gemma 2</div>
                      </div>
                    </div>
                    <button
                      onClick={() => testPing('ollama')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium cursor-pointer"
                    >
                      <Play size={12} /> Test Ping
                    </button>
                  </div>
                  {pingStatus.ollama ? (
                    <div className="p-2.5 rounded-xl bg-white dark:bg-black/30 text-xs space-y-1">
                      <div className="font-medium flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${pingStatus.ollama.status === 'online' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span>Status: {pingStatus.ollama.status.toUpperCase()}</span>
                        {pingStatus.ollama.latency && <span className="text-gray-400 font-mono">({pingStatus.ollama.latency}ms)</span>}
                      </div>
                      <p className="text-gray-500">{pingStatus.ollama.message}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">
                      Endpoint: {settings?.ollamaUrl || 'http://127.0.0.1:11434'}
                    </p>
                  )}
                </div>

                {/* 3. OpenAI */}
                <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#222]/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                        OA
                      </div>
                      <div>
                        <div className="font-semibold text-sm">OpenAI API</div>
                        <div className="text-[11px] text-gray-400">gpt-4o, gpt-4o-mini</div>
                      </div>
                    </div>
                    <button
                      onClick={() => testPing('openai')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium cursor-pointer"
                    >
                      <Play size={12} /> Test Ping
                    </button>
                  </div>
                  {pingStatus.openai && (
                    <div className="p-2.5 rounded-xl bg-white dark:bg-black/30 text-xs space-y-1">
                      <div className="font-medium flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${pingStatus.openai.status === 'online' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span>Status: {pingStatus.openai.status.toUpperCase()}</span>
                      </div>
                      <p className="text-gray-500">{pingStatus.openai.message}</p>
                    </div>
                  )}
                </div>

                {/* 4. Live Search */}
                <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#222]/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
                        SR
                      </div>
                      <div>
                        <div className="font-semibold text-sm">Live Search Engine</div>
                        <div className="text-[11px] text-gray-400">Google Grounding / DuckDuckGo / SearXNG</div>
                      </div>
                    </div>
                    <button
                      onClick={() => testPing('search')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium cursor-pointer"
                    >
                      <Play size={12} /> Test Ping
                    </button>
                  </div>
                  {pingStatus.search && (
                    <div className="p-2.5 rounded-xl bg-white dark:bg-black/30 text-xs space-y-1">
                      <div className="font-medium flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${pingStatus.search.status === 'online' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span>Status: {pingStatus.search.status.toUpperCase()}</span>
                      </div>
                      <p className="text-gray-500">{pingStatus.search.message}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by email or name..."
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    className="w-full bg-gray-100 dark:bg-[#222] pl-8 pr-3 py-1.5 rounded-xl text-xs border border-transparent focus:border-emerald-500 outline-none"
                  />
                </div>
                <span className="text-xs text-gray-500">{filteredUsers.length} total users</span>
              </div>

              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 dark:bg-[#222] border-b border-gray-200 dark:border-gray-800 text-gray-500 font-semibold">
                    <tr>
                      <th className="p-3">User</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Registered</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-[#222]/50">
                        <td className="p-3">
                          <div className="font-medium text-gray-900 dark:text-gray-100">{u.name}</div>
                          <div className="text-[11px] text-gray-400">{u.email}</div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              u.role === 'admin'
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.status === 'active'
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : 'bg-red-500/15 text-red-500'
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="p-3 text-gray-400 text-[11px]">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-right space-x-2">
                          {u.email !== 'bhavyakthmadanambeti@gmail.com' && (
                            <>
                              <button
                                onClick={() => handleToggleUserStatus(u)}
                                className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-xs cursor-pointer"
                                title={u.status === 'active' ? 'Deactivate' : 'Activate'}
                              >
                                {u.status === 'active' ? 'Disable' : 'Enable'}
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                className="p-1 text-red-400 hover:text-red-600 cursor-pointer"
                                title="Delete user"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: SETTINGS & BRANDING */}
          {activeTab === 'settings' && settings && (
            <form onSubmit={handleSaveSettings} className="space-y-4 max-w-2xl">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Website Title</label>
                  <input
                    type="text"
                    value={settings.siteName}
                    onChange={e => setSettings({ ...settings, siteName: e.target.value })}
                    className="w-full bg-gray-100 dark:bg-[#222] p-2 rounded-xl text-xs border border-transparent focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Default AI Model</label>
                  <input
                    type="text"
                    value={settings.defaultModel}
                    onChange={e => setSettings({ ...settings, defaultModel: e.target.value })}
                    className="w-full bg-gray-100 dark:bg-[#222] p-2 rounded-xl text-xs border border-transparent focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Ollama Local API Endpoint</label>
                  <input
                    type="text"
                    value={settings.ollamaUrl}
                    onChange={e => setSettings({ ...settings, ollamaUrl: e.target.value })}
                    className="w-full bg-gray-100 dark:bg-[#222] p-2 rounded-xl text-xs border border-transparent focus:border-emerald-500 outline-none"
                    placeholder="http://127.0.0.1:11434"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">SearXNG Search URL</label>
                  <input
                    type="text"
                    value={settings.searxngUrl}
                    onChange={e => setSettings({ ...settings, searxngUrl: e.target.value })}
                    className="w-full bg-gray-100 dark:bg-[#222] p-2 rounded-xl text-xs border border-transparent focus:border-emerald-500 outline-none"
                    placeholder="http://localhost:8080"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Max Upload File Size (MB)</label>
                  <input
                    type="number"
                    value={settings.maxUploadSizeMB}
                    onChange={e => setSettings({ ...settings, maxUploadSizeMB: parseInt(e.target.value, 10) || 50 })}
                    className="w-full bg-gray-100 dark:bg-[#222] p-2 rounded-xl text-xs border border-transparent focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">System Prompt Directive</label>
                  <textarea
                    value={settings.systemPrompt}
                    onChange={e => setSettings({ ...settings, systemPrompt: e.target.value })}
                    rows={4}
                    className="w-full bg-gray-100 dark:bg-[#222] p-2 rounded-xl text-xs border border-transparent focus:border-emerald-500 outline-none resize-none leading-relaxed"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  <Save size={14} />
                  <span>Save Configuration</span>
                </button>
                {saveSuccess && (
                  <span className="text-xs font-medium text-emerald-500 animate-in fade-in">
                    Configuration saved successfully!
                  </span>
                )}
              </div>
            </form>
          )}

          {/* TAB 5: AUDIT LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-2">
              <div className="p-3 bg-gray-900 text-gray-200 rounded-2xl font-mono text-[11px] leading-relaxed max-h-[500px] overflow-y-auto space-y-1.5 scrollbar-thin">
                {logs.map(log => (
                  <div key={log.id} className="flex items-start gap-2 border-b border-gray-800 pb-1">
                    <span className="text-gray-500 shrink-0">
                      [{new Date(log.timestamp).toLocaleTimeString()}]
                    </span>
                    <span
                      className={`font-bold uppercase text-[9px] px-1 py-0.2 rounded shrink-0 ${
                        log.level === 'error'
                          ? 'bg-red-500/20 text-red-400'
                          : log.level === 'warn'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {log.level}
                    </span>
                    <span className="text-blue-400 font-semibold shrink-0">[{log.category}]</span>
                    <span className="text-gray-300 break-all">{log.message}</span>
                  </div>
                ))}
                {logs.length === 0 && <div className="text-gray-500">No logs recorded yet.</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
