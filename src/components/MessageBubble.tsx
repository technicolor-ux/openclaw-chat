import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { remarkPlugins } from "../lib/markdown";
import type { ChatMessage } from "../lib/tauri";

interface Props {
  message: ChatMessage;
  isDark: boolean;
}

export default function MessageBubble({ message, isDark }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        style={{
          maxWidth: "75%",
          background: isUser ? "var(--color-user-bubble)" : "var(--color-ai-bubble)",
          color: isUser ? "#fff" : "var(--color-text)",
          borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          padding: "10px 14px",
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        <div className="prose">
          <ReactMarkdown
            remarkPlugins={remarkPlugins}
            components={{
              code({ node, className, children, ref, ...props }) {
                const match = /language-(\w+)/.exec(className || "");
                const isBlock = !!match;
                if (isBlock) {
                  return (
                    <SyntaxHighlighter
                      style={isDark ? oneDark : oneLight}
                      language={match![1]}
                      PreTag="div"
                      customStyle={{
                        margin: "0.5rem 0",
                        borderRadius: 8,
                        fontSize: 13,
                      }}
                    >
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  );
                }
                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
