"use client";

import ReactMarkdown from "react-markdown";

type Props = {
  content: string;
  className?: string;
};

/**
 * Renders markdown text as formatted HTML.
 * Used for agent responses that may contain bold, lists, headings, etc.
 */
export function MarkdownContent({ content, className = "" }: Props) {
  return (
    <div
      className={`prose prose-sm max-w-none text-foreground/90 prose-headings:text-foreground prose-strong:text-foreground prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 ${className}`}
    >
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
