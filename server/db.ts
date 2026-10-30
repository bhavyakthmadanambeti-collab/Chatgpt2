import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'chatgpt_db.json');
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: 'admin' | 'user';
  mustChangePassword: boolean;
  status: 'active' | 'disabled';
  createdAt: string;
  lastLoginAt?: string;
  avatar?: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'video' | 'document' | 'audio' | 'other';
  mimeType: string;
  size: number;
  url: string;
  extractedText?: string;
  metadata?: Record<string, any>;
}

export interface WebSource {
  title: string;
  url: string;
  snippet: string;
  domain?: string;
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
  tokens?: number;
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

export interface SystemLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  category: string;
  message: string;
  details?: any;
}

export interface DatabaseSchema {
  users: User[];
  conversations: Conversation[];
  messages: Message[];
  settings: SystemSettings;
  logs: SystemLog[];
}

const DEFAULT_SETTINGS: SystemSettings = {
  siteName: 'ChatGPT Pro',
  siteDescription: 'Modern, Production-grade AI Assistant',
  defaultModel: 'gemini-3.8-flash',
  allowRegistration: true,
  maxUploadSizeMB: 50,
  searxngUrl: 'http://localhost:8080',
  ollamaUrl: 'http://127.0.0.1:11434',
  openaiBaseUrl: 'https://api.openai.com/v1',
  openaiApiKey: '',
  anthropicApiKey: '',
  systemPrompt: 'You are ChatGPT, a large language model trained by OpenAI, operating in ChatGPT Pro mode. You are helpful, precise, thoughtful, and articulate. Provide comprehensive, well-structured, formatted responses with Markdown, code blocks with syntax highlighting, and clear explanations.',
};

class Database {
  private data: DatabaseSchema = {
    users: [],
    conversations: [],
    messages: [],
    settings: DEFAULT_SETTINGS,
    logs: [],
  };

  constructor() {
    this.init();
  }

  private init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = {
          users: parsed.users || [],
          conversations: parsed.conversations || [],
          messages: parsed.messages || [],
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
          logs: parsed.logs || [],
        };
      } catch (e) {
        console.error('Failed to parse DB file, resetting with defaults', e);
        this.data = {
          users: [],
          conversations: [],
          messages: [],
          settings: DEFAULT_SETTINGS,
          logs: [],
        };
      }
    }

    // Ensure Initial Owner Setup: bhavyakthmadanambeti@gmail.com / bhavyakth
    this.ensureOwner();
    this.save();
  }

  private ensureOwner() {
    const ownerEmail = 'bhavyakthmadanambeti@gmail.com';
    const existing = this.data.users.find(u => u.email.toLowerCase() === ownerEmail.toLowerCase());
    if (!existing) {
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync('bhavyakth', salt);
      const ownerUser: User = {
        id: 'user_owner_' + Date.now(),
        email: ownerEmail,
        name: 'Bhavya Madanambeti (Owner)',
        passwordHash,
        role: 'admin',
        mustChangePassword: true, // Requires change after first login per instructions
        status: 'active',
        createdAt: new Date().toISOString(),
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&auto=format&fit=crop&q=80',
      };
      this.data.users.push(ownerUser);
      this.addLog('info', 'Auth', 'Initialized Owner account with initial credentials (password change required)', { email: ownerEmail });
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving database:', e);
    }
  }

  // Users
  getUsers(): User[] {
    return this.data.users;
  }

  getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  getUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  createUser(user: User): User {
    this.data.users.push(user);
    this.save();
    return user;
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const index = this.data.users.findIndex(u => u.id === id);
    if (index === -1) return undefined;
    this.data.users[index] = { ...this.data.users[index], ...updates };
    this.save();
    return this.data.users[index];
  }

  deleteUser(id: string): boolean {
    const initialLen = this.data.users.length;
    this.data.users = this.data.users.filter(u => u.id !== id);
    // Also remove their conversations & messages
    const convIds = this.data.conversations.filter(c => c.userId === id).map(c => c.id);
    this.data.conversations = this.data.conversations.filter(c => c.userId !== id);
    this.data.messages = this.data.messages.filter(m => !convIds.includes(m.conversationId));
    this.save();
    return this.data.users.length < initialLen;
  }

  // Conversations
  getConversations(userId: string): Conversation[] {
    return this.data.conversations
      .filter(c => c.userId === userId)
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }

  getConversationById(id: string): Conversation | undefined {
    return this.data.conversations.find(c => c.id === id);
  }

  createConversation(conv: Conversation): Conversation {
    this.data.conversations.unshift(conv);
    this.save();
    return conv;
  }

  updateConversation(id: string, updates: Partial<Conversation>): Conversation | undefined {
    const index = this.data.conversations.findIndex(c => c.id === id);
    if (index === -1) return undefined;
    this.data.conversations[index] = {
      ...this.data.conversations[index],
      ...updates,
      updatedAt: updates.updatedAt || new Date().toISOString(),
    };
    this.save();
    return this.data.conversations[index];
  }

  deleteConversation(id: string): boolean {
    const initialLen = this.data.conversations.length;
    this.data.conversations = this.data.conversations.filter(c => c.id !== id);
    this.data.messages = this.data.messages.filter(m => m.conversationId !== id);
    this.save();
    return this.data.conversations.length < initialLen;
  }

  // Messages
  getMessages(conversationId: string): Message[] {
    return this.data.messages
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  createMessage(msg: Message): Message {
    this.data.messages.push(msg);
    // Update conversation messageCount and updatedAt
    const conv = this.data.conversations.find(c => c.id === msg.conversationId);
    if (conv) {
      conv.messageCount = (conv.messageCount || 0) + 1;
      conv.updatedAt = new Date().toISOString();
    }
    this.save();
    return msg;
  }

  updateMessage(id: string, updates: Partial<Message>): Message | undefined {
    const index = this.data.messages.findIndex(m => m.id === id);
    if (index === -1) return undefined;
    this.data.messages[index] = { ...this.data.messages[index], ...updates };
    this.save();
    return this.data.messages[index];
  }

  deleteMessagesAfter(conversationId: string, timestamp: string): void {
    const cutoff = new Date(timestamp).getTime();
    this.data.messages = this.data.messages.filter(m => {
      if (m.conversationId !== conversationId) return true;
      return new Date(m.createdAt).getTime() <= cutoff;
    });
    const conv = this.data.conversations.find(c => c.id === conversationId);
    if (conv) {
      conv.messageCount = this.data.messages.filter(m => m.conversationId === conversationId).length;
      conv.updatedAt = new Date().toISOString();
    }
    this.save();
  }

  // Settings
  getSettings(): SystemSettings {
    return { ...this.data.settings };
  }

  updateSettings(updates: Partial<SystemSettings>): SystemSettings {
    this.data.settings = { ...this.data.settings, ...updates };
    this.save();
    return this.data.settings;
  }

  // Logs
  getLogs(limit = 100): SystemLog[] {
    return [...this.data.logs].reverse().slice(0, limit);
  }

  addLog(level: 'info' | 'warn' | 'error', category: string, message: string, details?: any): void {
    const log: SystemLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details,
    };
    this.data.logs.push(log);
    // Keep last 1000 logs
    if (this.data.logs.length > 1000) {
      this.data.logs = this.data.logs.slice(this.data.logs.length - 1000);
    }
    this.save();
  }

  // Metrics
  getMetrics() {
    let uploadsSize = 0;
    try {
      if (fs.existsSync(UPLOADS_DIR)) {
        const files = fs.readdirSync(UPLOADS_DIR);
        for (const file of files) {
          const st = fs.statSync(path.join(UPLOADS_DIR, file));
          uploadsSize += st.size;
        }
      }
    } catch {}

    return {
      totalUsers: this.data.users.length,
      activeUsers: this.data.users.filter(u => u.status === 'active').length,
      totalConversations: this.data.conversations.length,
      totalMessages: this.data.messages.length,
      storageSizeBytes: uploadsSize,
      storageSizeMB: +(uploadsSize / (1024 * 1024)).toFixed(2),
      uptimeSeconds: process.uptime(),
      memoryUsage: process.memoryUsage(),
    };
  }
}

export const db = new Database();
export { UPLOADS_DIR };
