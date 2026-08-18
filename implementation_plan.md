# Implementation Plan - AI Study Tracker

The **AI Study Tracker** is a full-stack web application designed to help users convert LLM-generated study roadmaps (or custom documents) into structured, interactive study workspaces. Users can upload/paste roadmaps, let the system extract and parse the hierarchy into Goals, Modules, Topics, and Subtopics, review/edit the structure before creation, and then track their learning journey through dedicated topic pages with rich notes, resource attachments, subtopic checklists, study timers, and progress analytics.

---

## User Review Required

> [!IMPORTANT]
> - **Backend Framework**: Python Django 5.x + Django REST Framework (DRF) with Django SimpleJWT authentication.
> - **Database**: SQLite for local development (zero configuration), fully compatible with PostgreSQL.
> - **Frontend Framework**: React 18 with TypeScript, Vite, Tailwind CSS, Lucide Icons, and React Router v6.
> - **AI Integration**: Plug-and-play `AIService` supporting Gemini / OpenAI APIs with a built-in robust Rule-based Heuristic Parser fallback so the app works out-of-the-box even without an API key!
> - **File Parsing**: Support for `.txt`, `.md`, `.pdf` (`pypdf`), and `.docx` (`python-docx`).

---

## Open Questions

> [!NOTE]
> 1. Would you like to configure a specific AI provider API key (e.g. Gemini or OpenAI) during setup, or rely on the built-in smart heuristic parser by default with an optional API key setting in the app UI?
> 2. For rich text editing in notes, is a Markdown editor with live preview or a WYSIWYG editor preferred? (We plan to provide a full-featured markdown/rich-text editor with code block support).

---

## Proposed Changes

### Project Layout

```
studytracker/
├── venv/                       # Pre-configured Python virtual environment
├── backend/                    # Django REST Framework backend
│   ├── manage.py
│   ├── studytracker/           # Settings, URLs, WSGI
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── api_router.py
│   ├── apps/
│   │   ├── authentication/     # User login, registration, profile APIs
│   │   ├── study/              # Goals, Modules, Topics, Subtopics, Notes, Resources, StudySessions
│   │   └── ai_roadmap/         # File extractors (.txt, .md, .pdf, .docx), AI Service abstraction & parser
│   └── requirements.txt
└── frontend/                   # React + TypeScript + Vite + Tailwind CSS app
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    └── src/
        ├── api/                # Axios API handlers
        ├── context/            # AuthContext, GoalContext
        ├── components/         # Navbar, Sidebar, ProgressBars, RichTextEditor, Timer, Modals
        ├── pages/              # Login, Register, Dashboard, ImportRoadmap, ReviewRoadmap, RoadmapView, TopicView
        └── types/              # Full TypeScript definitions
```

---

### Component Breakdown

#### [NEW] Backend Infrastructure (`backend/`)
- `requirements.txt`: `django`, `djangorestframework`, `djangorestframework-simplejwt`, `django-cors-headers`, `pypdf`, `python-docx`, `google-genai` / `openai`, `pillow`.
- `apps/authentication/`: Custom User serializer, Register, Login (JWT token pair), Profile APIs.
- `apps/study/`:
  - `models.py`: `StudyGoal`, `Module`, `Topic`, `Subtopic`, `Note`, `Resource`, `StudySession`, `RoadmapImport`.
  - `serializers.py`: Deeply nested & flat serializers with calculated completion metrics.
  - `views.py`: Full CRUD endpoints with user-level data isolation enforcement (`queryset.filter(user=request.user)`).
- `apps/ai_roadmap/`:
  - `extractors.py`: Text extraction for `.txt`, `.md`, `.pdf` (`pypdf`), and `.docx` (`docx`).
  - `services.py`: `AIService` interface with LLM JSON mode support and smart regex/markdown tree parser fallback.

#### [NEW] Frontend Infrastructure (`frontend/`)
- `vite.config.ts`, `tailwind.config.js`: Modern layout with glassmorphism touches, clean typography, vibrant progress indicators.
- `src/types/index.ts`: Strongly typed models matching DRF API schemas.
- `src/api/client.ts`: Axios instance with JWT auto-refresh and auth header injection.
- `src/pages/`:
  - **Login / Register**: Clean authentication forms.
  - **Dashboard**: Study goals overview cards, total progress percentages, active topics, recent activity.
  - **Import Roadmap**: Option A (Paste plain text/markdown) & Option B (Upload `.txt`, `.md`, `.pdf`, `.docx`) with parsing status.
  - **Review Roadmap**: Editable tree view to rename, add, delete, or reorder modules, topics, and subtopics before final creation.
  - **Roadmap View**: Interactive hierarchical roadmap page with module expand/collapse and topic status indicators.
  - **Topic Workspace**: Dedicated topic study page:
    - Status toggle (`NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`)
    - Interactive Subtopics checklist (autocalculates topic progress)
    - Personal Rich-text/Markdown notes editor with autosave
    - Learning Resources manager (Links, YouTube embeds, Images, Documents)
    - Live Study Session timer (Start, Pause, Stop, Log manually) with accumulated study time
  - **Search**: Global search across modules, topics, subtopics, notes, and resources.

---

## Stages & Step-by-Step Implementation

1. **Stage 1: Backend Setup & Authentication**
   - Initialize Django project inside `backend/` using `venv`.
   - Configure DRF, CORS, SQLite, and SimpleJWT auth.
   - Implement `User` registration, token obtain/refresh endpoints.

2. **Stage 2: Core Data Models & REST APIs**
   - Implement models for `StudyGoal`, `Module`, `Topic`, `Subtopic`, `Note`, `Resource`, `StudySession`, and `RoadmapImport`.
   - Add database indexes and calculated properties (e.g. topic/module/goal progress metrics).
   - Write viewsets and permissions ensuring user data isolation.

3. **Stage 3: Text Extraction & AI Roadmap Parser**
   - Create document extractors for TXT, MD, PDF, and DOCX files.
   - Implement `AIService` abstraction with structured JSON output parser and heuristic fallback parser.
   - Add `/api/roadmaps/import/` and `/api/roadmaps/analyze/` endpoints.

4. **Stage 4: Frontend Base Setup & Auth UI**
   - Initialize React Vite TypeScript app with Tailwind CSS.
   - Setup Router, Axios client, and `AuthContext`.
   - Build Login and Registration pages.

5. **Stage 5: Dashboard & Import/Review Flow**
   - Build Dashboard page displaying user goals, overall progress, and quick continue buttons.
   - Build Import Roadmap page with text paste & file drag-and-drop upload.
   - Build Review & Edit Roadmap screen with interactive tree controls.

6. **Stage 6: Interactive Roadmap & Topic Study Workspace**
   - Build interactive tree view for Roadmap page.
   - Build Topic page with status manager, subtopic checklist, rich note editor, resource attachments, and live study timer.

7. **Stage 7: Verification & Testing**
   - Run backend unit tests for models, serializers, and permission isolation.
   - Verify document text extraction and AI parsing accuracy.
   - Test full user journey: Register -> Import Roadmap -> Review & Edit -> Study Topic -> Take Notes -> Track Timer -> Mark Complete -> Verify Analytics.

---

## Verification Plan

### Automated Tests
- Django Backend Tests:
  ```bash
  .\venv\Scripts\python.exe backend/manage.py test apps.authentication apps.study apps.ai_roadmap
  ```

### Manual Verification
- Test user registration and login flow.
- Test roadmap paste import with sample markdown/plain text.
- Test roadmap file upload for `.txt`, `.md`, `.pdf`, and `.docx`.
- Verify tree structure review editor (add, delete, rename, reorder).
- Open dedicated topic page, check subtopic checklist calculation.
- Test notes editing, resource link/attachment additions.
- Test live study timer start/pause/stop and manual duration entry.
- Confirm dashboard progress bar updates dynamically.
