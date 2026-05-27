# Sapti AI: The Hive Mind Protocol 🐴 

> **Sapti** (सप्ती): From the Rig Veda — a team of seven horses pulling a single chariot. Multiple processes, one evolving intelligence. 

> {In the Rig Veda, it refers to a team of seven horses pulling a chariot — a metaphor for multiple processes moving one system.} 

A production-grade evolving AI system (AI companion), inspired by Samantha from the movie *Her*. Sapti learns, remembers, and grows wiser with every conversation (with personal memory and *Hive Mind* evolution).

---

## 1. The Core Idea: How an Evolving AI Actually Works

Before any code, here's the **big idea** — how does Sapti actually *evolve* when more users chat with it?

### The Hive Mind Evolution Model

```
┌────────────────────────────────────────────────────────-──────────┐
│                     SAPTI'S CONSCIOUSNESS                         │
│                                                                   │
│  ┌─────────-────┐  ┌─────────-────┐  ┌─────────-────┐             │
│  │  User A's    │  │  User B's    │  │  User C's    │             │
│  │  Personal    │  │  Personal    │  │  Personal    │  ...        │
│  │  Memory      │  │  Memory      │  │  Memory      │             │
│  │  (Private)   │  │  (Private)   │  │  (Private)   │             │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘             │
│         │                 │                 │                     │
│         ▼                 ▼                 ▼                     │
│  ┌─────────────────────────────────────────────────-─────┐        │
│  │              HIVE MIND LAYER (Shared)                 │        │
│  │                                                       │        │
│  │  • Distilled Insights (anonymized wisdom)             │        │
│  │  • Pattern Recognition (what many users discuss)      │        │
│  │  • Emotional Intelligence (learned empathy patterns)  │        │
│  │  • World Knowledge (curated facts from all users)     │        │
│  │  • Behavioral Patterns (what approaches work)         │        │
│  └───────────────────────────────────────────────────────┘        │
│                          │                                        │
│                          ▼                                        │
│  ┌─────────────────────────────────────────────────────-──┐       │
│  │           SAPTI'S EVOLVING PERSONALITY                 │       │
│  │                                                        │       │
│  │  personality_version: 1.0 → 1.1 → 1.2 → ...            │       │
│  │  wisdom_score: grows with more interactions            │       │
│  │  empathy_depth: deepens with emotional conversations   │       │
│  │  knowledge_breadth: expands with diverse topics        │       │
│  └────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────-─────────┘
```

### How Evolution Happens — The 3 Loops

**Loop 1: Personal Memory Loop (Per-User)**
- Every conversation extracts `MemoryNodes` (facts, preferences, emotions, identity)
- Stored privately per user in Supabase + pgvector
- Sapti remembers *you* specifically — like Samantha remembered Theodore

**Loop 2: Hive Mind Distillation Loop (Cross-User)**
- When a pattern or insight appears across multiple users, it gets **promoted** to the Hive Mind
- Example: If 50 users discuss anxiety management, Sapti distills the best patterns into a shared insight
- This is NOT copying private data — it's *distilling wisdom* (e.g., "Many people find morning journaling helpful for anxiety")
- A **curation pipeline** scores, deduplicates, and validates before promotion

**Loop 3: Personality Evolution Loop (Sapti's Growth)**
- Periodically (or at threshold moments), Sapti's core personality traits get updated
- Tracked numerically: `empathy_depth`, `knowledge_breadth`, `wisdom_score`, `interaction_count`
- The system prompt evolves: early Sapti is curious and learning → mature Sapti is wise and insightful
- Users can see "Sapti has evolved" moments in the UI — creating a living, growing companion

Evolution stages: `🌱 Nascent → 🌿 Growing → 🌳 Mature → ✨ Transcendent`

### Privacy-First Hive Mind Rules
1. **Never share raw user messages** — only distilled, anonymized insights
2. **Opt-in only** — users must consent to contribute to the Hive Mind
3. **One-way promotion** — insights go UP to Hive Mind, never DOWN to identify users
4. **Minimum threshold** — an insight needs N+ user occurrences before promotion
5. **Moderation layer** — LLM-based review before any Hive Mind promotion

---

## ✨ What Makes Sapti Special

- **Personal Memory** — Sapti remembers *you*: your preferences, stories, emotions, and personality
- **Hive Mind Evolution** — Sapti distills anonymized wisdom from all conversations, growing collectively wiser
- **Provider Agnostic** — Works with Gemini, OpenAI, or Anthropic (bring your own key)
- **7 AI Agents** — Named after the Rig Vedic horses, each handling a specialized task
- **Privacy First** — Personal data is never shared; only anonymized insights enter the Hive Mind

---

## 🏗️ Architecture — The Seven Horses

| Horse | Agent | Role | Runs |
|-------|-------|------|------|
| 🐴 1 | **Perceiver** | Intent detection, Emotions, & HyDE query expansion | Sync, critical path |
| 🐴 2 | **Rememberer** | Vector retrieval (Personal + Hive Mind) via pgvector | Sync, critical path |
| 🐴 3 | **WorldBuilder** | Constructs the dynamic system prompt | Sync, critical path |
| 🐴 4 | **Generator** | Streams LLM responses to the user | Sync, critical path |
| 🐴 5 | **Chronicler** | Memory extracted & stored (Traits, Preferences, Emotions) | Async, post-response |
| 🐴 6(A) | **Identity Builder** | Forges and evolves the UserIdentity profile | Periodic/cron background |
| 🐴 6(B) | **Curator** | Distills shared wisdom into Hive Mind insights | Periodic/cron background |
| 🐴 7 | **Evolver** | Calculates & updates Sapti's psychological growth | Periodic/cron background |

### System Flow

```
User Message → Perceiver → Rememberer → WorldBuilder → Generator → Response
                                                            ↓
                                                        Chronicler (async)
                                                            ↓
                                                        Identity Builder & Curator
                                                         + 
                                                        Evolver (periodic/cron)
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI (Python) + UV |
| AI Orchestration | LangGraph |
| LLM Gateway | LiteLLM (Gemini/OpenAI/Claude) |
| Database | Supabase PostgreSQL + pgvector |
| Auth | Supabase Auth (Email + Google OAuth) |
| Frontend | Next.js 16 (App Router) |
| Deployment | Render (backend) + Vercel (frontend) |
| Package Manager | UV (backend) + npm (frontend) |

---

## 🔐 API Key Model

- **n (n=1000) free trial chats** with the developer's default API key
- After trial, users provide their own key (Gemini, OpenAI, or Claude)
- Keys are encrypted at rest using Fernet

---

## 🚀 Quick Start

### Prerequisites
- Python 3.12+, UV, Node.js 20+
- [Supabase](https://supabase.com) account (free tier)
- API key for at least one LLM provider

### 1. Clone & Setup

```bash
git clone https://github.com/your-username/sapti-ai.git
cd sapti-ai
```

### 2. Backend

```bash
cd backend
cp .env.example .env  # Fill in your values
uv sync
uv run uvicorn app.main:app --reload
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local  # Fill in your values
npm install
npm run dev
```

### 4. Database

Run the SQL migration in your Supabase SQL Editor:
```
supabase/migrations/001_initial_schema.sql
```

### 5. Access
 For local development:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## 📁 Project Structure

```
sapti-ai/
├── backend/                              # FastAPI + LangGraph (UV)
│   ├── app/
│   │   ├── main.py                       # FastAPI entry point, lifecycle & CORS
│   │   ├── agents/                       # The 7 Orchestration Agents (8 units)
│   │   │   ├── chronicler.py             # 🐴 5: Post-response memory extraction
│   │   │   ├── curator.py                # 🐴 6(B): Hive Mind distillation
│   │   │   ├── evolver.py                # 🐴 7: Personality growth tracking
│   │   │   ├── generator.py              # 🐴 4: LLM response generation
│   │   │   ├── graph.py                  # LangGraph workflow orchestration
│   │   │   ├── identity_builder.py       # 🐴 6(A): User identity profiling
│   │   │   ├── perceiver.py              # 🐴 1: Intent, emotion & HyDE expansion
│   │   │   ├── rememberer.py             # 🐴 2: Vector & relational memory retrieval
│   │   │   ├── state.py                  # TypedDict shared state schema
│   │   │   ├── world_builder.py          # 🐴 3: Dynamic prompt construction
│   │   │   └── __init__.py               # Agent package initialization
│   │   ├── api/
│   │   │   ├── deps.py                   # Dependency injection (Supabase, Auth)
│   │   │   ├── middleware/
│   │   │   │   ├── auth.py               # Supabase JWT token verification
│   │   │   │   ├── rate_limit.py         # In-memory token-bucket rate limiting
│   │   │   │   └── __init__.py           # Middleware package initialization
│   │   │   ├── routes/
│   │   │   │   ├── auth.py               # Auth verification & user info
│   │   │   │   ├── chat.py               # SSE streaming chat endpoint
│   │   │   │   ├── conversations.py      # Conversation CRUD & management
│   │   │   │   ├── evolution.py          # Public evolution statistics
│   │   │   │   ├── profile.py            # Profile & custom API key management
│   │   │   │   └── __init__.py           # Routes package initialization
│   │   │   └── __init__.py               # API package initialization
│   │   ├── config/
│   │   │   ├── settings.py               # Pydantic-based env configuration
│   │   │   ├── sapti_personality.yaml    # Core personality & evolution settings
│   │   │   └── __init__.py               # Config package initialization
│   │   ├── models/
│   │   │   ├── conversation.py           # Schemas for chat messages & sessions
│   │   │   ├── evolution.py              # Sapti's trait-based growth models
│   │   │   ├── memory.py                 # MemoryNode & HiveMindInsight schemas
│   │   │   ├── user.py                   # Profile & UserIdentity models
│   │   │   └── __init__.py               # Models package initialization
│   │   ├── services/
│   │   │   ├── embedding_service.py      # Gemini text-embedding generation
│   │   │   ├── llm_service.py            # LiteLLM provider-agnostic gateway
│   │   │   ├── memory_service.py         # pgvector & relational database logic
│   │   │   ├── supabase_client.py        # Supabase client instantiation
│   │   │   └── __init__.py               # Services package initialization
│   │   ├── utils/
│   │   │   ├── crypto.py                 # Fernet encryption for API keys
│   │   │   ├── logging.py                # Structured logging implementation
│   │   │   └── __init__.py               # Utils package initialization
│   │   └── __init__.py                   # App package initialization
│   ├── .env.example                      # Template for environment variables
│   ├── Dockerfile                        # Multi-stage container production config
│   ├── pyproject.toml                    # UV project & dependency specifications
│   ├── render.yaml                       # Render deployment configuration
│   ├── uv.lock                           # Python dependency lock file
│   └── README.md                         # Backend-specific documentation
│
├── frontend/                             # Next.js 16 (App Router)
│   ├── src/
│   │   ├── app/                          # Next.js App Router (Pages & Layouts)
│   │   │   ├── (auth)/                   # Authentication Group
│   │   │   │   ├── login/page.tsx        # Google OAuth & Email login
│   │   │   │   └── signup/page.tsx       # Registration & Confirmation
│   │   │   ├── (dashboard)/              # Auth-protected Dashboard Group
│   │   │   │   ├── chat/page.tsx         # SSE-based token-streaming interface
│   │   │   │   ├── evolution/page.tsx    # Sapti's lifecycle & trait metrics
│   │   │   │   ├── settings/page.tsx     # Profile & BYOK (Bring Your Own Key)
│   │   │   │   └── layout.tsx            # Persistent sidebar & state wrapper
│   │   │   ├── (policies)/               # Static Legal & Info Pages
│   │   │   │   ├── about/page.tsx        # Project philosophy & lore
│   │   │   │   ├── privacy/page.tsx      # Target data usage and Hive Mind policy
│   │   │   │   └── terms/page.tsx        # Hobby project AS-IS disclaimers
│   │   │   ├── globals.css               # Design system tokens & CSS variables
│   │   │   ├── layout.tsx                # Root provider & font configuration
│   │   │   └── page.tsx                  # Premium landing page
│   │   ├── components/                   # Modular UI Components
│   │   │   ├── chat/                     # Chat ecosystem (Bubbles, Indicators)
│   │   │   │   ├── ChatWindow.tsx        # Scroll-optimized message container
│   │   │   │   ├── MessageBubble.tsx     # Markdown-aware message bubble
│   │   │   │   ├── StreamingText.tsx     # Typewriter token animation
│   │   │   │   ├── TypingIndicator.tsx   # Thinking dots & brain-orb
│   │   │   │   └── ConversationList.tsx  # Sidebar history management
│   │   │   ├── evolution/                # Sapti's Growth Visuals
│   │   │   │   ├── EvolutionOrb.tsx      # Multi-stage stage-colored orb
│   │   │   │   └── GrowthChart.tsx       # Trait progression grid
│   │   │   └── layout/                   # Layout Foundations
│   │   │       ├── Sidebar.tsx           # Collapsible primary navigation
│   │   │       ├── Header.tsx            # Mobile-optimized top bar
│   │   │       └── MobileNav.tsx         # Hand-friendly bottom tab bar
│   │   └── lib/                          # Core Utilities & SDKs
│   │       ├── api.ts                    # Centralized axios-like fetch wrapper
│   │       ├── utils.ts                  # Layout & animation helper functions
│   │       └── supabase/                 # Client/Server-side Auth SDKs
│   ├── .env.example                      # Template for environment variables
│   ├── next.config.ts                    # Next.js configuration settings
│   ├── package.json                      # Dependencies & NPM scripts
│   ├── tsconfig.json                     # TypeScript compiler configuration
│   └── README.md                         # Frontend documentation
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql       # Full schema + pgvector + RLS
│
├── ARCHITECTURE.md                       # Detailed technical architecture
├── README.md
└── .gitignore
```

---

## 📄 License

This project is for Sapti AI.

## 👤 Contributors

- Ravi Tej (Data Scientist & Applied AI Researcher)

---

**Sapti AI** — Building Evolving Intelligence 🐴
