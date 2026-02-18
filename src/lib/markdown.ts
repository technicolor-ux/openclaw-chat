import remarkGfm from "remark-gfm";
import { type Components } from "react-markdown";

export const remarkPlugins = [remarkGfm];

// We export Components type for use in MessageBubble
export type MarkdownComponents = Components;
