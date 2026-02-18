import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadSession,
  onChatMessage,
  sendMessage,
  stopWatching,
  watchSession,
  type ChatMessage,
  type Thread,
} from "../lib/tauri";

export function useChat(thread: Thread | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unlistenRef = useRef<(() => void) | null>(null);
  const activeSessionRef = useRef<string | null>(null);
  const sendingRef = useRef(false);

  // Load session and set up event listener when thread changes
  useEffect(() => {
    if (!thread) {
      setMessages([]);
      return;
    }

    let cancelled = false;

    const setup = async () => {
      setLoading(true);

      // Clean up previous
      if (activeSessionRef.current) {
        await stopWatching(activeSessionRef.current).catch(() => {});
      }
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }

      activeSessionRef.current = thread.session_id;

      // Subscribe to incoming messages (from Rust JSONL polling during send)
      const unlisten = await onChatMessage((event) => {
        if (event.session_id !== thread.session_id) return;
        // Only append events while actively sending (streaming response)
        if (!sendingRef.current) return;

        setMessages((prev) => {
          const msg = event.message;
          // Dedup: check if we already have this exact message
          const isDupe = prev.some(
            (m) => m.role === msg.role && m.content === msg.content
          );
          if (isDupe) return prev;
          return [...prev, msg];
        });
      });
      if (!cancelled) unlistenRef.current = unlisten;

      // Load existing messages from JSONL
      try {
        const existing = await loadSession(thread.agent_id, thread.session_id);
        if (!cancelled) setMessages(existing);
      } catch {
        if (!cancelled) setMessages([]);
      }

      // Start background watcher
      try {
        await watchSession(thread.agent_id, thread.session_id);
      } catch (err) {
        console.error("Failed to watch session:", err);
      }

      if (!cancelled) setLoading(false);
    };

    setup();

    return () => {
      cancelled = true;
    };
  }, [thread?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unlistenRef.current) unlistenRef.current();
      if (activeSessionRef.current) {
        stopWatching(activeSessionRef.current).catch(() => {});
      }
    };
  }, []);

  const send = useCallback(
    async (text: string) => {
      if (!thread || !text.trim() || sending) return;

      setError(null);

      // Optimistic user message
      const userMsg: ChatMessage = { role: "user", content: text.trim() };
      setMessages((prev) => [...prev, userMsg]);
      setSending(true);
      sendingRef.current = true;

      try {
        // Rust polls JSONL and emits chat:message events while openclaw runs
        await sendMessage(
          thread.id,
          thread.agent_id ?? "main",
          thread.session_id,
          text.trim()
        );
      } catch (err: any) {
        const msg = err?.message || err?.toString() || "Unknown error";
        console.error("sendMessage failed:", msg);
        setError(msg);
      }

      // Always reload canonical state from JSONL after send completes (or fails)
      try {
        const canonical = await loadSession(
          thread.agent_id ?? "main",
          thread.session_id
        );
        if (canonical.length > 0) {
          setMessages(canonical);
        }
        // If canonical is empty but we had an optimistic message, keep it
      } catch {
        // loadSession failed — keep whatever we have
      }

      sendingRef.current = false;
      setSending(false);
    },
    [thread, sending]
  );

  return { messages, sending, loading, error, send };
}
