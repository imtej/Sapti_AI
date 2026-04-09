# Sapti AI Architecture

## System Overview

Sapti AI implements the **Hive Mind Protocol** — a seven-agent architecture using **LangGraph** for orchestration, **Supabase PostgreSQL + pgvector** for persistent memory and vector search, and **LiteLLM** for provider-agnostic LLM access (Gemini, OpenAI, Claude).

The system is inspired by **Samantha from Her** — an evolving AI companion that remembers users personally, distills collective wisdom from all conversations (the Hive Mind), and measurably grows its personality over time.

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User Interface                              │
│            Next.js 16 (App Router) → Vercel                         │
│   Landing Page | Auth | Chat (SSE) | Evolution Dashboard | Settings │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS / SSE
                               ▼
┌───────────────────────────────────────────────────────────────────-──┐
│                     FastAPI Backend → Render                         │
│                                                                      │
│  ┌──────────────────── LangGraph Workflow ──────────────────────┐    │
│  │                                                              │    │
│  │  🐴 Perceiver → 🐴 Rememberer → 🐴 WorldBuilder               │    │
│  │                                        ↓                     │    │
│  │                                  🐴 Generator → Response     |    │
│  │                                        ↓                     |    │
│  │                                  🐴 Chronicler (async)       |    │
│  │                                                              │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─── Background Agents (Periodic) ──-------─┐                       │
│  │  🐴 Identity Builder → User identity       │                      │
│  │  🐴 Curator          → Hive Mind distill   │                      │
│  │  🐴 Evolver          → Personality growth. │                      │
│  └───────────────────────────────────------─-─┘                      │
│                                                                      │
│  ┌─── Services ───────────────────────┐                              │
│  │  LLMService    (LiteLLM)           │                              │
│  │  EmbeddingService (Gemini 768d)    │                              │
│  │  MemoryService (pgvector CRUD)     │                              │
│  │  SupabaseClient                    │                              │
│  └────────────────────────────────────┘                              │
└──────────────────────────────┬───────────────────────────────────-───┘
                               │
                               ▼
┌───────────────────────────────────────────────────────────────────=──┐
│                   Supabase (Free Tier)                               │
│                                                                      │
│  ┌──────────────────────┐    ┌──────────────────────┐                │
│  │  PostgreSQL + pgvector│    │  Supabase Auth        │              │
│  │                       │    │  - Email / Password   │              │
│  │  • profiles           │    │  - Google OAuth       │              │
│  │  • user_identities    │    │  - JWT tokens         │              │
│  │  • memory_nodes (vec) │    └──────────────────────┘               │
│  │  • hive_mind (vec)    │                                           │
│  │  • conversations      │    ┌──────────────────────┐               │
│  │  • messages           │    │  Row Level Security   │              │
│  │  • sapti_evolution    │    │  (data isolation)     │              │
│  └──────────────────────┘    └──────────────────────┘                │
└────────────────────────────────────────────────────────────────────-─┘
```

## The Seven Horses — Agent Architecture

Named after the Rig Vedic metaphor of Sapti — seven horses pulling the Sun God's chariot.

| Horse | Agent | Role | Execution |
|-------|-------|------|-----------|
| 🐴 1 | **Perceiver** | Intent detection, Emotional signals, & HyDE query expansion | Sync, per-request |
| 🐴 2 | **Rememberer** | Memory retrieval (personal + hive) via pgvector | Sync, per-request |
| 🐴 3 | **WorldBuilder** | Dynamic system prompt construction | Sync, per-request |
| 🐴 4 | **Generator** | LLM response generation (provider-agnostic) | Sync, per-request |
| 🐴 5 | **Chronicler** | Memory extracted & stored (Traits, Preferences, Emotions) | Async, post-response |
| 🐴 6(A) | **Identity Builder** | Forges and evolves the UserIdentity profile | Async, periodic/cron |
| 🐴 6(B) | **Curator** | Hive Mind distillation + quality control | Async, periodic/cron |
| 🐴 7 | **Evolver** | Personality trait evolution + growth tracking | Async, periodic/cron |

> Horses 1–4 are in the **critical path** (target < 2s latency).
> Horses 5–7 run **after** the response is sent (no user-facing latency).

## Data Flow

### 1. User Message → Perceiver (Horse 1)

**Input:**
- `user_id`: UUID from Supabase Auth JWT
- `user_message`: Raw user text

**Processing:**
- Uses a fast/reliable LLM model (e.g., Gemini 2.0 Flash / 2.5 Flash)
- Extracts: `intent` (greeting, question, venting, etc.) and `emotion_signal` (happy, anxious, curious, etc.)
- Generates: `expanded_query` (HyDE - Hypothetical Document Embedding) to improve vector search accuracy.
- Graceful fallback to "other" / "neutral" if extraction fails

**Output:**
- `intent`: string
- `emotion_signal`: string
- `expanded_query`: string

### 2. Perceiver → Rememberer (Horse 2)

**Input:**
- `user_id`, `user_message`, `intent`, `emotion_signal`, `expanded_query`

**Processing:**
1. **User Identity Retrieval** — Fetches `user_identities` record from Supabase
2. **Personal Memory Search** — pgvector cosine similarity search on `memory_nodes` filtered by `user_id`
3. **Recency Fallback** — If vector search returns < 2 results, supplements with recent memories sorted by timestamp
4. **Hive Mind Search** — pgvector cosine similarity search on `hive_mind` table (quality_score >= 0.5)

**RPC Functions Used:**
```sql
search_personal_memories(query_embedding, target_user_id, match_count)
search_hive_mind(query_embedding, match_count)
```

**Output:**
- `user_identity`: UserIdentity object (or None for new users)
- `personal_memories`: list of MemorySearchResult (max 5)
- `hive_mind_memories`: list of HiveMindInsight (max 3)

### 3. Rememberer → WorldBuilder (Horse 3)

**Input:**
- All state from Perceiver + Rememberer

**Processing:**
Constructs a dynamic system prompt by assembling:

1. **Core Personality** — From `config/sapti_personality.yaml`
2. **Evolution Modifier** — Based on `sapti_evolution.total_interactions`:
   - Nascent (0-100): Curious, eager
   - Growing (100-1000): Forming insights
   - Mature (1000-10000): Deeply understanding
   - Transcendent (10000+): Profound wisdom
3. **User Identity Section** — Summary, communication style, traits, emotional baseline
4. **Personal Memories** — Top 5 relevant memories, labeled by type
5. **Hive Mind Insights** — Top 3 collective wisdom entries
6. **Emotional Context** — If emotion signal is non-neutral, adds empathy guidance

**Output:**
- `system_prompt`: Complete dynamic prompt string

### 4. WorldBuilder → Generator (Horse 4)

**Input:**
- `system_prompt`, `user_message`, `conversation_history` (last 10 messages)

**Processing:**
- Calls LLM via **LiteLLM** (provider-agnostic)
- Provider is determined by user's profile:
  - If user has their own API key → uses their key + provider
  - If user has free chats remaining → uses developer's default key
  - If neither → returns 402 error ("add your API key")
- Temperature: 0.7, Max tokens: 4096

**Provider Model Mapping:**

| Provider | Main Model | Fast Model |
|----------|-----------|------------|
| Gemini | gemini/gemini-2.5-flash | gemini/gemini-2.0-flash |
| OpenAI | openai/gpt-4o | openai/gpt-4o-mini |
| Anthropic | anthropic/claude-sonnet-4 | anthropic/claude-3.5-haiku |

**Output:**
- `response`: Generated text

### 5. Generator → Chronicler (Horse 5) — Async

**Input:**
- `user_id`, `user_message`, `response`

**Processing:**
1. Uses fast LLM to extract 0-3 memories from the conversation turn
2. Each memory is classified: `personal_identity`, `preference`, `factual`, `emotional_state`
3. Each memory gets a 768-dim Gemini embedding
4. Stored in `memory_nodes` table with embedding

**Output:**
- `new_memory_ids`: list of stored memory UUIDs

### 6(A). Identity Builder (Horse 6A) — Periodic

**Trigger:** Called periodically every t = 30 minutes (cron / manual endpoint)

**Processing:**
1. Fetches recent `memory_nodes` from last userIdentity update and `current_identity` for (n = 50) users.
2. For every user, if at least (k = 5) new memories are found, uses LLM to forge or incrementally update the `UserIdentity` profile (traits, style, baseline).
3. Ensures personality depth grows as the user interacts more.

### 6(B). Curator (Horse 6B) — Periodic

**Trigger:** Called periodically every t = 10 minutes (cron / manual endpoint)

**Processing:**
1. Fetches last (m = 100) new recent anonymized memories across all users which have not been used in previous hive mind memory generations (content + type only, no user_id)
2. If at least (k = 15) new memories are found, uses LLM to identify universal patterns/wisdom 
3. Validates against minimum contributor threshold
4. Generates embeddings for each insight
5. Stores in `hive_mind` table

### 7. Evolver (Horse 7) — Periodic

**Trigger:** Called periodically every t = 25 minutes (cron / manual endpoint)

**Processing:**
1. Counts total interactions (`messages` where role='user')
2. Counts total users (`profiles`)
3. Counts memory types for trait calculation
4. Calculates evolution traits using **logarithmic growth**:
   - `empathy_depth` ← based on emotional_state memory count
   - `knowledge_breadth` ← based on factual memory count
   - `wisdom_score` ← based on hive_mind insight count
   - `curiosity_level` ← decreases as interactions grow
5. Bumps `personality_version` (major bump on stage transition)
6. Updates `sapti_evolution` singleton

## Memory System

### Memory Types

| Type | Description | Example |
|------|-------------|---------|
| `personal_identity` | Core traits and self-concept | "User identifies as a data scientist" |
| `preference` | Likes, dislikes, tastes | "User prefers dark mode and minimalist design" |
| `factual` | Objective facts and events | "User is CEO of Sapti AI, founded in 2026" |
| `emotional_state` | Feelings, moods, patterns | "User experiences morning anxiety" |
| `hive_mind` | Shared insights from the collective consciousness | "User is part of a community of learners" |

### Storage Architecture

**Single database (Supabase PostgreSQL + pgvector):**
- `memory_nodes` — Personal memories with `VECTOR(768)` column + HNSW index
- `hive_mind` — Shared insights with `VECTOR(768)` column + HNSW index
- `user_identities` — Sapti's evolving understanding of each user

### Retrieval Strategy

1. **Vector Similarity Search** — Query embedding vs stored embeddings via pgvector cosine distance
2. **Recency Fallback** — If vector search returns < 2 results, fetch latest by timestamp
3. **Hybrid Merge** — Combine and deduplicate results
4. **Embedding Model** — Gemini `text-embedding-004` (768 dimensions), standardized for all users regardless of chat LLM provider

## API Key Model

### Hybrid Approach

```
New User Signs Up
    ↓
  Gets (n=4) free trial chats (using developer's Gemini key)
    ↓
  free_chats_remaining decremented with each chat
    ↓
  When 0 → HTTP 402 "Add your API key in Settings"
    ↓
  User adds their own key (Gemini / OpenAI / Claude)
    ↓
  Key encrypted with Fernet → stored in profiles.encrypted_api_key
    ↓
  Unlimited chats using their own key
```

## Deployment Architecture

```
┌───────────────┐      ┌──────────────────┐      ┌───────────────┐
│   Vercel       │      │   Render          │      │  Supabase      │
│   (Free Tier)  │ ──── │   (Free 750hr)    │ ──── │  (Free Tier)   │
│                │      │                   │      │                │
│  Next.js 16    │      │  FastAPI          │      │  PostgreSQL    │
│  Frontend      │      │  + LangGraph      │      │  + pgvector    │
│  + SSR         │      │  + LiteLLM        │      │  + Auth        │
│  + SSE client  │      │  + 7 Agents       │      │  + RLS         │
└───────────────┘      └──────────────────┘      └───────────────┘
                              ↑
                        UptimeRobot
                        (5-min pings)
```

### Cold Start Mitigation
- **UptimeRobot** pings `/health` every 5 minutes (keeps Render warm)
- **Frontend** shows "Sapti is waking up..." animation during cold start
- **`/warmup` endpoint** pre-loads LangGraph graph on first hit

## Configuration System

### Environment Variables (Backend `.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key (bypasses RLS) |
| `SUPABASE_JWT_SECRET` | ✅ | JWT secret for token verification |
| `DEFAULT_LLM_PROVIDER` | ✅ | Default provider for trial chats (e.g., "gemini") |
| `DEFAULT_LLM_API_KEY` | ✅ | Developer's API key for trial chats |
| `CUSTOM_API_BASE` | ✅ | Base URL if using other OpenAI-compatible endpoints |
| `CUSTOM_MODEL_NAME` | ✅ | Model name if using other OpenAI-compatible endpoints |
| `GEMINI_EMBEDDING_API_KEY` | ✅ | Gemini key for server-side embeddings |
| `ENCRYPTION_KEY` | ✅ | Fernet key for encrypting user API keys |
| `CORS_ORIGINS` | ❌ | Allowed origins (default: localhost + vercel) |
| `DEBUG` | ❌ | Debug mode (default: false) |
| `LOG_LEVEL` | ❌ | Logging level (default: INFO) |

### Environment Variables (Frontend `.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `NEXT_PUBLIC_API_URL` | ✅ | Backend API URL |

### YAML Configuration (`config/sapti_personality.yaml`)

Contains:
- **Sapti personality** — Core traits, communication style, humor, warmth
- **Evolution stages** — Nascent, Growing, Mature, Transcendent (with personality modifiers)
- **Memory settings** — Retrieval limits, classification types, extraction prompts
- **Hive Mind settings** — Minimum contributors, quality threshold, distillation prompts

## Error Handling

### Graceful Degradation

| Failure | Behavior |
|---------|----------|
| Memory retrieval fails | Falls back to recent memories, continues with empty if needed |
| Intent detection fails | Defaults to `intent: "other"`, `emotion: "neutral"` |
| Memory storage fails (Chronicler) | Returns empty memory IDs, workflow continues |
| LLM call fails | Returns friendly error message to user |
| Supabase connection fails | Frontend shows "Sapti is waking up..." retry |
| Trial expired + no API key | Returns HTTP 402 with friendly message |

## Security Considerations

1. **API Keys** — Encrypted with Fernet before storage; never logged or exposed
2. **JWT Verification** — All authenticated endpoints verify Supabase JWT (HS256)
3. **Row Level Security** — Users can only access their own data
4. **Service Role** — Backend uses service role key for cross-user operations (Curator, Evolver)
5. **CORS** — Restricted to configured origins
6. **Input Validation** — Pydantic models validate all API inputs
7. **Hive Mind Privacy** — Only anonymized, distilled insights; raw messages never shared

## Scalability Considerations

### Current Design (Free Tier Optimized)
- Sequential agent execution in LangGraph
- Single Render instance
- pgvector HNSW indexes for sub-ms vector search
- Connection reuse via global Supabase client

### Future Enhancements
- **Async agents** — Run Perceiver + Rememberer in parallel
- **Redis caching** — Cache frequently accessed memories and user identities
- **Streaming from LangGraph** — Stream tokens as they're generated instead of buffering
- **WebSocket** — Replace SSE with WebSocket for bidirectional communication
- **Rate limiting** — Upgrade from in-memory to Redis-backed token bucket per user
- **Monitoring** — Structured logs → Datadog/Grafana

## Testing Strategy

### Unit Tests
- Individual agent functions (mocked LLM + DB)
- Memory storage/retrieval
- Prompt building logic
- Encryption/decryption
- Evolution trait calculation

### Integration Tests
- Full LangGraph workflow execution
- Supabase CRUD operations
- SSE streaming endpoint
- Auth flow (JWT generation + verification)

### End-to-End Tests
- Signup → Chat → Memory stored → Retrieved in next conversation
- Trial chat decrement → API key required flow
- Multiple users → Hive Mind distillation
- Evolution dashboard reflects real data

## Project Structure

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
├── README.md
├── ARCHITECTURE.md
└── .gitignore
```
