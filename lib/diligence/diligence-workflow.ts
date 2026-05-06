import { FatalError, getWorkflowMetadata } from "workflow";
import type { DiligenceStageName } from "@/lib/generated/prisma/client";

export type DiligenceWorkflowInput = {
  jobId: string;
  userId: string;
  priority: number;
};

const FATAL_MESSAGE_PATTERNS = [
  "Diligence job not found.",
  "Invalid project storage prefix.",
  "Missing user API key reference",
  "Selected API key is missing or disabled.",
];

async function runStage(input: {
  jobId: string;
  userId: string;
}): Promise<{ status: "completed" | "progressed" | "waiting_input"; stage?: DiligenceStageName }> {
  "use step";

  const { DiligenceWorker } = await import("@/lib/diligence/diligence-worker");
  const worker = new DiligenceWorker();

  try {
    return await worker.runNextStage(input);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Stage execution failed.";
    if (FATAL_MESSAGE_PATTERNS.some((pattern) => message.includes(pattern))) {
      throw new FatalError(message);
    }
    throw error;
  }
}

async function attachRunIdToJob(input: {
  jobId: string;
  userId: string;
  workflowRunId: string;
}): Promise<void> {
  "use step";

  const { db } = await import("@/lib/db");
  await db.diligenceJob.updateMany({
    where: { id: input.jobId, userId: input.userId },
    data: { workflowRunId: input.workflowRunId },
  });
}

export async function diligenceWorkflow(
  input: DiligenceWorkflowInput
): Promise<{ jobId: string; completed: boolean; stagesRun: number }> {
  "use workflow";

  const metadata = getWorkflowMetadata();
  await attachRunIdToJob({
    jobId: input.jobId,
    userId: input.userId,
    workflowRunId: metadata.workflowRunId,
  });

  let stagesRun = 0;
  while (true) {
    const result = await runStage({
      jobId: input.jobId,
      userId: input.userId,
    });
    stagesRun += 1;

    if (result.status === "completed") {
      return { jobId: input.jobId, completed: true, stagesRun };
    }
    if (result.status === "waiting_input") {
      return { jobId: input.jobId, completed: false, stagesRun };
    }
  }
}
