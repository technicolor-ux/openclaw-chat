# Changelog

All notable changes to openclaw-chat are documented here. Each release includes the problem statement, proposed solution, implementation plan, and key changes.

---

## [0.2.0] - 2026-02-18

### Release: Auto-Naming Threads

**Problem Statement**

Users had to pause and name each new thread before starting a conversation. This created friction — they already knew what they wanted to ask, but were forced to think of a descriptive title first. The naming modal interrupted the natural flow of opening a thread and starting to chat.

**Proposed Solution**

Eliminate the naming modal entirely. When users click "+", a thread is created instantly with a placeholder name ("New thread"), and they can immediately start typing. After the first message is sent and the assistant responds, the thread title automatically generates from the user's opening message using Claude's summarization. Additionally, a nightly job refreshes stale thread titles based on the full conversation, keeping older threads accurately labeled as conversations evolve.

**Claude Code Plan**

The implementation required changes across the database schema, backend services, and frontend UI:

1. **DB Schema** — Add `title_updated_at` timestamp to track when titles were last generated, enabling the refresh job to identify stale threads
2. **Auto-Title on First Message** — After the assistant responds to the first message, call OpenClaw with a prompt to summarize the user's message into 3-6 words; update the thread name and emit a `thread:renamed` event
3. **Nightly Title Refresh Loop** — New background service that runs at 11:55 PM daily, finding threads where the conversation has evolved since the last title was generated, and refreshing their titles based on recent message context
4. **Frontend Event Listener** — React hook listens for `thread:renamed` events and updates thread names in the sidebar and header in real time
5. **Remove Modal** — Delete `NewThreadModal` component; make the "+" button directly invoke `addThread("New thread")` and open the chat view immediately

**Implementation Details**

- **Backend**: Added `generate_title()` and `generate_title_from_messages()` to `openclaw.rs`; extended `db.rs` with `rename_thread()`, `get_threads_needing_title_refresh()`; modified `cmd_send_message` to detect "New thread" names and trigger auto-titling; spawned `run_title_refresh_loop()` in app setup
- **Frontend**: Removed modal state and rendering; updated `useProjects` to listen for `thread:renamed` events; added `onThreadRenamed()` event listener in `App.tsx` to sync sidebar and active thread names
- **Timing**: Auto-title runs in background after assistant response completes (non-blocking); nightly refresh is off-peak (11:55 PM) to avoid user-facing latency

**Key Files Modified**
- `src-tauri/src/db.rs` — Schema migration, new queries
- `src-tauri/src/openclaw.rs` — Title generation functions
- `src-tauri/src/lib.rs` — Auto-title logic, `cmd_rename_thread` command
- `src-tauri/src/proactive.rs` — Nightly refresh loop
- `src/App.tsx` — Removed modal, updated event listeners
- `src/hooks/useProjects.ts` — Thread rename event listener
- `src/lib/tauri.ts` — New Tauri commands and events

**User-Facing Changes**
- ✅ Click "+" → thread appears instantly, ready to chat (no modal)
- ✅ Send first message → title auto-generates after response
- ✅ Title persists across app restarts (stored in SQLite)
- ✅ Nightly refresh keeps old threads titled accurately as conversations grow
- ✅ Smooth sidebar updates via real-time events

**Testing Checklist**
- [x] Create thread via "+" — opens immediately with "New thread" name
- [x] Send message → title updates in sidebar after assistant response
- [x] Restart app — titles persist from database
- [x] Multiple threads with different conversations — each gets unique title
- [x] Nightly job behavior (tested with time-adjustment) — refreshes stale threads correctly

---

## [0.1.0] - 2026-02-15

### Initial Release

First stable release of openclaw-chat: Tauri v2 desktop app with persistent thread management, SQLite backend, and OpenClaw integration.

**Features**
- Create and organize threads in projects
- Persistent session storage via JSONL files
- Brain dump system for capture and proactive follow-ups
- SSH remote session support
- Theme switching (light/dark/auto)
- Real-time message streaming
