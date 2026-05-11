import Link from "next/link";
import { LuBookOpen, LuChevronRight, LuFileText, LuFolderOpen } from "react-icons/lu";
import type { AppLabels } from "@/labels/types";
import type { DocEntry } from "@/lib/docs";
import { DocsMarkdown } from "./DocsMarkdown";

type DocsShellProps = {
  docs: DocEntry[];
  currentDoc: DocEntry | null;
  labels: AppLabels["docs"];
};

function isActiveDoc(currentDoc: DocEntry | null, doc: DocEntry): boolean {
  return currentDoc?.href === doc.href;
}

export function DocsShell({ docs, currentDoc, labels }: DocsShellProps) {
  return (
    <div className="min-h-[calc(100vh-8rem)] bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:gap-10 lg:py-10">
        <aside className="lg:sticky lg:top-6 lg:h-fit lg:w-80 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-divider bg-content1">
            <div className="border-b border-divider px-5 py-4">
              <div className="flex items-center gap-2 text-primary">
                <LuFolderOpen aria-hidden="true" className="size-4" />
                <p className="text-xs font-semibold uppercase tracking-[0.18em]">
                  {labels.sidebarEyebrow}
                </p>
              </div>
              <h1 className="mt-2 text-xl font-semibold text-foreground">
                {labels.heading}
              </h1>
              <p className="mt-1 text-sm leading-6 text-foreground/60">
                {labels.description}
              </p>
            </div>

            <nav className="max-h-[60vh] overflow-y-auto px-2 py-2">
              {docs.map((doc) => {
                const active = isActiveDoc(currentDoc, doc);
                return (
                  <Link
                    key={doc.href}
                    href={doc.href}
                    className={`flex items-start gap-3 rounded-xl px-3 py-3 transition-colors ${
                      active
                        ? "bg-background text-foreground"
                        : "text-foreground/65 hover:bg-background hover:text-foreground"
                    }`}
                  >
                    <LuFileText
                      aria-hidden="true"
                      className={`mt-0.5 size-4 shrink-0 ${
                        active ? "text-primary" : "text-foreground/35"
                      }`}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {doc.title}
                      </span>
                      <span className="mt-1 block truncate text-xs text-foreground/45">
                        {doc.relativePath}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          {currentDoc ? (
            <article className="overflow-hidden rounded-3xl border border-divider bg-content1 shadow-sm">
              <div className="border-b border-divider px-6 py-5 sm:px-8">
                <Link
                  href="/docs"
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-opacity hover:opacity-80"
                >
                  <LuBookOpen aria-hidden="true" className="size-4" />
                  {labels.allDocsCta}
                </Link>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                  {currentDoc.title}
                </h2>
                {currentDoc.summary ? (
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-foreground/65 sm:text-base">
                    {currentDoc.summary}
                  </p>
                ) : null}
                <p className="mt-4 text-xs font-medium uppercase tracking-[0.16em] text-foreground/35">
                  {labels.sourceLabel}: {currentDoc.relativePath}
                </p>
              </div>

              <div className="px-6 py-6 sm:px-8 sm:py-8">
                <DocsMarkdown content={currentDoc.content} />
              </div>
            </article>
          ) : (
            <div className="space-y-6">
              <div className="rounded-3xl border border-divider bg-content1 px-6 py-8 sm:px-8">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {labels.indexEyebrow}
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                  {labels.indexHeading}
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-foreground/65 sm:text-base">
                  {labels.indexDescription}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {docs.map((doc) => (
                  <Link
                    key={doc.href}
                    href={doc.href}
                    className="group rounded-2xl border border-divider bg-content1 p-5 transition-colors hover:bg-content2"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-lg font-semibold text-foreground">
                          {doc.title}
                        </p>
                        <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-foreground/35">
                          {doc.relativePath}
                        </p>
                      </div>
                      <LuChevronRight
                        aria-hidden="true"
                        className="mt-1 size-4 shrink-0 text-foreground/35 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                      />
                    </div>
                    <p className="mt-4 text-sm leading-6 text-foreground/60">
                      {doc.summary || labels.noSummaryFallback}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
