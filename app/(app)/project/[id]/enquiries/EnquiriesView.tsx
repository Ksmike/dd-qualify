"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LuBuilding2, LuSend, LuSparkles, LuFileSearch } from "react-icons/lu";
import {
  askProjectEnquiry,
  type EnquiryChatMessage,
} from "@/lib/actions/enquiries";
import type { AppLabels } from "@/labels/types";

type EnquiriesLabels = AppLabels["app"]["enquiries"];

type Props = {
  projectId: string;
  projectName: string;
  labels: EnquiriesLabels;
};

type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
};

export function EnquiriesView({ projectId, projectName, labels }: Props) {
  const [thread, setThread] = useState<UiMessage[]>([
    {
      id: "intro",
      role: "assistant",
      content: labels.introMessage,
    },
  ]);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const messageSequenceRef = useRef(0);
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);

  const canSend = question.trim().length > 0 && !isPending;
  const sampleQuestions = useMemo(
    () => [labels.sampleQuestionOne, labels.sampleQuestionTwo, labels.sampleQuestionThree],
    [labels.sampleQuestionOne, labels.sampleQuestionTwo, labels.sampleQuestionThree]
  );

  function buildHistory(messages: UiMessage[]): EnquiryChatMessage[] {
    return messages.map((item) => ({
      role: item.role,
      content: item.content,
    }));
  }

  function submitQuestion(rawQuestion: string) {
    const trimmed = rawQuestion.trim();
    if (!trimmed || isPending) {
      return;
    }

    messageSequenceRef.current += 1;
    const userMessageId = `user-${messageSequenceRef.current}`;
    const userMessage: UiMessage = {
      id: userMessageId,
      role: "user",
      content: trimmed,
    };
    const nextThread = [...thread, userMessage];
    setThread(nextThread);
    setQuestion("");
    setError(null);

    startTransition(async () => {
      const result = await askProjectEnquiry({
        projectId,
        question: trimmed,
        history: buildHistory(nextThread),
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      const answerText = result.answer?.trim();
      if (!answerText) {
        setError(labels.genericError);
        return;
      }

      messageSequenceRef.current += 1;
      const assistantMessageId = `assistant-${messageSequenceRef.current}`;
      setThread((currentThread) => [
        ...currentThread,
        {
          id: assistantMessageId,
          role: "assistant",
          content: answerText,
          sources: result.sources ?? [],
        },
      ]);
    });
  }

  useEffect(() => {
    const viewport = messagesViewportRef.current;
    if (!viewport) {
      return;
    }
    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: "smooth",
    });
  }, [thread.length, isPending]);

  return (
    <div className="mx-auto flex h-full min-h-[70svh] w-full min-w-0 max-w-5xl flex-col overflow-x-hidden">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-divider bg-content1">
        <div className="shrink-0 space-y-3 border-b border-divider px-4 py-4 sm:px-5">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {labels.heading}
            </h1>
            <p className="text-sm text-foreground/70">
              {projectName} - {labels.description}
            </p>
          </div>

          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2 text-sm text-foreground/80">
              <LuSparkles aria-hidden="true" className="size-4 text-primary" />
              <p>{labels.sampleQuestionsHeading}</p>
            </div>
            <div className="flex min-w-0 gap-2 overflow-x-auto pb-1">
              {sampleQuestions.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => submitQuestion(sample)}
                  disabled={isPending}
                  className="max-w-full rounded-md border border-divider bg-background px-3 py-1.5 text-left text-xs text-foreground/80 transition-colors hover:bg-content2 disabled:opacity-60 sm:whitespace-nowrap"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div
          ref={messagesViewportRef}
          className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4 sm:px-5"
        >
          <AnimatePresence initial={false}>
            {thread.map((message) => (
              <motion.article
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`min-w-0 rounded-lg border px-3 py-2 ${
                  message.role === "user"
                    ? "ml-6 border-primary/30 bg-primary/10 sm:ml-12"
                    : "mr-6 border-divider bg-background sm:mr-12"
                }`}
              >
                <div className="mb-1 flex items-center gap-1.5 text-xs text-foreground/60">
                  {message.role === "user" ? (
                    <LuBuilding2 aria-hidden="true" className="size-3.5" />
                  ) : (
                    <LuSparkles aria-hidden="true" className="size-3.5 text-primary" />
                  )}
                  <span>
                    {message.role === "user" ? labels.investorLabel : labels.agentLabel}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {message.content}
                </p>
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-2 space-y-1 rounded-md border border-divider bg-content2 px-2 py-1.5">
                    <p className="text-[11px] font-medium text-foreground/70">
                      {labels.sourcesHeading}
                    </p>
                    <ul className="space-y-0.5">
                      {message.sources.map((source) => (
                        <li
                          key={`${message.id}-${source}`}
                          className="break-words text-[11px] text-foreground/60"
                        >
                          {source}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.article>
            ))}
          </AnimatePresence>

          {isPending && (
            <div className="mr-6 rounded-lg border border-divider bg-background px-3 py-2 text-sm text-foreground/60 sm:mr-12">
              <div className="flex items-center gap-2">
                <LuFileSearch aria-hidden="true" className="size-4 animate-pulse text-primary" />
                {labels.agentThinking}
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 space-y-2 border-t border-divider px-4 py-3 sm:px-5 sm:py-4">
          {error && (
            <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
              {labels.errorPrefix}: {error}
            </p>
          )}

          <div className="rounded-lg border border-divider bg-background p-2">
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submitQuestion(question);
                }
              }}
              placeholder={labels.placeholder}
              rows={2}
              className="max-h-40 min-h-16 w-full resize-none overflow-y-auto bg-transparent px-2 py-1 text-sm text-foreground outline-none placeholder:text-foreground/45"
            />
            <div className="flex justify-end">
              <motion.button
                type="button"
                onClick={() => submitQuestion(question)}
                disabled={!canSend}
                whileHover={{ scale: canSend ? 1.02 : 1 }}
                whileTap={{ scale: canSend ? 0.98 : 1 }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60 sm:w-auto"
              >
                <LuSend aria-hidden="true" className="size-4" />
                {isPending ? labels.sendingCta : labels.sendCta}
              </motion.button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
