# Sapti AI Backend

The backend for Sapti AI is a production-grade orchestration layer built heavily on **FastAPI**, **LangGraph**, and **Supabase (pgvector)**. It employs a **"Seven Horses" (Agent) Architecture** to execute Sapti's evolving cognitive behaviors, intent detection, dynamic prompting, and the global Hive Mind distillation processes.

It uses **UV** as the ultrafast Python package and project manager, and relies on **LiteLLM** to remain 100% provider-agnostic, supporting Gemini, OpenAI, and Anthropic seamlessly.

---

## 🏗 System Architecture (The Seven Horses)

The Sapti Backend operates through 7 distinct AI agents named after the Rig Vedic metaphor of the seven horses pulling the sun chariot.

| Horse | Agent | Role | Execution |
|-------|-------|------|-----------|
| 🐴 1 | **Perceiver** | Intent detection, Emotional signals, & HyDE query expansion | Sync, critical path |
| 🐴 2 | **Rememberer** | Vector retrieval (Personal + Hive Mind) via pgvector | Sync, critical path |
| 🐴 3 | **WorldBuilder** | Constructs the dynamic system prompt | Sync, critical path |
| 🐴 4 | **Generator** | Streams LLM responses to the user | Sync, critical path |
| 🐴 5 | **Chronicler** | Memory extracted & stored (Traits, Preferences, Emotions) | Async, post-response |
| 🐴 6(A) | **Identity Builder** | Forges and evolves the UserIdentity profile | Periodic/cron background |
| 🐴 6(B) | **Curator** | Distills shared wisdom into Hive Mind insights | Periodic/cron background |
| 🐴 7 | **Evolver** | Calculates & updates Sapti's psychological growth | Periodic/cron background |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.12+
- [uv](https://docs.astral.sh/uv/) (Recommended for ultra-fast dependency management)
- Supabase Project (with pgvector extension enabled)
- LLM API Key (Gemini, OpenAI, or Anthropic)

### 1. Installation

Clone the repository and install the backend dependencies using `uv`:

```bash
cd backend
uv sync
```

### 2. Environment Configuration

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Your `.env` file should look like this:

```ini
# Supabase Configuration
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"  # Required for Admin background jobs
SUPABASE_JWT_SECRET="your-jwt-secret"

# LLM Configuration
DEFAULT_LLM_PROVIDER="gemini"
DEFAULT_LLM_API_KEY="your-gemini-key"

# Embedding settings
GEMINI_EMBEDDING_API_KEY="your-gemini-key"

# Cryptography (Generate a new one via: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
ENCRYPTION_KEY="your-fernet-encryption-key"

# Settings
DEBUG=True
LOG_LEVEL=INFO

# --- CORS ---
CORS_ORIGINS=["http://localhost:3000","https://your-app.vercel.app"]
FREE_CHAT_LIMIT=50
```

### 3. Running the Server

Start the FastAPI application using UV's built-in uvicorn wrapper:

```bash
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://localhost:8000`.
You can view the interactive Swagger API documentation at: `http://localhost:8000/docs`

---

## 📁 Directory Structure

```text
backend/
├── app/
│   ├── main.py                       # FastAPI entry point, lifecycle & CORS
│   ├── agents/                       # The 7 Orchestration Agents (8 units)
│   │   ├── chronicler.py             # 🐴 5: Post-response memory extraction
│   │   ├── curator.py                # 🐴 6(B): Hive Mind distillation
│   │   ├── evolver.py                # 🐴 7: Personality growth tracking
│   │   ├── generator.py              # 🐴 4: LLM response generation
│   │   ├── graph.py                  # LangGraph workflow orchestration
│   │   ├── identity_builder.py       # 🐴 6(A): User identity profiling
│   │   ├── perceiver.py              # 🐴 1: Intent, emotion & HyDE expansion
│   │   ├── rememberer.py             # 🐴 2: Vector & relational memory retrieval
│   │   ├── state.py                  # TypedDict shared state schema
│   │   ├── world_builder.py          # 🐴 3: Dynamic prompt construction
│   │   └── __init__.py               # Agent package initialization
│   ├── api/
│   │   ├── deps.py                   # Dependency injection (Supabase, Auth)
│   │   ├── middleware/
│   │   │   ├── auth.py               # Supabase JWT token verification
│   │   │   ├── rate_limit.py         # In-memory token-bucket rate limiting
│   │   │   └── __init__.py           # Middleware package initialization
│   │   ├── routes/
│   │   │   ├── auth.py               # Auth verification & user info
│   │   │   ├── chat.py               # SSE streaming chat endpoint
│   │   │   ├── conversations.py      # Conversation CRUD & management
│   │   │   ├── evolution.py          # Public evolution statistics
│   │   │   ├── profile.py            # Profile & custom API key management
│   │   │   └── __init__.py           # Routes package initialization
│   │   └── __init__.py               # API package initialization
│   ├── config/
│   │   ├── settings.py               # Pydantic-based env configuration
│   │   ├── sapti_personality.yaml    # Core personality & evolution settings
│   │   └── __init__.py               # Config package initialization
│   ├── models/
│   │   ├── conversation.py           # Schemas for chat messages & sessions
│   │   ├── evolution.py              # Sapti's trait-based growth models
│   │   ├── memory.py                 # MemoryNode & HiveMindInsight schemas
│   │   ├── user.py                   # Profile & UserIdentity models
│   │   └── __init__.py               # Models package initialization
│   ├── services/
│   │   ├── embedding_service.py      # Gemini text-embedding generation
│   │   ├── llm_service.py            # LiteLLM provider-agnostic gateway
│   │   ├── memory_service.py         # pgvector & relational database logic
│   │   ├── supabase_client.py        # Supabase client instantiation
│   │   └── __init__.py               # Services package initialization
│   ├── utils/
│   │   ├── crypto.py                 # Fernet encryption for API keys
│   │   ├── logging.py                # Structured logging implementation
│   │   └── __init__.py               # Utils package initialization
│   └── __init__.py                   # App package initialization
├── .env.example                      # Template for environment variables
├── Dockerfile                        # Multi-stage container production config
├── pyproject.toml                    # UV project & dependency specifications
├── render.yaml                       # Render deployment configuration
├── uv.lock                           # Python dependency lock file
└── README.md                         # Backend-specific documentation
```

---

## 🔐 API Key Handling & Security

Sapti handles a hybrid API key model securely:
1. **Developer Token (Subsidized):** New users utilize the `DEFAULT_LLM_API_KEY` for a limited amount of trial chats.
2. **Bring Your Own Key (BYOK):** Once the trial is exhausted, users save their own API keys via the frontend.
3. **Encryption at Rest:** All user-supplied API keys are symmetrically encrypted using Python's `cryptography.fernet` and stored as `encrypted_api_key`. They are safely decrypted into memory strictly at runtime.

---

## 🧬 Deployment

This backend is structured to be seamlessly deployed via **Render** or **Railway**. 

1. Create a Web Service pointing to the repository.
2. Root Directory: `backend/`
3. Build Command: 
   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh && uv sync
   ```
4. Start Command: 
   ```bash
   uv run uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
5. Environment Variables: 
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_ANON_KEY`: Your Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
   - `SUPABASE_JWT_SECRET`: Your Supabase JWT secret
   - `DEFAULT_LLM_PROVIDER`: The default LLM provider (gemini, openai, anthropic)
   - `DEFAULT_LLM_API_KEY`: The default LLM API key
   - `GEMINI_EMBEDDING_API_KEY`: The default Gemini embedding API key
   - `ENCRYPTION_KEY`: The encryption key for user API keys
   <!-- - `DEBUG`: Enable debug mode (True/False) -->
   <!-- - `LOG_LEVEL`: The log level (INFO, DEBUG, ERROR, etc.) -->
   - `CORS_ORIGINS`: The CORS origins
   - `FREE_CHAT_LIMIT`: The free chat limit
   