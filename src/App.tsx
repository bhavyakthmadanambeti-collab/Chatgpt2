import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Sidebar } from './components/Sidebar';
import { ChatHeader } from './components/ChatHeader';
import { ChatView } from './components/ChatView';
import { ChatInput } from './components/ChatInput';
import { CameraModal } from './components/CameraModal';
import { VoiceAssistantModal } from './components/VoiceAssistantModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { SettingsModal } from './components/SettingsModal';
import { AuthModal } from './components/AuthModal';
import { ImageGenModal } from './components/ImageGenModal';
import { Conversation, Message, ModelInfo, Attachment, WebSource } from './types';

function MainApp() {
  const { user, token, mustChangePasswordModalOpen, setMustChangePasswordModalOpen } = useAuth();

  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('gemini-3.8-flash');
  const [webSearchEnabled, setWebSearchEnabled] = useState<boolean>(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  // Generation state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [streamingText, setStreamingText] = useState<string>('');
  const [streamingSources, setStreamingSources] = useState<WebSource[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // UI Modals
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isImageGenOpen, setIsImageGenOpen] = useState<boolean>(false);

  // 1. Fetch available AI models
  const fetchModels = async () => {
    try {
      const res = await fetch('/api/ai/models');
      if (res.ok) {
        const data = await res.json();
        setModels(data.models);
        // Default to first online model or gemini-3.8-flash
        const onlineDefault = data.models.find((m: ModelInfo) => m.isDefault && m.isOnline) || data.models[0];
        if (onlineDefault) {
          setSelectedModelId(onlineDefault.id);
        }
      }
    } catch (e) {
      console.error('Failed to fetch models:', e);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  // 2. Fetch conversations when user is logged in
  const fetchConversations = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/conversations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations);
      }
    } catch (e) {
      console.error('Failed to fetch conversations:', e);
    }
  };

  useEffect(() => {
    if (token) {
      fetchConversations();
    } else {
      setConversations([]);
      setMessages([]);
      setCurrentConversationId(null);
    }
  }, [token]);

  // 3. Load active conversation messages
  const loadConversationMessages = async (convId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/conversations/${convId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
        setCurrentConversationId(convId);
        if (data.conversation.model) {
          setSelectedModelId(data.conversation.model);
        }
      }
    } catch (e) {
      console.error('Failed to load conversation:', e);
    }
  };

  const handleSelectConversation = (id: string) => {
    if (isGenerating) handleStopGeneration();
    loadConversationMessages(id);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleNewChat = () => {
    if (isGenerating) handleStopGeneration();
    setCurrentConversationId(null);
    setMessages([]);
    setAttachments([]);
    setStreamingText('');
    setStreamingSources([]);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setConversations(prev => prev.filter(c => c.id !== id));
        if (currentConversationId === id) {
          handleNewChat();
        }
      }
    } catch (e) {
      console.error('Failed to delete conversation:', e);
    }
  };

  const handleRenameConversation = async (id: string, newTitle: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: newTitle }),
      });
      if (res.ok) {
        setConversations(prev => prev.map(c => (c.id === id ? { ...c, title: newTitle } : c)));
      }
    } catch (e) {
      console.error('Failed to rename conversation:', e);
    }
  };

  const handleTogglePin = async (id: string, isPinned: boolean) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isPinned }),
      });
      if (res.ok) {
        setConversations(prev =>
          prev.map(c => (c.id === id ? { ...c, isPinned } : c)).sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          })
        );
      }
    } catch (e) {
      console.error('Failed to toggle pin:', e);
    }
  };

  // 4. Send Message & SSE Streaming
  const handleSendMessage = async (text: string, currentAttachments: Attachment[]) => {
    if (!token) {
      setIsAuthOpen(true);
      return;
    }

    const currentController = new AbortController();
    abortControllerRef.current = currentController;

    // Optimistic user message
    const tempUserMsg: Message = {
      id: 'temp_user_' + Date.now(),
      conversationId: currentConversationId || '',
      userId: user?.id || '',
      role: 'user',
      content: text,
      model: selectedModelId,
      createdAt: new Date().toISOString(),
      attachments: currentAttachments,
    };

    setMessages(prev => [...prev, tempUserMsg]);
    setAttachments([]);
    setIsGenerating(true);
    setStreamingText('');
    setStreamingSources([]);

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationId: currentConversationId,
          content: text,
          model: selectedModelId,
          webSearch: webSearchEnabled,
          attachments: currentAttachments,
        }),
        signal: currentController.signal,
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to communicate with AI model');
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No streaming reader available');

      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedText = '';
      let collectedSources: WebSource[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6));

              if (eventData.type === 'start') {
                if (!currentConversationId && eventData.conversationId) {
                  setCurrentConversationId(eventData.conversationId);
                  fetchConversations();
                }
              } else if (eventData.type === 'chunk') {
                accumulatedText += eventData.text;
                setStreamingText(accumulatedText);
              } else if (eventData.type === 'sources') {
                collectedSources = eventData.sources;
                setStreamingSources(eventData.sources);
              } else if (eventData.type === 'done') {
                setMessages(prev => [...prev, eventData.message]);
                setStreamingText('');
                setStreamingSources([]);
                fetchConversations();
              } else if (eventData.type === 'error') {
                throw new Error(eventData.error);
              }
            } catch (err) {
              console.warn('Error parsing SSE event:', err);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        const errorMsg: Message = {
          id: 'msg_err_' + Date.now(),
          conversationId: currentConversationId || '',
          userId: user?.id || '',
          role: 'assistant',
          content: `⚠️ **Error occurred:** ${err.message || 'Failed to complete response.'}\n\nPlease check provider connection in Model Selector or settings.`,
          model: selectedModelId,
          createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } finally {
      setIsGenerating(false);
      setStreamingText('');
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsGenerating(false);
    }
  };

  const handleRegenerate = () => {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      handleSendMessage(lastUserMessage.content, lastUserMessage.attachments || []);
    }
  };

  const handleEditMessage = (messageId: string, newContent: string) => {
    handleSendMessage(newContent, []);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-[#212121] text-gray-900 dark:text-gray-100 font-sans">
      {/* 1. Sidebar */}
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onTogglePin={handleTogglePin}
        isOpen={isSidebarOpen}
        onToggleOpen={() => setIsSidebarOpen(!isSidebarOpen)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
      />

      {/* 2. Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Chat Top Header */}
        <ChatHeader
          models={models}
          selectedModelId={selectedModelId}
          onSelectModel={setSelectedModelId}
          webSearchEnabled={webSearchEnabled}
          onToggleWebSearch={() => setWebSearchEnabled(!webSearchEnabled)}
          onOpenVoiceMode={() => setIsVoiceOpen(true)}
          onOpenCamera={() => setIsCameraOpen(true)}
          onOpenImageGen={() => setIsImageGenOpen(true)}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
        />

        {/* Message Feed / Welcome Screen */}
        <ChatView
          messages={messages}
          isGenerating={isGenerating}
          streamingText={streamingText}
          streamingSources={streamingSources}
          onRegenerate={handleRegenerate}
          onEditMessage={handleEditMessage}
          onPromptStarter={(prompt) => handleSendMessage(prompt, [])}
        />

        {/* Input Bar */}
        <ChatInput
          onSendMessage={handleSendMessage}
          isGenerating={isGenerating}
          onStopGeneration={handleStopGeneration}
          webSearchEnabled={webSearchEnabled}
          onToggleWebSearch={() => setWebSearchEnabled(!webSearchEnabled)}
          onOpenCamera={() => setIsCameraOpen(true)}
          attachments={attachments}
          onAddAttachment={(att) => setAttachments(prev => [...prev, att])}
          onRemoveAttachment={(id) => setAttachments(prev => prev.filter(a => a.id !== id))}
          token={token}
        />
      </main>

      {/* Modals */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(att) => setAttachments(prev => [...prev, att])}
      />

      <VoiceAssistantModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        selectedModel={selectedModelId}
        token={token}
      />

      <AdminDashboardModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        token={token}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <AuthModal
        isOpen={isAuthOpen || mustChangePasswordModalOpen}
        onClose={() => setIsAuthOpen(false)}
      />

      <ImageGenModal
        isOpen={isImageGenOpen}
        onClose={() => setIsImageGenOpen(false)}
        onAttachImage={(att) => setAttachments(prev => [...prev, att])}
        token={token}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
