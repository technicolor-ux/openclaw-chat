import { useCallback, useRef, useState } from "react";
import { IconSend2 } from "@tabler/icons-react";

interface Props {
  onSend: (text: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

export default function InputBar({ onSend, disabled, placeholder }: Props) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [error, setError] = useState<string | null>(null);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    console.log("[InputBar] handleSend called", { trimmed: !!trimmed, sending, disabled });
    if (!trimmed || sending || disabled) {
      console.log("[InputBar] guard blocked:", { noText: !trimmed, sending, disabled });
      return;
    }
    setSending(true);
    setText("");
    setError(null);
    try {
      await onSend(trimmed);
    } catch (err: any) {
      setText(trimmed); // restore on error
      const msg = err?.message || err?.toString() || "Unknown error";
      console.error("Send failed:", msg, err);
      setError(msg);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }, [text, sending, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Auto-resize
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  };

  return (
    <div
      style={{
        padding: "12px 16px",
        borderTop: "1px solid var(--color-border)",
        background: "var(--color-surface)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 8,
          background: "var(--color-surface-2)",
          borderRadius: 12,
          border: "1px solid var(--color-border)",
          padding: "8px 12px",
        }}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? "Message OpenClaw…"}
          rows={1}
          disabled={disabled || sending}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            resize: "none",
            fontSize: 14,
            lineHeight: 1.6,
            color: "var(--color-text)",
            fontFamily: "inherit",
            minHeight: 24,
            maxHeight: 160,
            overflowY: "auto",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending || disabled}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            border: "none",
            cursor: text.trim() && !sending && !disabled ? "pointer" : "default",
            background:
              text.trim() && !sending && !disabled
                ? "var(--color-accent)"
                : "var(--color-surface-3)",
            color:
              text.trim() && !sending && !disabled ? "#fff" : "var(--color-text-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.15s, color 0.15s",
            flexShrink: 0,
          }}
          title="Send (Enter)"
        >
          <IconSend2 size={16} />
        </button>
      </div>
      {error && (
        <div
          style={{
            marginTop: 6,
            padding: "6px 10px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 8,
            fontSize: 12,
            color: "#dc2626",
            wordBreak: "break-all",
          }}
        >
          Send error: {error}
        </div>
      )}
      <div
        style={{
          marginTop: 4,
          fontSize: 11,
          color: "var(--color-text-2)",
          textAlign: "right",
          paddingRight: 4,
        }}
      >
        Enter to send · Shift+Enter for newline
      </div>
    </div>
  );
}
