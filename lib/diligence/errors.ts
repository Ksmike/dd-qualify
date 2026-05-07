export class DiligenceFatalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DiligenceFatalError";
  }
}

export class LlmOutputParseError extends Error {
  constructor(message: string, readonly rawText: string) {
    super(message);
    this.name = "LlmOutputParseError";
  }
}

export function isDiligenceFatalError(error: unknown): error is DiligenceFatalError {
  return error instanceof DiligenceFatalError;
}
