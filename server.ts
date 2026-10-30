import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import dotenv from 'dotenv';
import { db, UPLOADS_DIR, User, Conversation, Message, Attachment } from './server/db.js';
import {
  authenticateToken,
  optionalAuthenticateToken,
  requireAdmin,
  generateToken,
  sanitizeUser,
  hashPassword,
  comparePassword,
  AuthRequest,
} from './server/auth.js';
import { getAvailableModels, streamChatCompletion, pingProvider, generateAIImage } from './server/ai.js';
import { performWebSearch, checkSearchHealth } from './server/search.js';
import { extractDocumentText } from './server/extractor.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads serving
app.use('/uploads', express.static(UPLOADS_DIR));

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, uniqueSuffix + '-' + sanitized);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// ==========================================
// 1. AUTHENTICATION ROUTES
// ==========================================

// Register
app.post('/api/auth/register', (req: Request, res: Response): void => {
  const settings = db.getSettings();
  if (!settings.allowRegistration) {
    res.status(403).json({ error: 'Public user registration is currently disabled by administrator.' });
    return;
  }

  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    res.status(400).json({ error: 'Name, email, and password are required.' });
    return;
  }

  const existing = db.getUserByEmail(email);
  if (existing) {
    res.status(409).json({ error: 'An account with this email address already exists.' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    return;
  }

  const newUser: User = {
    id: 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    email: email.trim().toLowerCase(),
    name: name.trim(),
    passwordHash: hashPassword(password),
    role: 'user',
    mustChangePassword: false,
    status: 'active',
    createdAt: new Date().toISOString(),
    avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
  };

  db.createUser(newUser);
  db.addLog('info', 'Auth', `New user registered: ${newUser.email}`, { userId: newUser.id });

  const token = generateToken(newUser);
  res.status(201).json({
    token,
    user: sanitizeUser(newUser),
  });
});

// Login
app.post('/api/auth/login', (req: Request, res: Response): void => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const user = db.getUserByEmail(email);
  if (!user || !comparePassword(password, user.passwordHash)) {
    db.addLog('warn', 'Auth', `Failed login attempt for ${email}`);
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  if (user.status === 'disabled') {
    res.status(403).json({ error: 'Your account has been deactivated. Please contact support.' });
    return;
  }

  // Update last login
  db.updateUser(user.id, { lastLoginAt: new Date().toISOString() });
  db.addLog('info', 'Auth', `User logged in: ${user.email}`, { role: user.role });

  const token = generateToken(user);
  res.json({
    token,
    user: sanitizeUser(user),
  });
});

// Current User Profile
app.get('/api/auth/me', authenticateToken, (req: AuthRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  res.json({ user: sanitizeUser(req.user) });
});

// Update Profile
app.put('/api/auth/profile', authenticateToken, (req: AuthRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const { name, avatar } = req.body;
  const updated = db.updateUser(req.user.id, {
    ...(name ? { name: name.trim() } : {}),
    ...(avatar ? { avatar } : {}),
  });
  if (!updated) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user: sanitizeUser(updated) });
});

// Change Password (Used also for Owner initial password change requirement)
app.post('/api/auth/change-password', authenticateToken, (req: AuthRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters.' });
    return;
  }

  // If user must change password (e.g. initial owner setup), they don't necessarily have to re-enter current if it matches
  if (!comparePassword(currentPassword, req.user.passwordHash)) {
    res.status(400).json({ error: 'Current password is incorrect.' });
    return;
  }

  const updated = db.updateUser(req.user.id, {
    passwordHash: hashPassword(newPassword),
    mustChangePassword: false,
  });

  db.addLog('info', 'Auth', `Password changed successfully for ${req.user.email}`);
  const newToken = generateToken(updated!);
  res.json({
    message: 'Password successfully changed.',
    token: newToken,
    user: sanitizeUser(updated!),
  });
});

// Reset Password Request (Simulation/Workflow)
app.post('/api/auth/reset-password-request', (req: Request, res: Response): void => {
  const { email } = req.body;
  const user = db.getUserByEmail(email);
  if (user) {
    db.addLog('info', 'Auth', `Password reset requested for ${email}`);
  }
  // Always return success to prevent email enumeration
  res.json({
    message: 'If an account with that email exists, password reset instructions have been logged to the security console.',
  });
});

// ==========================================
// 2. CONVERSATION ROUTES
// ==========================================

// Get user conversations
app.get('/api/conversations', authenticateToken, (req: AuthRequest, res: Response): void => {
  if (!req.user) return;
  const convs = db.getConversations(req.user.id);
  res.json({ conversations: convs });
});

// Create new conversation
app.post('/api/conversations', authenticateToken, (req: AuthRequest, res: Response): void => {
  if (!req.user) return;
  const { title, model } = req.body;
  const settings = db.getSettings();

  const newConv: Conversation = {
    id: 'conv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    userId: req.user.id,
    title: (title || 'New Chat').trim(),
    model: model || settings.defaultModel,
    isPinned: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messageCount: 0,
  };

  db.createConversation(newConv);
  res.status(201).json({ conversation: newConv });
});

// Get single conversation with its messages
app.get('/api/conversations/:id', authenticateToken, (req: AuthRequest, res: Response): void => {
  if (!req.user) return;
  const conv = db.getConversationById(req.params.id);
  if (!conv || (conv.userId !== req.user.id && req.user.role !== 'admin')) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }
  const messages = db.getMessages(conv.id);
  res.json({ conversation: conv, messages });
});

// Update conversation (title, pin)
app.put('/api/conversations/:id', authenticateToken, (req: AuthRequest, res: Response): void => {
  if (!req.user) return;
  const conv = db.getConversationById(req.params.id);
  if (!conv || (conv.userId !== req.user.id && req.user.role !== 'admin')) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }
  const { title, isPinned, model } = req.body;
  const updated = db.updateConversation(conv.id, {
    ...(title !== undefined ? { title: title.trim() } : {}),
    ...(isPinned !== undefined ? { isPinned: Boolean(isPinned) } : {}),
    ...(model !== undefined ? { model } : {}),
  });
  res.json({ conversation: updated });
});

// Delete conversation
app.delete('/api/conversations/:id', authenticateToken, (req: AuthRequest, res: Response): void => {
  if (!req.user) return;
  const conv = db.getConversationById(req.params.id);
  if (!conv || (conv.userId !== req.user.id && req.user.role !== 'admin')) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }
  db.deleteConversation(conv.id);
  res.json({ success: true, message: 'Conversation deleted.' });
});

// ==========================================
// 3. AI CHAT STREAMING ROUTE (SSE)
// ==========================================

app.post('/api/chat/stream', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { conversationId, content, model, webSearch, attachments } = req.body;
  if (!content && (!attachments || attachments.length === 0)) {
    res.status(400).json({ error: 'Message content or attachments required.' });
    return;
  }

  let conv = conversationId ? db.getConversationById(conversationId) : null;
  const settings = db.getSettings();
  const selectedModel = model || conv?.model || settings.defaultModel;

  // Auto-create conversation if none supplied
  if (!conv) {
    const autoTitle = content ? content.slice(0, 36) + (content.length > 36 ? '...' : '') : 'New Chat';
    conv = db.createConversation({
      id: 'conv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      userId: req.user.id,
      title: autoTitle,
      model: selectedModel,
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: 0,
    });
  }

  // Auto-generate title if conversation was default titled "New Chat" and this is first message
  if (conv.title === 'New Chat' && content) {
    const cleanTitle = content.trim().slice(0, 36);
    db.updateConversation(conv.id, { title: cleanTitle });
  }

  // 1. Save user message to database
  const userMsg: Message = {
    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    conversationId: conv.id,
    userId: req.user.id,
    role: 'user',
    content: content || '',
    model: selectedModel,
    createdAt: new Date().toISOString(),
    attachments: attachments || [],
  };
  db.createMessage(userMsg);

  // Retrieve message history for context
  const history = db.getMessages(conv.id).map(m => ({
    role: m.role,
    content: m.content,
  }));

  // Setup Server-Sent Events headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send conversation info event
  res.write(`data: ${JSON.stringify({ type: 'start', conversationId: conv.id, userMessage: userMsg })}\n\n`);

  const abortController = new AbortController();
  req.on('close', () => {
    abortController.abort();
  });

  let assistantText = '';
  const sourcesCollected: any[] = [];

  try {
    const result = await streamChatCompletion({
      model: selectedModel,
      messages: history,
      webSearch: Boolean(webSearch),
      attachments,
      signal: abortController.signal,
      onChunk: (chunk: string) => {
        assistantText += chunk;
        res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`);
      },
      onSources: (sources) => {
        for (const s of sources) {
          if (!sourcesCollected.some(x => x.url === s.url)) {
            sourcesCollected.push(s);
          }
        }
        res.write(`data: ${JSON.stringify({ type: 'sources', sources: sourcesCollected })}\n\n`);
      },
    });

    // Save Assistant Message
    const assistantMsg: Message = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      conversationId: conv.id,
      userId: req.user.id,
      role: 'assistant',
      content: result.fullText || assistantText,
      model: selectedModel,
      createdAt: new Date().toISOString(),
      webSearchEnabled: Boolean(webSearch),
      sources: result.sources || sourcesCollected,
      ragSources: attachments?.map((a: Attachment) => a.name) || [],
    };
    db.createMessage(assistantMsg);

    res.write(`data: ${JSON.stringify({ type: 'done', message: assistantMsg })}\n\n`);
    res.end();
  } catch (err: any) {
    console.error('Chat streaming failed:', err);
    db.addLog('error', 'AI Chat', `Chat failed with model ${selectedModel}: ${err.message}`, { error: err.stack });
    res.write(`data: ${JSON.stringify({ type: 'error', error: err.message || 'AI request failed' })}\n\n`);
    res.end();
  }
});

// ==========================================
// 4. FILE UPLOADS & DOCUMENT INTELLIGENCE
// ==========================================

app.post('/api/upload', authenticateToken, upload.single('file'), async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded.' });
    return;
  }

  const { filename, path: filePath, mimetype, size, originalname } = req.file;
  let type: Attachment['type'] = 'other';
  if (mimetype.startsWith('image/')) type = 'image';
  else if (mimetype.startsWith('video/')) type = 'video';
  else if (mimetype.startsWith('audio/')) type = 'audio';
  else type = 'document';

  try {
    const extracted = await extractDocumentText(filePath, mimetype, originalname);
    const attachment: Attachment = {
      id: 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: originalname,
      type,
      mimeType: mimetype,
      size,
      url: `/uploads/${filename}`,
      extractedText: extracted.text,
      metadata: {
        wordCount: extracted.wordCount,
        summaryPreview: extracted.summaryPreview,
        tableData: extracted.tableData,
      },
    };

    db.addLog('info', 'Upload', `User uploaded file: ${originalname} (${type}, ${(size / 1024).toFixed(1)} KB)`);
    res.json({ attachment });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to process document: ' + err.message });
  }
});

// ==========================================
// 5. AI PROVIDER & MODEL ROUTES
// ==========================================

// Get available models & connection status
app.get('/api/ai/models', async (req: Request, res: Response): Promise<void> => {
  try {
    const models = await getAvailableModels();
    res.json({ models });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Live ping test provider
app.post('/api/ai/ping', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const { provider } = req.body;
  if (!provider) {
    res.status(400).json({ error: 'Provider is required' });
    return;
  }
  const result = await pingProvider(provider);
  res.json(result);
});

// AI Image Generation
app.post('/api/ai/generate-image', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const { prompt, aspectRatio } = req.body;
  if (!prompt) {
    res.status(400).json({ error: 'Prompt is required' });
    return;
  }
  try {
    const result = await generateAIImage(prompt, aspectRatio || '1:1');
    db.addLog('info', 'AI Image', `Generated image for prompt: "${prompt.slice(0, 50)}..."`);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Image generation failed' });
  }
});

// Web search test
app.get('/api/search', async (req: Request, res: Response): Promise<void> => {
  const q = req.query.q as string;
  if (!q) {
    res.status(400).json({ error: 'Search query required' });
    return;
  }
  const results = await performWebSearch(q, 5);
  res.json({ query: q, results });
});

// ==========================================
// 6. OWNER & ADMIN DASHBOARD ROUTES
// ==========================================

// Get all users
app.get('/api/admin/users', authenticateToken, requireAdmin, (req: AuthRequest, res: Response): void => {
  const users = db.getUsers().map(sanitizeUser);
  res.json({ users });
});

// Update user status or role
app.put('/api/admin/users/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response): void => {
  const { status, role } = req.body;
  const user = db.getUserById(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // Prevent disabling the initial owner account
  if (user.email === 'bhavyakthmadanambeti@gmail.com' && status === 'disabled') {
    res.status(400).json({ error: 'The primary owner account cannot be disabled.' });
    return;
  }

  const updated = db.updateUser(user.id, {
    ...(status ? { status } : {}),
    ...(role ? { role } : {}),
  });

  db.addLog('info', 'Admin', `Updated user ${user.email}: status=${status}, role=${role}`);
  res.json({ user: sanitizeUser(updated!) });
});

// Delete user
app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response): void => {
  const user = db.getUserById(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  if (user.email === 'bhavyakthmadanambeti@gmail.com') {
    res.status(400).json({ error: 'The primary owner account cannot be deleted.' });
    return;
  }

  db.deleteUser(user.id);
  db.addLog('warn', 'Admin', `Deleted user ${user.email}`);
  res.json({ success: true, message: 'User and all associated data deleted.' });
});

// Admin system health & metrics
app.get('/api/admin/health', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const metrics = db.getMetrics();
  const searchHealth = await checkSearchHealth();

  res.json({
    metrics,
    searchHealth,
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
      hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
      hasAnthropicKey: Boolean(process.env.ANTHROPIC_API_KEY),
    },
  });
});

// Admin settings
app.get('/api/admin/settings', authenticateToken, requireAdmin, (req: AuthRequest, res: Response): void => {
  res.json({ settings: db.getSettings() });
});

app.put('/api/admin/settings', authenticateToken, requireAdmin, (req: AuthRequest, res: Response): void => {
  const updated = db.updateSettings(req.body);
  db.addLog('info', 'Admin', 'Updated system settings');
  res.json({ settings: updated });
});

// Admin logs
app.get('/api/admin/logs', authenticateToken, requireAdmin, (req: AuthRequest, res: Response): void => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
  res.json({ logs: db.getLogs(limit) });
});

// ==========================================
// 7. VITE / FRONTEND SERVING
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ChatGPT Pro] Full-stack Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
