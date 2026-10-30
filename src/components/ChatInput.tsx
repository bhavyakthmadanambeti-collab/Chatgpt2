import React, { useRef, useState, useEffect } from 'react';
import {
  ArrowUp,
  Paperclip,
  Globe,
  Mic,
  MicOff,
  Camera,
  X,
  FileText,
  Image as ImageIcon,
  Video,
  Square,
  Sparkles,
} from 'lucide-react';
import { Attachment } from '../types';

interface ChatInputProps {
  onSendMessage: (text: string, attachments: Attachment[]) => void;
  isGenerating: boolean;
  onStopGeneration: () => void;
  webSearchEnabled: boolean;
  onToggleWebSearch: () => void;
  onOpenCamera: () => void;
  attachments: Attachment[];
  onAddAttachment: (att: Attachment) => void;
  onRemoveAttachment: (id: string) => void;
  placeholder?: string;
  token?: string | null;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isGenerating,
  onStopGeneration,
  webSearchEnabled,
  onToggleWebSearch,
  onOpenCamera,
  attachments,
  onAddAttachment,
  onRemoveAttachment,
  placeholder = 'Ask anything...',
  token,
}) => {
  const [text, setText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 200)}px`;
    }
  }, [text]);

  // Speech to text initialization
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setText(prev => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        recognitionRef.current.stop();
        setIsListening(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (isGenerating) {
      onStopGeneration();
      return;
    }
    if (!text.trim() && attachments.length === 0) return;

    onSendMessage(text.trim(), attachments);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to upload document');
      }

      const data = await res.json();
      onAddAttachment(data.attachment);
    } catch (err: any) {
      setUploadError(err.message || 'File upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 pb-4">
      {/* Upload Error Banner */}
      {uploadError && (
        <div className="mb-2 p-2 px-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-500 flex items-center justify-between">
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 p-2 bg-gray-100/80 dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-800">
          {attachments.map(att => (
            <div
              key={att.id}
              className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#252525] rounded-xl text-xs font-medium border border-gray-200 dark:border-gray-700 shadow-xs"
            >
              {att.type === 'image' ? (
                <ImageIcon size={14} className="text-emerald-500" />
              ) : att.type === 'video' ? (
                <Video size={14} className="text-purple-500" />
              ) : (
                <FileText size={14} className="text-blue-500" />
              )}
              <span className="max-w-[140px] truncate text-gray-800 dark:text-gray-200">{att.name}</span>
              <span className="text-[10px] text-gray-400">({(att.size / 1024).toFixed(0)} KB)</span>
              <button
                onClick={() => onRemoveAttachment(att.id)}
                className="text-gray-400 hover:text-red-500 transition-colors ml-1 cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Input Box */}
      <div className="relative rounded-3xl bg-[#f4f4f4] dark:bg-[#2f2f2f] border border-gray-300/80 dark:border-transparent focus-within:border-gray-400 dark:focus-within:border-gray-600 shadow-sm transition-all">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          accept=".pdf,.docx,.doc,.txt,.csv,.xlsx,.xls,.pptx,.json,image/*,video/*,audio/*"
        />

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="w-full bg-transparent px-4 sm:px-5 pt-3.5 pb-12 sm:pb-14 text-sm sm:text-base text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none resize-none leading-relaxed max-h-52"
        />

        {/* Action Controls Bar inside Input */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
          {/* Left tools */}
          <div className="flex items-center gap-1 sm:gap-1.5 pointer-events-auto">
            {/* Attachment Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer disabled:opacity-50"
              title="Attach documents (PDF, DOCX, CSV, TXT, images, videos)"
            >
              <Paperclip size={18} className={isUploading ? 'animate-spin' : ''} />
            </button>

            {/* Camera Snap */}
            <button
              onClick={onOpenCamera}
              className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              title="Snap photo with camera"
            >
              <Camera size={18} />
            </button>

            {/* Live Web Search Pill */}
            <button
              onClick={onToggleWebSearch}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                webSearchEnabled
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              title="Toggle live web search"
            >
              <Globe size={15} />
              <span className="hidden sm:inline">Search</span>
            </button>
          </div>

          {/* Right tools (Mic & Send) */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            {/* Microphone */}
            <button
              onClick={toggleListening}
              className={`p-2 rounded-full transition-all cursor-pointer ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              title={isListening ? 'Stop listening' : 'Dictate with voice'}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            {/* Send / Stop Button */}
            <button
              onClick={handleSend}
              disabled={!isGenerating && !text.trim() && attachments.length === 0}
              className={`p-2 rounded-full transition-all cursor-pointer ${
                isGenerating
                  ? 'bg-black dark:bg-white text-white dark:text-black hover:opacity-85'
                  : text.trim() || attachments.length > 0
                  ? 'bg-black dark:bg-white text-white dark:text-black hover:opacity-85 shadow-xs'
                  : 'bg-gray-300 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              }`}
              title={isGenerating ? 'Stop generation' : 'Send message'}
            >
              {isGenerating ? <Square size={16} className="fill-current" /> : <ArrowUp size={18} />}
            </button>
          </div>
        </div>
      </div>
      <p className="text-center text-[11px] text-gray-400 dark:text-gray-500 mt-2">
        ChatGPT Pro can make mistakes. Verify important info.
      </p>
    </div>
  );
};
