import { useEffect, useRef } from "react";
import { IconMessage } from "@tabler/icons-react";
import MessageBubble from "./MessageBubble";
import InputBar from "./InputBar";
import { useChat } from "../hooks/useChat";
import type { Thread } from "../lib/tauri";

interface Props {
  thread: Thread | null;
  isDark: boolean;
  onSent?: (thread: Thread) => void;
}

export default function ChatView({ thread, isDark, onSent }: Props) {
  const { messages, sending, loading, error, send } = useChat(thread);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async (text: string) => {
    await send(text);
    if (thread) onSent?.(thread);
  };

  if (!thread) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          color: "var(--color-text-2)",
        }}
      >
        <IconMessage size={48} opacity={0.3} />
        <div style={{ fontSize: 16, fontWeight: 500 }}>No thread selected</div>
        <div style={{ fontSize: 13 }}>
          Select a thread from the sidebar or create a new one.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "var(--color-surface)",
      }}
    >
      {/* Thread header */}
      <div
        style={{
          padding: "14px 20px",
          borderBottom: "1px solid var(--color-border)",
          fontWeight: 600,
          fontSize: 15,
          color: "var(--color-text)",
          background: "var(--color-surface)",
          flexShrink: 0,
        }}
      >
        {thread.name}
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 20px",
        }}
      >
        {loading && (
          <div style={{ textAlign: "center", color: "var(--color-text-2)", padding: 24 }}>
            Loading…
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div
            style={{
              textAlign: "center",
              color: "var(--color-text-2)",
              padding: "48px 0",
              fontSize: 14,
            }}
          >
            Send a message to start the conversation.
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i}>
            <MessageBubble message={msg} isDark={isDark} />
          </div>
        ))}

        {error && (
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 8 }}>
            <div
              style={{
                background: "#fef2f2",
                borderRadius: "12px",
                padding: "10px 16px",
                color: "#dc2626",
                fontSize: 13,
                border: "1px solid #fecaca",
              }}
            >
              Failed to send: {error}
            </div>
          </div>
        )}

        {sending && (
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 8 }}>
            <div
              style={{
                background: "var(--color-ai-bubble)",
                borderRadius: "18px 18px 18px 4px",
                padding: "10px 16px",
                color: "var(--color-text-2)",
                fontSize: 13,
              }}
            >
              <span className="animate-pulse">OpenClaw is thinking…</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <InputBar onSend={handleSend} disabled={sending} />
    </div>
  );
}
