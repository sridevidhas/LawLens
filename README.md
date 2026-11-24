# LawLens — RAG-Based Legal Chatbot

A fresh full-stack starter project for grounded legal-document Q&A. Backend: Django REST Framework + SQLite + JWT. Frontend: React + Vite. Retrieval: PDF extraction, overlapping chunks, Sentence Transformers MiniLM embeddings, ChromaDB semantic retrieval, cross-encoder reranking, and heuristic exact IPC-section lookup.

> **Important:** This is an educational software project, not legal advice. No legal PDFs are bundled. Answers can only be grounded in documents you ingest; verify law and citations with authoritative current sources. IPC references are included as a convenience and may not reflect applicable current law in every context.

## Requirements
- Python 3.11+ recommended
- Node.js 18+
- OpenAI API key for generated answers (or adapt `backend/lawchat/rag/pipeline.py` to another LLM)

## Backend setup (PowerShell)
```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```
Edit `.env` and set `OPENAI_API_KEY`. Backend runs at `http://127.0.0.1:8000`.

## Add legal PDFs
Put law PDFs you are permitted to use in `backend/legal_docs/`, then run:
```powershell
python manage.py ingest_legal_pdfs
```
The command extracts text, chunks it with overlap, embeds it with MiniLM and stores it in the local Chroma database at `backend/chroma_db/`. Re-run after adding documents. Scanned/image-only PDFs need OCR before ingestion.

## Frontend setup
In a second terminal:
```powershell
cd frontend
npm install
npm run dev
```
Open the local URL printed by Vite. The frontend expects the API at `http://127.0.0.1:8000/api`. Set `VITE_API_URL` if needed.

## Main API routes
- `GET /api/health/` — health check
- `POST /api/auth/register/` — `{ "username": "...", "password": "..." }`
- `POST /api/auth/token/` — obtain JWT access/refresh tokens
- `POST /api/auth/token/refresh/` — refresh access token
- `GET, POST /api/conversations/` — list/create current user's conversations
- `GET, POST /api/conversations/<id>/messages/` — history/send a message
- `POST /api/chat/` — `{ "message": "...", "conversation_id": 1 }` (conversation ID optional)

Send `Authorization: Bearer <access-token>` for protected endpoints. Conversation history is stored per user in SQLite. The retrieval pipeline attempts contextual follow-up resolution using recent conversation turns, and returns source metadata and excerpts with answers.

## Tests
```powershell
python manage.py test
```
Tests cover basic API health and authenticated conversation access. Model download / LLM calls are not required for these tests.

## Project structure
```text
backend/  Django API, SQLite models, RAG pipeline and ingestion command
frontend/ React chat UI with authentication, history and source cards
```
