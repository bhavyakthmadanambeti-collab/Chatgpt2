import React, { useState } from 'react';
import {
  PanelLeft,
  ChevronDown,
  Globe,
  Headphones,
  Camera,
  Image as ImageIcon,
  Sparkles,
  Check,
  Radio,
  Cpu,
  Layers,
  Search,
} from 'lucide-react';
import { ModelInfo } from '../types';

interface ChatHeaderProps {
  models: ModelInfo[];
  selectedModelId: string;
  onSelectModel: (id: string) => void;
  webSearchEnabled: boolean;
  onToggleWebSearch: () => void;
  onOpenVoiceMode: () => void;
  onOpenCamera: () => void;
  onOpenImageGen: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  models,
  selectedModelId,
  onSelectModel,
  webSearchEnabled,
  onToggleWebSearch,
  onOpenVoiceMode,
  onOpenCamera,
  onOpenImageGen,
  onToggleSidebar,
  isSidebarOpen,
}) => {
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

  const selectedModel = models.find(m => m.id === selectedModelId) || models[0];

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between px-3.5 py-2.5 bg-white/90 dark:bg-[#212121]/90 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800/80 transition-colors">
      <div className="flex items-center gap-2">
        {!isSidebarOpen && (
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            title="Open sidebar"
          >
            <PanelLeft size={18} />
          </button>
        )}

        {/* Model Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm font-semibold text-gray-800 dark:text-gray-100 cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
          >
            <div className="flex items-center gap-1.5">
              <span>{selectedModel?.name || 'Gemini 3.8 Flash'}</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  selectedModel?.isOnline ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50 animate-pulse' : 'bg-gray-400'
                }`}
              />
            </div>
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {modelDropdownOpen && (
            <>
              <div
                onClick={() => setModelDropdownOpen(false)}
                className="fixed inset-0 z-30"
              />
              <div className="absolute top-11 left-0 z-40 w-80 bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Available AI Models</span>
                  <span className="text-[10px] text-emerald-500 font-mono">Live Engine</span>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-1 pr-1">
                  {models.map(model => {
                    const isSelected = model.id === selectedModelId;
                    return (
                      <div
                        key={model.id}
                        onClick={() => {
                          onSelectModel(model.id);
                          setModelDropdownOpen(false);
                        }}
                        className={`flex items-start justify-between p-2.5 rounded-xl text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/40 text-gray-900 dark:text-white'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800/70 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <div className="space-y-1 flex-1 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold">{model.name}</span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                model.provider === 'gemini'
                                  ? 'bg-blue-500/10 text-blue-500'
                                  : model.provider === 'ollama'
                                  ? 'bg-purple-500/10 text-purple-500'
                                  : model.provider === 'openai'
                                  ? 'bg-green-500/10 text-green-500'
                                  : 'bg-amber-500/10 text-amber-500'
                              }`}
                            >
                              {model.provider}
                            </span>
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                model.isOnline ? 'bg-emerald-500' : 'bg-red-400'
                              }`}
                              title={model.isOnline ? 'Online' : 'Offline'}
                            />
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1">
                            {model.description}
                          </p>
                          {model.statusMessage && (
                            <p
                              className={`text-[10px] ${
                                model.isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'
                              }`}
                            >
                              {model.statusMessage}
                            </p>
                          )}
                        </div>
                        {isSelected && <Check size={16} className="text-emerald-500 mt-0.5 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right Action Icons */}
      <div className="flex items-center gap-1.5">
        {/* Web Search Toggle */}
        <button
          onClick={onToggleWebSearch}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
            webSearchEnabled
              ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          title="Toggle live web search"
        >
          <Globe size={15} className={webSearchEnabled ? 'text-blue-500 animate-spin-slow' : ''} />
          <span className="hidden sm:inline">Search</span>
          {webSearchEnabled && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
        </button>

        {/* AI Image Generation */}
        <button
          onClick={onOpenImageGen}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          title="Generate AI Images"
        >
          <Sparkles size={15} className="text-purple-500" />
          <span className="hidden md:inline">Generate Image</span>
        </button>

        {/* Camera Snapshot */}
        <button
          onClick={onOpenCamera}
          className="p-2 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          title="Capture photo from camera"
        >
          <Camera size={17} />
        </button>

        {/* Voice Conversation Mode */}
        <button
          onClick={onOpenVoiceMode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs hover:shadow-emerald-500/20 transition-all cursor-pointer"
          title="Voice Conversation Mode"
        >
          <Headphones size={15} />
          <span className="hidden sm:inline">Voice Mode</span>
        </button>
      </div>
    </header>
  );
};
