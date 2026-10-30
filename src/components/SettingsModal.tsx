import React, { useState, useEffect } from 'react';
import { X, User, Sliders, Globe, Volume2, Shield, KeyRound, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, changePassword, updateProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<'general' | 'voice' | 'account'>('general');
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // Voice settings
  const [speechRate, setSpeechRate] = useState(1.0);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');

  useEffect(() => {
    if (user?.name) setDisplayName(user.name);
  }, [user]);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      const updateVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
        if (voices.length > 0 && !selectedVoice) {
          const defaultV = voices.find(v => v.lang.startsWith('en')) || voices[0];
          setSelectedVoice(defaultV?.name || '');
        }
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile({ name: displayName });
      setProfileMsg('Profile updated successfully');
      setTimeout(() => setProfileMsg(null), 2500);
    } catch (err: any) {
      setProfileMsg(err.message);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    try {
      await changePassword(currentPassword, newPassword);
      setPasswordMsg({ type: 'success', text: 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || 'Failed to change password' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#1f1f1f] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-gray-200 dark:border-gray-800">
          <h3 className="font-bold text-base text-gray-900 dark:text-white">Settings</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Pills */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 px-6 gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-3 border-b-2 cursor-pointer ${
              activeTab === 'general'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-gray-500'
            }`}
          >
            General & Theme
          </button>
          <button
            onClick={() => setActiveTab('voice')}
            className={`py-3 border-b-2 cursor-pointer ${
              activeTab === 'voice'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-gray-500'
            }`}
          >
            Voice & Speech
          </button>
          <button
            onClick={() => setActiveTab('account')}
            className={`py-3 border-b-2 cursor-pointer ${
              activeTab === 'account'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-gray-500'
            }`}
          >
            Account & Security
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Appearance Theme</div>
                  <div className="text-xs text-gray-500">Switch between dark and light modes</div>
                </div>
                <button
                  onClick={toggleTheme}
                  className="px-3.5 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-semibold cursor-pointer"
                >
                  {theme === 'dark' ? 'Dark Mode (Active)' : 'Light Mode (Active)'}
                </button>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                <div className="font-medium text-gray-900 dark:text-white mb-1">Language & Region</div>
                <div className="text-xs text-gray-500 mb-2">Primary conversational language</div>
                <select className="w-full bg-gray-100 dark:bg-gray-800 p-2 rounded-xl text-xs border border-transparent outline-none">
                  <option value="auto">Auto-detect (Recommended)</option>
                  <option value="en">English (US)</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="hi">Hindi</option>
                  <option value="zh">Mandarin</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'voice' && (
            <div className="space-y-4">
              <div>
                <label className="block font-medium text-xs mb-1">Text-to-Speech Voice</label>
                <select
                  value={selectedVoice}
                  onChange={e => setSelectedVoice(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-gray-800 p-2 rounded-xl text-xs border border-transparent outline-none"
                >
                  {availableVoices.map(v => (
                    <option key={v.name} value={v.name}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                  {availableVoices.length === 0 && <option>Default System Voice</option>}
                </select>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <label className="font-medium">Speech Speed ({speechRate}x)</label>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.75"
                  step="0.05"
                  value={speechRate}
                  onChange={e => setSpeechRate(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="space-y-6">
              {/* Profile Name */}
              <form onSubmit={handleUpdateProfile} className="space-y-3">
                <div className="font-semibold text-xs uppercase text-gray-400">User Profile</div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Email Address</label>
                  <input
                    type="text"
                    disabled
                    value={user?.email || ''}
                    className="w-full bg-gray-100 dark:bg-gray-800/50 p-2 rounded-xl text-xs text-gray-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="w-full bg-gray-100 dark:bg-gray-800 p-2 rounded-xl text-xs outline-none focus:border-emerald-500 border border-transparent"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Save Profile
                </button>
                {profileMsg && <span className="text-xs text-emerald-500 ml-2">{profileMsg}</span>}
              </form>

              {/* Password update */}
              <form onSubmit={handleChangePassword} className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="font-semibold text-xs uppercase text-gray-400">Security & Password</div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Current Password</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    className="w-full bg-gray-100 dark:bg-gray-800 p-2 rounded-xl text-xs outline-none focus:border-emerald-500 border border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full bg-gray-100 dark:bg-gray-800 p-2 rounded-xl text-xs outline-none focus:border-emerald-500 border border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full bg-gray-100 dark:bg-gray-800 p-2 rounded-xl text-xs outline-none focus:border-emerald-500 border border-transparent"
                  />
                </div>

                {passwordMsg && (
                  <div
                    className={`text-xs p-2 rounded-lg ${
                      passwordMsg.type === 'success'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-red-500/10 text-red-500'
                    }`}
                  >
                    {passwordMsg.text}
                  </div>
                )}

                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-gray-900 dark:bg-gray-100 dark:text-gray-900 text-white text-xs font-semibold cursor-pointer"
                >
                  Update Password
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
