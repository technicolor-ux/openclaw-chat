# Release Documentation

This directory contains release notes, screenshots, and case study materials for openclaw-chat.

## How to Create a Release

### 1. Implement the Feature

Develop and test your feature on a branch.

### 2. Document in CHANGELOG.md

Add a new section to `CHANGELOG.md` following the template format:

```markdown
## [VERSION] - DATE

### Release: Feature Name

**Problem Statement**
(2-3 sentences about the user pain point)

**Proposed Solution**
(High-level approach, user-focused)

**Claude Code Plan**
(Architectural decisions and key components)

**Implementation Details**
(Technical specifics for developers)

**Key Files Modified**
(List of changed files)

**User-Facing Changes**
(✅ checkmarks for visible improvements)

**Testing Checklist**
([x] tested items)
```

### 3. Capture Screenshots (for UI changes)

```bash
./scripts/capture-release-screenshots.sh "0.2.0" "Feature Name"
```

This creates `docs/releases/0.2.0/before.png` and `docs/releases/0.2.0/after.png`.

Add to CHANGELOG.md:

```markdown
**Before:**
![Before](docs/releases/0.2.0/before.png)

**After:**
![After](docs/releases/0.2.0/after.png)
```

### 4. Commit and Tag

```bash
git add .
git commit -m "Implement feature name"
git tag -a vVERSION -m "Feature Name: Short description"
git push origin main --tags
```

### 5. GitHub Action Releases

When you push a tag, GitHub Actions automatically:
- Reads the corresponding section from CHANGELOG.md
- Creates a GitHub Release with full release notes
- Makes the release publicly available

## Release Notes Structure

Each release tells a complete story suitable for case studies:

1. **Problem** — Real user friction or limitation
2. **Solution** — Proposed approach to solving it
3. **Plan** — How Claude Code structured the work
4. **Implementation** — Technical details for developers
5. **Evidence** — Screenshots, testing results
6. **Impact** — User-facing improvements

This format demonstrates:
- Problem analysis and decomposition
- Architectural decision-making
- Full-stack implementation skills
- User research and design thinking

## Case Study Usage

Each release can be expanded into a case study:

- **Blog Post**: Expand the problem/solution sections with user interviews, metrics, or context
- **Portfolio**: Link to the GitHub release as proof of shipped work
- **Interview Material**: Explain the problem statement and solution approach
- **Technical Reference**: Point to code examples and architectural decisions

## Examples

See `CHANGELOG.md` for released versions and `RELEASE_NOTES_TEMPLATE.md` for the structure template.
