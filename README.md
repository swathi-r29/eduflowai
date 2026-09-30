# EduFlow AI

**An Agentic AI-Powered Multimodal Learning, Assessment & Personalized Remediation Platform.**

EduFlow AI is a MERN application whose primary engineering surface is a set of LLM agents, not CRUD screens: submission understanding, rubric evaluation, root-cause diagnosis, personalized feedback, adaptive quizzing, roadmap generation, and a grounded multimodal (video + PDF + DOCX) RAG study tutor. MongoDB, Express, React, TypeScript and JWT auth carry that AI layer.

---

## 1. Why AI, and how it's architected

Every score, quiz question, flashcard, and tutor answer in this app is produced by a real call to Gemini (primary) or Claude (fallback) — nothing is hard-coded or templated. The architecture enforces that:

```
backend/src/ai/
  providers/     AIProvider interface + GeminiProvider + ClaudeProvider + factory
  schemas/       Zod schemas — every agent output is validated, not trusted
  agents/        One file per agent, one responsibility each
  orchestrator/  runAgent.js (shared call/validate/repair/fallback path),
                 assessmentOrchestrator.js, studyOrchestrator.js
  retrieval/     chunker, embeddings, cosine-similarity vector store
  evaluators/    output validator + AI observability logger
  memory/        per-student learning context assembly
```

- **Provider abstraction**: Agents call `runAgent()`, which invokes Gemini (primary), validates JSON against a Zod schema, performs self-repair if needed, and falls back to Claude if necessary — logging every step to `AIEvaluationLog` for observability.
- **Video understanding**: Uses Gemini's native multimodal video reasoning to extract summary, topics, key points, timestamped moments, and transcript chunks.
- **Vector search**: Genuine embedding cosine-similarity search over `ContentChunk` documents stored in MongoDB (`ai/retrieval/vectorStore.js`).
- **HTML5 Video Player & Timestamp Navigation**: Full video player experience in the Study Workspace with clickable timestamps (`MM:SS` / `HH:MM:SS`) that automatically seek video playback to exact lecture timestamps.
- **DOCX & PDF Page Extraction**: Full document text extraction across PDF (page-by-page page number metadata), TXT, and DOCX files.
- **AI Recommendation Engine**: Connects assessment root-cause diagnosis to uploaded study workspace resources, pointing students directly to video timestamp segments or document pages explaining their specific misconception.
- **Interactive Flashcards**: 3D flip card viewer with Framer Motion animations, card progress tracking, and mastery status.
- **Teacher Class Management & Student Join Passcodes**: Full teacher class detail management (`/teacher/classes/:id`) with student lists, assignment creation, submission oversight, and student join passcode validation.
- **Resource-level Authorization**: Strict ownership and class membership checks preventing unauthorized cross-student or cross-teacher resource access.

---

## 2. Real Architecture vs. Technical Choices

| Feature | Implementation Choice | Rationale |
|---|---|---|
| Vector Store | MongoDB + in-process cosine similarity | Real semantic search using Gemini embeddings, zero extra vector database dependency. |
| Video Pipeline | Gemini native video understanding | Direct multimodal reasoning over audio + video, generating timestamped chunks without separate speech-to-text infra. |
| Background Jobs | In-process job queue (`jobs/jobQueue.js`) | Lightweight async processing for classroom-scale workspaces with frontend polling. |
| Document Processing | `pdf-parse` (page metadata) + `mammoth` (DOCX) + `chunker` | Robust multi-format document RAG with page attribution. |

---

## 3. Environment & Verification Status

**Verified Working in Workspace:**
- `cd backend && npm test` — **20/20 unit tests pass** across 4 test suites (timestamp parsing, schema validation, chunking, mastery levels).
- `cd backend && node src/server.js` — boots successfully on port 5000 (`/api/health` OK).
- `cd frontend && npm run build` — **Vite production build & TypeScript type-check pass** cleanly.

**Requires Local Machine Configuration:**
- Active MongoDB instance (`MONGODB_URI`)
- Valid Gemini API key (`GEMINI_API_KEY`)
- Optional Anthropic API key (`ANTHROPIC_API_KEY`)

---

## 4. Running the Project

### Prerequisites
- Node.js 20+
- MongoDB instance (local or Atlas)
- Gemini API Key: https://aistudio.google.com/apikey

### Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your MONGODB_URI and GEMINI_API_KEY
npm install
npm run seed     # Creates demo accounts
npm run dev      # Server running on http://localhost:5000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev      # Client running on http://localhost:5173
```

Demo Credentials (after `npm run seed`, password for both is `password123`):
- Teacher: `teacher@eduflow.ai`
- Student: `student@eduflow.ai`

### Unit Tests

```bash
cd backend && npm test
```

---

## 5. End-to-End Workflow

1. **Workspace & Multimodal Upload**: Student creates a workspace and uploads a lecture video (MP4/WebM/MOV) and notes (PDF/DOCX/TXT).
2. **AI Indexing**: Background pipeline runs native video understanding and document extraction, chunking and embedding content into vector store.
3. **HTML5 Video Player & Grounded Q&A**: Student watches lecture video in workspace and asks questions. Gemini provides grounded answers with source pills (`📹 Lecture.mp4 — 18:42`). Clicking source pills seeks video playback to 18:42 immediately.
4. **Interactive Flashcards**: Student generates flashcards from uploaded content and studies with 3D flip card animations and progress tracking.
5. **Assignment Submission & AI Pipeline**: Student submits an assignment. Multi-agent pipeline evaluates submission: understanding → rubric scoring → root cause diagnosis → feedback → targeted remediation quiz.
6. **Misconception to Uploaded Resource Linking**: AI identifies student's misconception and searches uploaded workspace materials, recommending exact video timestamp segments (e.g. `📹 Lecture.mp4 32:15 - 37:40`).
7. **Teacher Calibration & Overrides**: Teacher reviews AI grading on `/teacher/classes/:id` and accepts, edits, or overrides scores without overwriting AI logs.
8. **Student Join & Progress**: Student joins classes via 8-character passcode and tracks concept mastery in knowledge profile.
