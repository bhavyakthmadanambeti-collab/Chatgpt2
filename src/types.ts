export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  mustChangePassword: boolean;
  status: 'active' | 'disabled';
  createdAt: string;
  lastLoginAt?: string;
  avatar?: string;
}

export interface WebSource {
  title: string;
  url: string;
  snippet: string;
  domain?: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'video' | 'document' | 'audio' | 'other';
  mimeType: string;
  size: number;
  url: string;
  extractedText?: string;
  metadata?: {
    wordCount?: number;
    summaryPreview?: string;
    tableData?: Array<Record<string, string>>;
    durationSeconds?: number;
  };
}

export interface Message {
  id: string;
  conversationId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model: string;
  createdAt: string;
  webSearchEnabled?: boolean;
  sources?: WebSource[];
  attachments?: Attachment[];
  ragSources?: string[];
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  model: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: 'gemini' | 'ollama' | 'openai' | 'anthropic';
  description: string;
  contextLength: string;
  isOnline: boolean;
  isDefault?: boolean;
  capabilities: ('text' | 'vision' | 'search' | 'code' | 'docs')[];
  statusMessage?: string;
}

export interface SystemSettings {
  siteName: string;
  siteDescription: string;
  defaultModel: string;
  allowRegistration: boolean;
  maxUploadSizeMB: number;
  searxngUrl: string;
  ollamaUrl: string;
  openaiBaseUrl: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  systemPrompt: string;
}

export interface SystemHealth {
  metrics: {
    totalUsers: number;
    activeUsers: number;
    totalConversations: number;
    totalMessages: number;
    storageSizeBytes: number;
    storageSizeMB: number;
    uptimeSeconds: number;
    memoryUsage: Record<string, number>;
  };
  searchHealth: {
    status: 'online' | 'offline';
    provider: string;
    message: string;
  };
  environment: {
    nodeVersion: string;
    platform: string;
    hasGeminiKey: boolean;
    hasOpenAIKey: boolean;
    hasAnthropicKey: boolean;
  };
}

export interface SystemLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  category: string;
  message: string;
  details?: any;
}
