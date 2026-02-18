# OpenClaw Chat

A modern desktop application for managing OpenClaw AI agent conversations, with persistent organization, proactive follow-ups, and SSH remote support.

**Current Version**: 0.2.0 | **Status**: Active Development

## Features

### 🎯 Core Chat Management
- **Persistent Threads** — Create and organize conversations into projects
- **Session Sync** — Automatic synchronization with OpenClaw JSONL session files
- **Rich Message Display** — Markdown rendering, syntax highlighting, code block support
- **Real-Time Updates** — File-based polling detects new messages instantly

### 🧠 Brain Dump System
- **Quick Capture** — Jot down ideas without interrupting current work
- **Proactive Follow-Up** — Mark items for scheduled background processing
- **Automatic Response** — Background job generates initial thoughts on captured ideas
- **Project Association** — Organize brain dumps by project

### 🤖 Multi-Agent & Remote Support
- **Multiple Agents** — Manage conversations across different OpenClaw agents
- **SSH Sessions** — Run OpenClaw on remote machines with key-based auth
- **Fallback Handling** — Gracefully falls back to local mode on connection failure

### 🎨 User Experience
- **Resizable Layout** — Adjust sidebar width for custom workspace
- **Theme Switching** — Light, dark, or automatic theme detection
- **Auto-Naming** — Thread titles auto-generate from conversation content
- **Nightly Refresh** — Background job keeps thread names current as conversations evolve

## Quick Start

### Prerequisites
- macOS (or Linux with minor modifications)
- Rust + Cargo
- Node.js + npm
- OpenClaw installed (`brew install openclaw` or from GitHub)

### Development

```bash
# Clone and install
git clone https://github.com/technicolor-ux/openclaw-chat.git
cd openclaw-chat
npm install

# Start development server
npm run tauri dev

# Build for production
npm run tauri build
```

The app creates/uses:
- **Database**: `~/.openclaw/chat/openclaw-chat.db`
- **Sessions**: `~/.openclaw/agents/{agentId}/sessions/{sessionId}.jsonl`

## Architecture

### Backend (Rust + Tauri)
- **`db.rs`** — SQLite schema and CRUD operations for projects/threads/brain dumps
- **`openclaw.rs`** — CLI integration and JSONL session file parsing
- **`lib.rs`** — Tauri command handlers, app setup, and event emission
- **`watcher.rs`** — Async file polling for detecting new messages
- **`proactive.rs`** — Background job for scheduled brain dump follow-ups and nightly title refresh
- **`ssh.rs`** — SSH session management for remote execution

### Frontend (React + TypeScript)
- **`App.tsx`** — Main layout, theme management, modal orchestration
- **`Sidebar.tsx`** — Project/thread navigation with hierarchical organization
- **`ChatView.tsx`** — Message display with markdown and syntax highlighting
- **`InputBar.tsx`** — Message input with formatting support
- **`BrainDump.tsx`** — Collapsible panel for notes and proactive items
- **`useProjects.ts`** — React hook managing global project/thread state
- **`tauri.ts`** — Command and event bindings to Rust backend

### Database Schema
```
projects (id, name, description, color, agent_id, created_at, updated_at)
threads (id, project_id, name, session_id, agent_id, created_at, updated_at, last_message_at, title_updated_at)
brain_dumps (id, content, project_id, status, proactive, created_at, updated_at, followed_up_at)
```

## Case Study: Auto-Naming Threads (v0.2.0)

This release demonstrates a complete feature implementation cycle:

**Problem**: Users had to name threads before chatting, creating friction.

**Solution**: Create threads instantly, auto-generate titles from first message, refresh titles nightly.

**Implementation**:
- Backend: Title generation via OpenClaw, nightly refresh loop
- Frontend: Remove modal, listen for rename events
- Database: Added `title_updated_at` for tracking freshness

**Result**: Frictionless thread creation with intelligent, evolving titles.

See `CHANGELOG.md` for full documentation of all releases and features.

## Release Notes & Documentation

- **[CHANGELOG.md](CHANGELOG.md)** — Detailed release notes with problem statements, solutions, and implementation details
- **[docs/RELEASES.md](docs/RELEASES.md)** — Process guide for creating releases and case studies
- **[RELEASE_NOTES_TEMPLATE.md](RELEASE_NOTES_TEMPLATE.md)** — Template for documenting new features

## Project Organization

```
openclaw-chat/
├── src/                          # React frontend
│   ├── components/               # UI components
│   ├── hooks/                    # React hooks (useProjects, useTheme)
│   ├── lib/                      # Utilities (tauri bindings)
│   └── App.tsx                   # Main layout
├── src-tauri/                    # Rust backend
│   └── src/
│       ├── lib.rs               # Tauri command handlers
│       ├── db.rs                # SQLite operations
│       ├── openclaw.rs          # OpenClaw integration
│       ├── watcher.rs           # Message polling
│       ├── proactive.rs         # Background jobs
│       └── ssh.rs               # Remote execution
├── .github/workflows/            # GitHub Actions
│   └── release.yml              # Auto-generate releases
├── docs/                         # Documentation
│   └── RELEASES.md              # Release process guide
└── CHANGELOG.md                  # Complete change history
```

## Development Workflow

### Adding a Feature
1. Plan the feature (problem/solution/approach)
2. Implement backend (Rust) and database changes
3. Implement frontend (React) changes
4. Add to `CHANGELOG.md` with full documentation
5. Test across platforms
6. Commit and tag: `git tag -a vX.Y.Z -m "Description"`
7. GitHub Actions auto-generates the release

### Running Tests
```bash
# Frontend type checking
npm run build

# Backend compilation check
cd src-tauri && cargo check
```

## Technical Highlights

### Patterns Demonstrated
- **Event-Driven Architecture** — Rust backend emits events, React frontend listens
- **Local-First Data Model** — SQLite persistence with remote sync
- **Non-Blocking Operations** — Background tasks for long-running work
- **Resilient Fallbacks** — SSH failure gracefully falls back to local mode
- **Efficient Polling** — File-based change detection with debounce

### Performance
- Message load: <500ms (SQLite query)
- OpenClaw response: ~1-2s (model dependent)
- UI rendering: 60fps
- Background polling: <1% CPU per session

## Future Roadmap

- [ ] Multi-agent UI selector
- [ ] Full-text search across messages
- [ ] Message editing and deletion
- [ ] Configurable proactive schedules
- [ ] Export conversations (PDF, Markdown)
- [ ] Streaming message display
- [ ] Custom theme editor
- [ ] Analytics dashboard

## Contributing

This project is actively developed. See `CHANGELOG.md` for architectural decisions and patterns.

## License

MIT

## Author

Built with Claude Code + Tauri v2.

For case studies, interviews, and technical discussions, see the detailed release notes in `CHANGELOG.md` — each release is documented as a complete problem-solution narrative with implementation details.

---

**Last Updated**: 2026-02-18 | **Current Version**: 0.2.0
