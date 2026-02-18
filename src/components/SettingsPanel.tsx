import { useCallback, useEffect, useState } from "react";
import { IconX, IconLoader2 } from "@tabler/icons-react";
import {
  configureSsh,
  getSshConfig,
  getRemoteMode,
  setRemoteMode,
  testSsh,
  type SshConfig,
} from "../lib/tauri";
import type { ThemeMode } from "../hooks/useTheme";

interface Props {
  onClose: () => void;
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
}

export default function SettingsPanel({ onClose, themeMode, onThemeChange }: Props) {
  const [config, setConfig] = useState<SshConfig>({
    host: "mac-mini.local",
    port: 22,
    user: "clawdbot1",
    key_path: "~/.ssh/id_ed25519",
  });
  const [remote, setRemote] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getSshConfig(), getRemoteMode()]).then(([cfg, rm]) => {
      setConfig(cfg);
      setRemote(rm);
    }).catch(() => {});
  }, []);

  const handleTest = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await configureSsh(config);
      const result = await testSsh();
      setTestResult({ ok: true, msg: `Connected: ${result}` });
    } catch (err: any) {
      setTestResult({ ok: false, msg: String(err) });
    } finally {
      setTesting(false);
    }
  }, [config]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await configureSsh(config);
      await setRemoteMode(remote);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
      onClose();
    }
  }, [config, remote, onClose]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 12,
          padding: 24,
          width: 460,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Settings</h2>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-2)", padding: 4 }}
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Theme */}
        <section style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-2)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
            Appearance
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {(["light", "dark", "system"] as ThemeMode[]).map((m) => (
              <button
                key={m}
                onClick={() => onThemeChange(m)}
                style={{
                  padding: "6px 16px",
                  borderRadius: 8,
                  border: `1px solid ${themeMode === m ? "var(--color-accent)" : "var(--color-border)"}`,
                  background: themeMode === m ? "var(--color-accent)" : "var(--color-surface-2)",
                  color: themeMode === m ? "#fff" : "var(--color-text)",
                  fontSize: 13,
                  cursor: "pointer",
                  fontWeight: themeMode === m ? 600 : 400,
                  textTransform: "capitalize",
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </section>

        {/* SSH */}
        <section>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-2)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
            SSH Remote Access
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={remote}
                onChange={(e) => setRemote(e.target.checked)}
                style={{ width: 16, height: 16, cursor: "pointer" }}
              />
              <span style={{ fontSize: 14 }}>Enable remote mode (run OpenClaw on Mac Mini via SSH)</span>
            </label>

            <Field label="SSH Host" value={config.host} onChange={(v) => setConfig({ ...config, host: v })} placeholder="mac-mini.local" />
            <Field label="SSH Port" value={String(config.port)} onChange={(v) => setConfig({ ...config, port: parseInt(v) || 22 })} placeholder="22" />
            <Field label="SSH User" value={config.user} onChange={(v) => setConfig({ ...config, user: v })} placeholder="clawdbot1" />
            <Field label="SSH Key" value={config.key_path} onChange={(v) => setConfig({ ...config, key_path: v })} placeholder="~/.ssh/id_ed25519" />

            {testResult && (
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: testResult.ok ? "#d1fae5" : "#fee2e2",
                  color: testResult.ok ? "#065f46" : "#991b1b",
                  fontSize: 13,
                }}
              >
                {testResult.ok ? "✓ " : "✗ "}
                {testResult.msg}
              </div>
            )}

            <button
              onClick={handleTest}
              disabled={testing}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface-2)",
                color: "var(--color-text)",
                fontSize: 14,
                cursor: testing ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                alignSelf: "flex-start",
              }}
            >
              {testing && <IconLoader2 size={14} className="animate-spin" />}
              {testing ? "Testing…" : "Test Connection"}
            </button>
          </div>
        </section>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 24 }}>
          <button
            onClick={onClose}
            style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: 14, cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--color-accent)", color: "#fff", fontSize: 14, cursor: "pointer", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}
          >
            {saving && <IconLoader2 size={14} className="animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--color-text-2)", marginBottom: 4 }}>{label}</div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "7px 12px",
          borderRadius: 8,
          border: "1px solid var(--color-border)",
          background: "var(--color-surface-2)",
          color: "var(--color-text)",
          fontSize: 14,
          outline: "none",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}
