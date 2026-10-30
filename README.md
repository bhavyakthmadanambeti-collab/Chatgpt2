# ChatGPT Pro - Production-Ready AI Assistant Website

A complete, full-stack AI assistant website with multi-model intelligence, live web search, document RAG, multimodal vision, speech voice mode, and owner administration dashboard.

---

## 🌟 Key Features

1. **ChatGPT-Style Interface**
   - Clean, modern, responsive UI (desktop, tablet, mobile)
   - Dark mode & Light mode
   - Sidebar with New Chat, conversation history, real-time search, rename, pin, and delete
   - Markdown rendering with syntax highlighting, copy-code buttons, and GFM tables
   - Regenerate response, inline message editing, text-to-speech speak aloud, and generation cancellation

2. **Multi-Model AI Chat Engine**
   - **Google Gemini Engine**: Server-side `@google/genai` integration with `gemini-3.8-flash` and `gemini-4-argon`
   - **Local Open-Source AI (Ollama)**: Direct integration with locally hosted models (`llama3.2`, `llama3.1`, `qwen2.5`, `gemma2`, `mistral`, `deepseek-r1`)
   - **OpenAI & Anthropic Compatible**: Optional cloud API models with transparent connection status
   - Real-time Server-Sent Events (SSE) streaming responses

3. **Live Web Search & Citations**
   - Live Google Search Grounding with source links and citations
   - Public search fallbacks (DuckDuckGo, Wikipedia, SearXNG)
   - Toggle live web search on/off directly from chat input
   - Citations drawer showing source links, titles, snippets, and domains

4. **Document Intelligence & RAG**
   - Multi-format file support: **PDF, DOCX, TXT, CSV, XLSX, PPTX, JSON, Code**
   - Automatic text parsing, table extraction, and document chunking
   - Direct multimodal document comprehension with OCR
   - Grounded Q&A with clear document citations

5. **Multimodal Vision & Camera Support**
   - Image upload and comprehension (PNG, JPEG, WebP)
   - Real-time webcam snapshot capture (`getUserMedia`)
   - AI Image Studio (`/api/ai/generate-image`) with multiple aspect ratios and downloads

6. **Voice Assistant Mode**
   - Fullscreen ChatGPT Voice Mode with animated pulsating visualizer
   - Speech-to-text dictation and listening states
   - Spoken AI responses with configurable speech rates and voices
   - Hands-free conversation loop

7. **Security & User Authentication**
   - User registration and login with bcrypt password hashing
   - JWT session management and protected routes
   - Initial Owner Setup:
     - **Owner Email**: `bhavyakthmadanambeti@gmail.com`
     - **Initial Setup Password**: `bhavyakth`
     - **Enforced Security**: System forces password change on first login before continuing.

8. **Owner / Admin Dashboard**
   - Live AI Provider connectivity diagnostics with ping latency tests
   - User management (view users, toggle active/disabled, role assignment)
   - System storage and memory monitoring
   - Branding customization and system prompt directives
   - Security audit logs console

---

## 📁 Project Folder Structure

```text
├── Dockerfile                  # Multi-stage production container
├── docker-compose.yml          # ChatGPT Pro + Ollama + SearXNG cluster
├── index.html                  # HTML5 entry point with metadata and fonts
├── metadata.json               # Applet capabilities & permissions
├── package.json                # Dependencies and full-stack scripts
├── requirements.txt            # Python document & OCR microservice tools
├── server.ts                   # Express full-stack API server + Vite middleware
├── server/
│   ├── ai.ts                   # Multi-provider streaming engine (Gemini, Ollama, OpenAI)
│   ├── auth.ts                 # JWT auth, bcrypt hashing, admin middleware
│   ├── db.ts                   # Persistent database schema, migrations & seed
│   ├── extractor.ts            # Document intelligence parser (PDF, DOCX, CSV, TXT)
│   └── search.ts               # Live web search engine (Google, SearXNG, DuckDuckGo)
├── src/
│   ├── App.tsx                 # Core application controller
│   ├── index.css               # Tailwind CSS v4 styling & animations
│   ├── main.tsx                # React 19 root
│   ├── types.ts                # TypeScript type definitions
│   ├── context/
│   │   ├── AuthContext.tsx     # Session state & password change enforcement
│   │   └── ThemeContext.tsx    # Dark / Light theme state
│   └── components/
│       ├── AdminDashboardModal.tsx # Owner administration portal
│       ├── AuthModal.tsx       # Sign in, sign up, and force password change
│       ├── CameraModal.tsx     # Live webcam photo capture
│       ├── ChatHeader.tsx      # Model selector & feature shortcuts
│       ├── ChatInput.tsx       # Autosizing input, attachments, mic & search toggle
│       ├── ChatView.tsx        # Message list, citations, TTS & prompt starters
│       ├── ImageGenModal.tsx   # AI Image Studio
│       ├── MarkdownRenderer.tsx # Syntax highlighted code blocks & tables
│       ├── SettingsModal.tsx   # General, voice, and user settings
│       ├── Sidebar.tsx         # Conversation history, pinned chats & search
│       └── VoiceAssistantModal.tsx # ChatGPT Voice Mode with animated orb
└── vite.config.ts              # Vite bundler configuration
```

---

## 🚀 Quick Start (Local Run)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy the template and verify your keys:
```bash
cp .env.example .env
```
Ensure `GEMINI_API_KEY` is set.

### 3. Start Local Open-Source AI (Optional - for local models)
Install [Ollama](https://ollama.ai) and pull a model:
```bash
# Start Ollama
ollama serve

# In another terminal, pull your desired open model
ollama run llama3.2
# or
ollama run qwen2.5
```

### 4. Run the Full-Stack Application
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

## 🔑 Initial Admin / Owner Credentials

- **Email**: `bhavyakthmadanambeti@gmail.com`
- **Initial Password**: `bhavyakth`

> **Note on First Login:** When logging in with the initial setup password, the system automatically presents the **Security Setup** screen prompting the owner to configure their private, permanent password.

---

## ⚙️ Model Tiers & Pricing Breakdown

### 1. Features That Work 100% Free Without Payment:
- **Local AI Models**: Unlimited inference with Ollama (`llama3.2`, `qwen2.5`, `gemma2`) running on your local machine with no API keys or subscription fees.
- **Web Search**: DuckDuckGo & Wikipedia search scraping.
- **Document Intelligence**: Uploading, parsing, and chatting with documents.
- **Voice Mode**: Browser-native SpeechRecognition and SpeechSynthesis.
- **Camera Snapshot**: Browser WebRTC `getUserMedia`.
- **User & Conversation History**: Stored securely on the local server.

### 2. Features Requiring External APIs or Hardware:
- **Gemini Cloud Models**: Requires `GEMINI_API_KEY` (Free Tier or Paid Tier for advanced reasoning models like `gemini-4-argon`).
- **OpenAI Models**: Requires `OPENAI_API_KEY` if configured in Settings.
- **High-Speed Local LLMs**: Large local models (e.g., 70B parameters) require dedicated GPU hardware (NVIDIA RTX / Apple Silicon).

---

## 🐳 Docker Deployment

To spin up ChatGPT Pro along with an Ollama container and SearXNG search engine:

```bash
docker compose up -d
```

Access the application at `http://localhost:3000`.
