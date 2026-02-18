# GitHub Releases Setup

This document explains the release infrastructure and how GitHub automatically generates release notes from the CHANGELOG.

## How It Works

1. **You tag a commit**: `git tag -a v0.2.0 -m "Description"`
2. **GitHub Actions runs**: `.github/workflows/release.yml` triggers on new tags
3. **CHANGELOG is parsed**: Action extracts the matching `[VERSION]` section
4. **Release is created**: GitHub Release page is populated with release notes

## Live Releases

Both releases are now live on GitHub:

- **[v0.1.0](https://github.com/technicolor-ux/openclaw-chat/releases/tag/v0.1.0)** — Initial Release
  - Full-featured desktop chat client
  - Projects, threads, brain dumps, SSH support
  - Auto-generated from `CHANGELOG.md`

- **[v0.2.0](https://github.com/technicolor-ux/openclaw-chat/releases/tag/v0.2.0)** — Auto-Naming Threads
  - Instant thread creation (no modal)
  - AI-generated titles from first message
  - Nightly refresh loop
  - Auto-generated from `CHANGELOG.md`

## Adding a New Release

### 1. Write the CHANGELOG Entry

Add a new section to `CHANGELOG.md`:

```markdown
## [0.3.0] - 2026-03-XX

### Release: Feature Name

**Problem Statement**
...

**Proposed Solution**
...

**Claude Code Plan**
...

**Implementation Details**
...

**Key Files Modified**
...

**User-Facing Changes**
- ✅ Feature 1
- ✅ Feature 2

**Testing Checklist**
- [x] Test 1
- [x] Test 2
```

### 2. Commit Your Changes

```bash
git add .
git commit -m "Implement Feature Name"
```

### 3. Create and Push Tag

```bash
git tag -a v0.3.0 -m "Feature Name: Short description"
git push origin main --tags
```

### 4. GitHub Actions Auto-Generates Release

The workflow automatically:
- Detects the new tag
- Extracts the corresponding section from CHANGELOG.md
- Creates a GitHub Release with that text as the release notes
- Makes it visible on the Releases page

## Workflow Configuration

The GitHub Actions workflow is in `.github/workflows/release.yml`:

```yaml
on:
  push:
    tags:
      - 'v*'
```

Triggers on any tag matching the pattern `v*` (e.g., v0.1.0, v1.2.3).

```yaml
- name: Extract release notes
  id: extract_notes
  run: |
    VERSION=${GITHUB_REF#refs/tags/}
    # Extracts [VERSION] section from CHANGELOG.md
    NOTES=$(awk "/## \[${VERSION#v}\]/,/^## \[/{...}" CHANGELOG.md)
```

Uses `awk` to extract the relevant section from CHANGELOG.md.

## CHANGELOG.md Format Requirements

For the workflow to find your release notes, format must be exact:

```markdown
## [VERSION] - DATE

### Release: Title

(Content here)

## [NEXT_VERSION] - DATE
```

The workflow looks for `## [X.Y.Z]` and extracts until the next `## [` line.

## Release History

All past releases are available on the [Releases page](https://github.com/technicolor-ux/openclaw-chat/releases):

- Each has full case study documentation
- Screenshots can be added to the release
- Users can download binaries from future releases

## Case Study Format

Each release tells a complete story:

| Section | Purpose |
|---------|---------|
| **Problem Statement** | Real user pain point |
| **Proposed Solution** | High-level approach |
| **Claude Code Plan** | Architecture and components |
| **Implementation Details** | Technical execution |
| **Key Files Modified** | What changed |
| **User-Facing Changes** | What users see |
| **Testing Checklist** | Verification |

This format makes each release suitable for:
- Blog posts and technical articles
- Interview discussions
- Portfolio case studies
- Technical documentation

## Tips

### Including Screenshots

After running the feature, capture screenshots:

```bash
./scripts/capture-release-screenshots.sh "0.2.0" "Feature Name"
```

Add to CHANGELOG before that version:

```markdown
**Before:**
![Before](docs/releases/0.2.0/before.png)

**After:**
![After](docs/releases/0.2.0/after.png)
```

### Release Notes for Different Audiences

The same release entry works for:

- **Developers**: Read Implementation Details
- **Users**: Read User-Facing Changes
- **Interviewers**: Read Problem/Solution narrative
- **Portfolio**: Entire release as case study

### Version Numbering

Follow semantic versioning:

- `0.1.0` — Initial release
- `0.2.0` — New feature (minor version bump)
- `0.2.1` — Bug fix (patch version bump)
- `1.0.0` — Major milestone (major version bump)

## Troubleshooting

### Release workflow didn't run

Check:
1. Tag matches `v*` pattern (e.g., `v0.2.0`, not `0.2.0`)
2. Tag was pushed: `git push origin --tags`
3. `.github/workflows/release.yml` exists and is committed

### Release notes are incomplete

Check:
1. CHANGELOG.md has correct format: `## [X.Y.Z]`
2. Version in tag matches CHANGELOG: `v0.2.0` matches `## [0.2.0]`
3. Section ends at next `## [` line

### Want to re-generate a release

Delete and recreate the tag locally, then force-push:

```bash
git tag -d v0.2.0
git tag -a v0.2.0 -m "Updated description"
git push origin v0.2.0 --force
```

---

For more information, see:
- [CHANGELOG.md](CHANGELOG.md) — Full release history
- [docs/RELEASES.md](docs/RELEASES.md) — Release process guide
- [RELEASE_NOTES_TEMPLATE.md](RELEASE_NOTES_TEMPLATE.md) — Template for new releases
