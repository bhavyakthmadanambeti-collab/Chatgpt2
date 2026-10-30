import React, { useState } from 'react';
import {
  MessageSquare,
  Plus,
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  Settings,
  ShieldAlert,
  Moon,
  Sun,
  LogOut,
  Pin,
  Sparkles,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { Conversation } from '../types';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface SidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onTogglePin: (id: string, isPinned: boolean) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  onOpenSettings: () => void;
  onOpenAdmin: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
  onTogglePin,
  isOpen,
  onToggleOpen,
  onOpenSettings,
  onOpenAdmin,
}) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const filteredConversations = conversations.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startRename = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const handleSaveRename = (convId: string, e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameConversation(convId, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  // Group conversations by relative time
  const now = new Date().getTime();
  const oneDay = 24 * 60 * 60 * 1000;

  const pinnedList = filteredConversations.filter(c => c.isPinned);
  const unpinnedList = filteredConversations.filter(c => !c.isPinned);

  const todayList = unpinnedList.filter(c => {
    const t = new Date(c.updatedAt).getTime();
    return now - t < oneDay;
  });

  const yesterdayList = unpinnedList.filter(c => {
    const t = new Date(c.updatedAt).getTime();
    const diff = now - t;
    return diff >= oneDay && diff < 2 * oneDay;
  });

  const previousDaysList = unpinnedList.filter(c => {
    const t = new Date(c.updatedAt).getTime();
    const diff = now - t;
    return diff >= 2 * oneDay && diff < 7 * oneDay;
  });

  const olderList = unpinnedList.filter(c => {
    const t = new Date(c.updatedAt).getTime();
    return now - t >= 7 * oneDay;
  });

  const renderConversationItem = (conv: Conversation) => {
    const isActive = conv.id === currentConversationId;
    const isEditing = editingId === conv.id;

    return (
      <div
        key={conv.id}
        onClick={() => !isEditing && onSelectConversation(conv.id)}
        className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
          isActive
            ? 'bg-gray-200 dark:bg-[#2f2f2f] text-gray-900 dark:text-white font-semibold shadow-xs'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#262626]'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <MessageSquare size={16} className={isActive ? 'text-emerald-500' : 'text-gray-400 group-hover:text-gray-500'} />
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              onClick={e => e.stopPropagation()}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSaveRename(conv.id, e);
                if (e.key === 'Escape') handleCancelRename(e as any);
              }}
              autoFocus
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-2 py-0.5 rounded text-sm outline-none border border-emerald-500 w-full"
            />
          ) : (
            <span className="truncate text-[13.5px]">{conv.title}</span>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isEditing ? (
            <>
              <button
                onClick={e => handleSaveRename(conv.id, e)}
                className="p-1 hover:text-emerald-500 transition-colors"
                title="Save"
              >
                <Check size={14} />
              </button>
              <button
                onClick={handleCancelRename}
                className="p-1 hover:text-red-500 transition-colors"
                title="Cancel"
              >
                <X size={14} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={e => {
                  e.stopPropagation();
                  onTogglePin(conv.id, !conv.isPinned);
                }}
                className={`p-1 hover:text-amber-500 transition-colors ${conv.isPinned ? 'text-amber-500 !opacity-100' : 'text-gray-400'}`}
                title={conv.isPinned ? 'Unpin chat' : 'Pin chat'}
              >
                <Pin size={13} className={conv.isPinned ? 'fill-amber-500' : ''} />
              </button>
              <button
                onClick={e => startRename(conv, e)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                title="Rename"
              >
                <Edit2 size={13} />
              </button>
              <button
                onClick={e => {
                  e.stopPropagation();
                  if (confirm('Delete this conversation?')) {
                    onDeleteConversation(conv.id);
                  }
                }}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                title="Delete"
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onToggleOpen}
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col w-[280px] bg-[#f9f9f9] dark:bg-[#171717] border-r border-gray-200 dark:border-[#262626] transform transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${!isOpen && 'md:hidden'}`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-gray-200/80 dark:border-gray-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-sm shadow-emerald-500/20">
              <Sparkles size={17} />
            </div>
            <div>
              <h1 className="font-semibold text-sm tracking-tight text-gray-900 dark:text-white flex items-center gap-1.5">
                ChatGPT <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 dark:bg-emerald-400/20 dark:text-emerald-400">Pro</span>
              </h1>
            </div>
          </div>
          <button
            onClick={onToggleOpen}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            title="Close sidebar"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#212121] border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 text-gray-900 dark:text-gray-100 text-sm font-medium shadow-xs hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <Plus size={16} className="text-emerald-500 group-hover:scale-110 transition-transform" />
              <span>New chat</span>
            </div>
            <span className="text-xs text-gray-400 font-mono">⌘K</span>
          </button>
        </div>

        {/* Search Chats Input */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-gray-200/60 dark:bg-[#212121] text-xs text-gray-800 dark:text-gray-200 pl-8 pr-3 py-2 rounded-lg border-transparent focus:border-emerald-500 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Conversation List Scrollable */}
        <div className="flex-1 overflow-y-auto px-2 space-y-4 py-2 scrollbar-thin">
          {pinnedList.length > 0 && (
            <div className="space-y-0.5">
              <div className="px-3 text-[11px] font-semibold tracking-wider uppercase text-amber-500/90 flex items-center gap-1.5 mb-1">
                <Pin size={11} className="fill-amber-500" />
                <span>Pinned</span>
              </div>
              {pinnedList.map(renderConversationItem)}
            </div>
          )}

          {todayList.length > 0 && (
            <div className="space-y-0.5">
              <div className="px-3 text-[11px] font-semibold tracking-wider uppercase text-gray-400 dark:text-gray-500 mb-1">
                Today
              </div>
              {todayList.map(renderConversationItem)}
            </div>
          )}

          {yesterdayList.length > 0 && (
            <div className="space-y-0.5">
              <div className="px-3 text-[11px] font-semibold tracking-wider uppercase text-gray-400 dark:text-gray-500 mb-1">
                Yesterday
              </div>
              {yesterdayList.map(renderConversationItem)}
            </div>
          )}

          {previousDaysList.length > 0 && (
            <div className="space-y-0.5">
              <div className="px-3 text-[11px] font-semibold tracking-wider uppercase text-gray-400 dark:text-gray-500 mb-1">
                Previous 7 Days
              </div>
              {previousDaysList.map(renderConversationItem)}
            </div>
          )}

          {olderList.length > 0 && (
            <div className="space-y-0.5">
              <div className="px-3 text-[11px] font-semibold tracking-wider uppercase text-gray-400 dark:text-gray-500 mb-1">
                Older
              </div>
              {olderList.map(renderConversationItem)}
            </div>
          )}

          {filteredConversations.length === 0 && (
            <div className="text-center py-8 px-4 text-xs text-gray-400">
              {searchQuery ? 'No matching conversations' : 'No chats yet. Start a new conversation!'}
            </div>
          )}
        </div>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-gray-200 dark:border-[#262626] relative">
          {userMenuOpen && (
            <>
              <div
                onClick={() => setUserMenuOpen(false)}
                className="fixed inset-0 z-30"
              />
              <div className="absolute bottom-16 left-3 right-3 z-40 bg-white dark:bg-[#212121] rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 py-1.5 overflow-hidden animate-in fade-in duration-150">
                {user?.role === 'admin' && (
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onOpenAdmin();
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                  >
                    <ShieldAlert size={15} />
                    <span>Owner / Admin Dashboard</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <Settings size={15} />
                  <span>Settings & Integrations</span>
                </button>
                <button
                  onClick={() => {
                    toggleTheme();
                    setUserMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                  <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
                </button>
                <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <LogOut size={15} />
                  <span>Log out</span>
                </button>
              </div>
            </>
          )}

          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-gray-200/70 dark:hover:bg-[#262626] transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.name || 'User')}`}
                alt="Avatar"
                className="w-8 h-8 rounded-full object-cover ring-1 ring-emerald-500/40"
              />
              <div className="text-left min-w-0">
                <div className="text-xs font-semibold text-gray-900 dark:text-white truncate flex items-center gap-1.5">
                  <span>{user?.name || 'User'}</span>
                  {user?.role === 'admin' && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400">
                      Owner
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-gray-400 truncate">{user?.email}</div>
              </div>
            </div>
            <ChevronRight size={14} className="text-gray-400 group-hover:text-gray-600 transition-transform" />
          </button>
        </div>
      </aside>
    </>
  );
};
