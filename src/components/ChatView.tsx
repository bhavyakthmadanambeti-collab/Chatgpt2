import React, { useRef, useEffect, useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  RotateCw,
  Volume2,
  VolumeX,
  Edit2,
  Globe,
  FileText,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Code,
  BookOpen,
  Compass,
  Lightbulb,
} from 'lucide-react';
import { Message, Attachment, WebSource } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ChatViewProps {
  messages: Message[];
  isGenerating: boolean;
  streamingText: string;
  streamingSources: WebSource[];
  onRegenerate: () => void;
  onEditMessage: (messageId: string, newContent: string) => void;
  onPromptStarter: (prompt: string) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  isGenerating,
  streamingText,
  streamingSources,
  onRegenerate,
  onEditMessage,
  onPromptStarter,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeak = (id: string, text: string) => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported on this device.');
      return;
    }

    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  const toggleSources = (key: string) => {
    setExpandedSources(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const startEdit = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditContent(msg.content);
  };

  const saveEdit = (msgId: string) => {
    if (editContent.trim()) {
      onEditMessage(msgId, editContent.trim());
    }
    setEditingMessageId(null);
  };

  // If no messages, render ChatGPT welcome screen
  if (messages.length === 0 && !streamingText) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-3xl mx-auto w-full text-center select-none animate-in fade-in duration-300">
        <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white mb-6 shadow-md shadow-emerald-500/20">
          <Sparkles size={28} />
        </div>
        <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white tracking-tight mb-2">
          What can I help with today?
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-md">
          Ask questions, upload and analyze documents, generate images, search the web in real-time, or converse with voice.
        </p>

        {/* Prompt Starters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl text-left">
          <button
            onClick={() => onPromptStarter('Write a clean TypeScript full-stack Express REST API with input validation and tests')}
            className="p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-[#262626]/70 hover:bg-gray-50 dark:hover:bg-[#2e2e2e] transition-all group cursor-pointer text-left shadow-xs"
          >
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-1">
              <Code size={15} />
              <span>Coding & Architecture</span>
            </div>
            <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">
              Write a clean TypeScript full-stack Express REST API with input validation and tests
            </p>
          </button>

          <button
            onClick={() => onPromptStarter('Explain how Transformer attention mechanisms work with a mathematical step-by-step example')}
            className="p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-[#262626]/70 hover:bg-gray-50 dark:hover:bg-[#2e2e2e] transition-all group cursor-pointer text-left shadow-xs"
          >
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-1">
              <BookOpen size={15} />
              <span>Learning & Science</span>
            </div>
            <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">
              Explain how Transformer attention mechanisms work with a mathematical step-by-step example
            </p>
          </button>

          <button
            onClick={() => onPromptStarter('What are the latest breakthroughs in renewable fusion energy and battery chemistry?')}
            className="p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-[#262626]/70 hover:bg-gray-50 dark:hover:bg-[#2e2e2e] transition-all group cursor-pointer text-left shadow-xs"
          >
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-xs font-semibold mb-1">
              <Globe size={15} />
              <span>Live Web Search</span>
            </div>
            <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">
              What are the latest breakthroughs in renewable fusion energy and battery chemistry?
            </p>
          </button>

          <button
            onClick={() => onPromptStarter('Help me brainstorm a go-to-market strategy for an AI productivity product targeting engineers')}
            className="p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-[#262626]/70 hover:bg-gray-50 dark:hover:bg-[#2e2e2e] transition-all group cursor-pointer text-left shadow-xs"
          >
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-semibold mb-1">
              <Lightbulb size={15} />
              <span>Strategy & Brainstorm</span>
            </div>
            <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">
              Help me brainstorm a go-to-market strategy for an AI productivity product targeting engineers
            </p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-6 space-y-6 max-w-4xl mx-auto w-full scrollbar-thin">
      {messages.map((message) => {
        const isUser = message.role === 'user';
        const isEditing = editingMessageId === message.id;
        const hasSources = message.sources && message.sources.length > 0;
        const sourcesOpen = expandedSources[message.id];

        return (
          <div
            key={message.id}
            className={`flex flex-col group ${isUser ? 'items-end' : 'items-start'}`}
          >
            {/* User message */}
            {isUser ? (
              <div className="max-w-[85%] sm:max-w-[75%] space-y-2">
                {/* User Attachment previews */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-end mb-1">
                    {message.attachments.map(att => (
                      <div key={att.id} className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                        {att.type === 'image' ? (
                          <img
                            src={att.url}
                            alt={att.name}
                            className="max-h-48 max-w-xs object-cover rounded-xl"
                          />
                        ) : att.type === 'video' ? (
                          <video
                            src={att.url}
                            controls
                            className="max-h-48 max-w-xs rounded-xl"
                          />
                        ) : (
                          <div className="flex items-center gap-2 p-2.5 px-3 text-xs">
                            <FileText size={16} className="text-blue-500" />
                            <span className="font-medium truncate max-w-[160px]">{att.name}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Bubble */}
                <div className="bg-[#f4f4f4] dark:bg-[#2f2f2f] text-gray-900 dark:text-gray-100 px-4 py-3 rounded-2xl rounded-tr-xs text-sm sm:text-base leading-relaxed break-words shadow-xs">
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        className="w-full bg-white dark:bg-gray-800 p-2 rounded-lg text-sm border border-emerald-500 outline-none resize-none"
                        rows={3}
                      />
                      <div className="flex justify-end gap-2 text-xs">
                        <button
                          onClick={() => setEditingMessageId(null)}
                          className="px-2.5 py-1 rounded-md text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => saveEdit(message.id)}
                          className="px-3 py-1 rounded-md bg-emerald-600 text-white font-medium hover:bg-emerald-500 cursor-pointer"
                        >
                          Save & Submit
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span>{message.content}</span>
                  )}
                </div>

                {/* User Message Edit Button */}
                {!isEditing && (
                  <div className="flex justify-end pr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(message)}
                      className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                    >
                      <Edit2 size={12} />
                      <span>Edit</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Assistant message */
              <div className="w-full space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <div className="w-6 h-6 rounded-lg bg-emerald-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
                    <Sparkles size={13} />
                  </div>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">ChatGPT</span>
                  <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    {message.model}
                  </span>
                </div>

                {/* Web Search Sources Pill */}
                {hasSources && (
                  <div className="my-2 border border-blue-500/20 bg-blue-500/5 rounded-xl p-2.5 text-xs">
                    <button
                      onClick={() => toggleSources(message.id)}
                      className="flex items-center justify-between w-full font-medium text-blue-600 dark:text-blue-400 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Globe size={14} />
                        <span>Searched the web ({message.sources!.length} sources)</span>
                      </div>
                      {sourcesOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {sourcesOpen && (
                      <div className="mt-2.5 space-y-1.5 pt-2 border-t border-blue-500/20">
                        {message.sources!.map((s, idx) => (
                          <a
                            key={idx}
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-blue-500/10 transition-colors text-gray-700 dark:text-gray-300 group/link"
                          >
                            <span className="text-[10px] font-mono px-1 rounded bg-blue-500/20 text-blue-600 dark:text-blue-300">
                              [{idx + 1}]
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-xs text-blue-600 dark:text-blue-400 group-hover/link:underline flex items-center gap-1 truncate">
                                <span>{s.title}</span>
                                <ExternalLink size={10} className="shrink-0" />
                              </div>
                              <div className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1">
                                {s.snippet}
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Document RAG grounded indicator */}
                {message.ragSources && message.ragSources.length > 0 && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs mb-1">
                    <FileText size={12} />
                    <span>Based on document: {message.ragSources.join(', ')}</span>
                  </div>
                )}

                {/* Markdown content */}
                <div className="text-gray-900 dark:text-gray-100 text-sm sm:text-base leading-relaxed pl-1 sm:pl-8">
                  <MarkdownRenderer content={message.content} />
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 pl-1 sm:pl-8 pt-1 text-gray-400 dark:text-gray-500">
                  <button
                    onClick={() => handleCopy(message.id, message.content)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
                    title="Copy message"
                  >
                    {copiedId === message.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </button>

                  <button
                    onClick={() => handleSpeak(message.id, message.content)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
                    title={speakingId === message.id ? 'Stop speaking' : 'Read aloud'}
                  >
                    {speakingId === message.id ? (
                      <VolumeX size={14} className="text-red-500 animate-pulse" />
                    ) : (
                      <Volume2 size={14} />
                    )}
                  </button>

                  <button
                    onClick={onRegenerate}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
                    title="Regenerate answer"
                  >
                    <RotateCw size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Streaming Assistant Response */}
      {isGenerating && (
        <div className="w-full space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <div className="w-6 h-6 rounded-lg bg-emerald-600 flex items-center justify-center text-white text-xs font-bold animate-pulse">
              <Sparkles size={13} />
            </div>
            <span className="font-semibold text-gray-800 dark:text-gray-200">ChatGPT</span>
            <span className="text-[11px] text-emerald-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Thinking & Generating...
            </span>
          </div>

          {/* Live streaming sources */}
          {streamingSources.length > 0 && (
            <div className="border border-blue-500/20 bg-blue-500/5 rounded-xl p-2.5 text-xs mb-2">
              <div className="flex items-center gap-2 font-medium text-blue-600 dark:text-blue-400">
                <Globe size={14} className="animate-spin-slow" />
                <span>Searching web live ({streamingSources.length} sources found)</span>
              </div>
            </div>
          )}

          <div className="text-gray-900 dark:text-gray-100 text-sm sm:text-base leading-relaxed pl-1 sm:pl-8">
            <MarkdownRenderer content={streamingText} />
            <span className="inline-block w-2 h-4 bg-emerald-500 ml-1 animate-pulse align-middle" />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};
