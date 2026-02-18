# Release Notes Template

Use this template when adding new releases to CHANGELOG.md. Copy the structure and fill in each section with clear, narrative prose.

---

## [VERSION] - DATE

### Release: Feature Name

**Problem Statement**

Write 2-3 sentences describing the real user pain point or limitation that existed before. Focus on the friction or gap, not the solution.

Example: "Users had to stop their workflow to manually configure settings. This context-switching reduced productivity and made the feature feel tedious to use."

**Proposed Solution**

Describe the high-level approach to solving the problem. Keep it user-focused; avoid technical jargon.

Example: "Auto-detect the settings from the user's environment, and provide a one-click setup button that configures everything without leaving the current view."

**Claude Code Plan**

Outline the key architectural decisions and steps that were taken:

1. **Component 1** — What it does, why it's needed
2. **Component 2** — How it integrates with Component 1
3. **Integration Layer** — How frontend and backend communicate

Be specific about file locations and module responsibilities.

**Implementation Details**

- **Backend**: What services/modules were added or modified, key functions/endpoints
- **Frontend**: UI components, state management, event listeners
- **Performance**: Any optimizations, background processes, or timing considerations

Keep this section technical but readable — it's for developers following along with the code.

**Key Files Modified**

List all files with brief descriptions:
- `src/feature.ts` — Core logic
- `src/ui/FeatureButton.tsx` — User interface
- etc.

**User-Facing Changes**

Use ✅ checkmarks for visible improvements:
- ✅ New button in toolbar
- ✅ Settings auto-populate
- ✅ Faster load time

**Testing Checklist**

Document what was tested:
- [x] Feature works on first launch
- [x] Feature persists across restarts
- [x] Error handling is graceful
- [x] No performance regression

---

## Visual Documentation

Include before/after screenshots for user-facing features:

**Before:**
![Before](docs/releases/VERSION/before.png)

**After:**
![After](docs/releases/VERSION/after.png)

To capture screenshots:
```bash
./scripts/capture-release-screenshots.sh "VERSION" "Feature Name"
```

---

## How to Use This in Case Studies

Each release should tell a complete story:
1. **The Problem** — Real user friction
2. **The Solution** — Clear approach
3. **The Plan** — How Claude Code structured the work
4. **The Result** — Working feature with evidence (screenshots, code)

This creates a portfolio of technical decision-making and execution that demonstrates:
- Problem analysis and decomposition
- Architectural thinking
- Full-stack implementation
- User-focused design
