use std::path::{Path, PathBuf};

#[derive(Debug, Clone)]
pub struct ObsidianProject {
    pub name: String,
    pub description: Option<String>,
    pub color: String,
    pub obsidian_source: String, // relative path for dedup
}

/// Scan the Obsidian vault's active projects directory.
pub fn parse_vault(active_path: &Path) -> Vec<ObsidianProject> {
    let mut projects = Vec::new();

    // Business/ → green
    let business = active_path.join("Business");
    if business.is_dir() {
        scan_dir(&business, "Business", "#059669", &mut projects);
    }

    // Work/ → blue
    let work = active_path.join("Work");
    if work.is_dir() {
        scan_dir(&work, "Work", "#2563eb", &mut projects);
    }

    // Top-level .md files (Personal) → purple
    if let Ok(entries) = std::fs::read_dir(active_path) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() && path.extension().map(|e| e == "md").unwrap_or(false) {
                let fname = path.file_name().unwrap_or_default().to_string_lossy();
                if fname == "README.md" || fname == "Projects.md" {
                    continue;
                }
                let rel = path
                    .strip_prefix(active_path)
                    .unwrap_or(&path)
                    .to_string_lossy()
                    .to_string();
                if let Some(p) = parse_file(&path, "#7c3aed", &rel) {
                    projects.push(p);
                }
            }
        }
    }

    projects
}

fn scan_dir(dir: &Path, _category: &str, color: &str, out: &mut Vec<ObsidianProject>) {
    let Ok(entries) = std::fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_file() && path.extension().map(|e| e == "md").unwrap_or(false) {
            let fname = path.file_name().unwrap_or_default().to_string_lossy();
            if fname == "README.md" || fname == "Projects.md" {
                continue;
            }
            // Relative path from active_path's parent (includes Business/ or Work/)
            let rel = format!(
                "{}/{}",
                _category,
                path.file_name().unwrap_or_default().to_string_lossy()
            );
            if let Some(p) = parse_file(&path, color, &rel) {
                out.push(p);
            }
        }
    }
}

fn parse_file(path: &Path, color: &str, rel: &str) -> Option<ObsidianProject> {
    let content = std::fs::read_to_string(path).ok()?;
    let lines: Vec<&str> = content.lines().collect();

    // Parse frontmatter
    let (frontmatter, body_start) = parse_frontmatter(&lines);

    // Name: frontmatter title → first # heading → filename stem
    let name = frontmatter
        .iter()
        .find(|(k, _)| k == "title")
        .map(|(_, v)| v.clone())
        .or_else(|| {
            lines[body_start..]
                .iter()
                .find(|l| l.starts_with("# "))
                .map(|l| l.trim_start_matches("# ").to_string())
        })
        .unwrap_or_else(|| {
            path.file_stem()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string()
        });

    // Description: ## Objective / ## 🎯 section → **Concept:** value → first paragraph
    let description = extract_description(&lines[body_start..]);

    Some(ObsidianProject {
        name: strip_wiki_links(&name),
        description: description.map(|d| strip_wiki_links(&d)),
        color: color.to_string(),
        obsidian_source: rel.to_string(),
    })
}

fn parse_frontmatter(lines: &[&str]) -> (Vec<(String, String)>, usize) {
    let mut pairs = Vec::new();
    if lines.first().map(|l| l.trim()) != Some("---") {
        return (pairs, 0);
    }
    for (i, line) in lines.iter().enumerate().skip(1) {
        if line.trim() == "---" {
            return (pairs, i + 1);
        }
        if let Some((key, val)) = line.split_once(':') {
            let key = key.trim().to_lowercase();
            let val = val.trim().trim_matches('"').to_string();
            if !val.is_empty() {
                pairs.push((key, val));
            }
        }
    }
    (pairs, 0) // unclosed frontmatter, treat as no frontmatter
}

fn extract_description(lines: &[&str]) -> Option<String> {
    // Look for ## Objective or ## 🎯 section
    for (i, line) in lines.iter().enumerate() {
        let lower = line.to_lowercase();
        if lower.starts_with("## objective") || line.starts_with("## 🎯") {
            // Collect paragraph after this heading
            let text = collect_section_text(&lines[i + 1..]);
            if !text.is_empty() {
                return Some(truncate(&text, 300));
            }
        }
    }

    // Look for **Concept:** value
    for line in lines {
        if let Some(rest) = line.strip_prefix("**Concept:**") {
            let val = rest.trim().to_string();
            if !val.is_empty() {
                return Some(truncate(&val, 300));
            }
        }
    }

    // First non-empty paragraph after headings/frontmatter
    for line in lines {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') || trimmed == "---" {
            continue;
        }
        // Skip metadata-like lines
        if trimmed.starts_with("**Status:**")
            || trimmed.starts_with("**Owner:**")
            || trimmed.starts_with("**Type:**")
            || trimmed.starts_with("**Created:**")
        {
            continue;
        }
        return Some(truncate(trimmed, 300));
    }

    None
}

fn collect_section_text(lines: &[&str]) -> String {
    let mut parts = Vec::new();
    for line in lines {
        let trimmed = line.trim();
        if trimmed.starts_with("## ") || trimmed.starts_with("# ") || trimmed == "---" {
            break;
        }
        if !trimmed.is_empty() {
            parts.push(trimmed);
        } else if !parts.is_empty() {
            break; // stop at first blank line after content
        }
    }
    parts.join(" ")
}

fn truncate(s: &str, max: usize) -> String {
    if s.len() <= max {
        s.to_string()
    } else {
        let mut end = max;
        while end > 0 && !s.is_char_boundary(end) {
            end -= 1;
        }
        format!("{}…", &s[..end])
    }
}

fn strip_wiki_links(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    let mut chars = s.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '[' && chars.peek() == Some(&'[') {
            chars.next(); // consume second [
            let mut link = String::new();
            while let Some(c2) = chars.next() {
                if c2 == ']' && chars.peek() == Some(&']') {
                    chars.next(); // consume second ]
                    break;
                }
                link.push(c2);
            }
            // Use display text (after |) if present
            if let Some((_target, display)) = link.split_once('|') {
                result.push_str(display);
            } else {
                result.push_str(&link);
            }
        } else {
            result.push(c);
        }
    }
    result
}
