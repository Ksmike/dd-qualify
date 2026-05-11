import Link from "next/link";
import ReactMarkdown from "react-markdown";

type DocsMarkdownProps = {
  content: string;
};

export function DocsMarkdown({ content }: DocsMarkdownProps) {
  return (
    <div className="prose prose-sm max-w-none text-foreground/90 prose-headings:text-foreground prose-p:text-foreground/80 prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-code:text-foreground prose-pre:border prose-pre:border-divider prose-pre:bg-content1 prose-th:text-foreground prose-td:text-foreground/80">
      <ReactMarkdown
        components={{
          a({ href, children, ...props }) {
            if (!href) {
              return <a {...props}>{children}</a>;
            }

            const isExternal =
              href.startsWith("http://") ||
              href.startsWith("https://") ||
              href.startsWith("mailto:");

            if (isExternal) {
              return (
                <a
                  {...props}
                  href={href}
                  rel="noreferrer"
                  target="_blank"
                >
                  {children}
                </a>
              );
            }

            return (
              <Link href={href} {...props}>
                {children}
              </Link>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
