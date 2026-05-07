import { list, put } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { ProjectDocumentModel } from "@/lib/models/ProjectDocumentModel";
import { checkRateLimit } from "@/lib/security/rate-limit";
import {
  buildProjectBlobPath,
  buildProjectBlobPrefix,
  getFilenameFromProjectBlobPath,
  sanitizeDocumentFilename,
  sanitizeProjectId,
} from "@/lib/blob/documents";

export const dynamic = "force-dynamic";

const INVALID_PROJECT_ID_ERROR = "Invalid project ID.";
const INVALID_DOCUMENT_ERROR =
  "Unsupported document format. Allowed: .txt, .docx, .pages, .pdf, .ppt, .pptx, .key, .keynote.";
const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;
const UPLOAD_RATE_LIMIT_MAX = 25;
const UPLOAD_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1_000;

function getUserIdFromSession(session: {
  user?: { id?: string | null } | null;
} | null | undefined) {
  return session?.user?.id ?? null;
}

function isFileLike(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    "size" in value &&
    "type" in value
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  const userId = getUserIdFromSession(session);
  if (!userId) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { projectId } = await params;
  const sanitizedProjectId = sanitizeProjectId(projectId);
  if (!sanitizedProjectId) {
    return Response.json({ error: INVALID_PROJECT_ID_ERROR }, { status: 400 });
  }

  const uploadRateLimit = checkRateLimit({
    namespace: "upload:project-documents",
    identifier: `${userId}:${sanitizedProjectId}`,
    maxRequests: UPLOAD_RATE_LIMIT_MAX,
    windowMs: UPLOAD_RATE_LIMIT_WINDOW_MS,
  });
  if (!uploadRateLimit.allowed) {
    return Response.json(
      { error: "Too many upload requests. Please try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(uploadRateLimit.retryAfterSeconds),
        },
      }
    );
  }

  let file: File | null = null;
  try {
    const formData = await request.formData();
    const fileEntry = formData.get("file");
    if (isFileLike(fileEntry)) {
      file = fileEntry;
    }
  } catch {
    return Response.json({ error: "Invalid form data." }, { status: 400 });
  }

  if (!file || file.size === 0) {
    return Response.json({ error: "Missing file upload." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return Response.json(
      { error: "File is too large. Maximum upload size is 25 MB." },
      { status: 413 }
    );
  }

  const sanitizedFilename = sanitizeDocumentFilename(file.name);
  if (!sanitizedFilename) {
    return Response.json({ error: INVALID_DOCUMENT_ERROR }, { status: 400 });
  }

  const pathname = buildProjectBlobPath(
    userId,
    sanitizedProjectId,
    sanitizedFilename
  );
  if (!pathname) {
    return Response.json({ error: "Invalid storage path." }, { status: 400 });
  }

  try {
    const blob = await put(pathname, file, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: file.type || undefined,
    });

    const projectDocument = await ProjectDocumentModel.upsertFromBlob({
      projectId: sanitizedProjectId,
      userId,
      filename: sanitizedFilename,
      pathname: blob.pathname,
      sizeBytes: file.size,
      contentType: file.type || null,
      resetProcessingStatus: true,
    });

    return Response.json(
      {
        document: {
          id: projectDocument.id,
          filename: sanitizedFilename,
          pathname: blob.pathname,
          url: blob.url,
          downloadUrl: blob.downloadUrl,
          size: file.size,
          contentType: file.type || null,
          processingStatus: "QUEUED",
          processingError: null,
          lastProcessedAt: null,
          reprocessCount: 0,
        },
      },
      { status: 201 }
    );
  } catch {
    return Response.json({ error: "Failed to upload document." }, { status: 500 });
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  const userId = getUserIdFromSession(session);
  if (!userId) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { projectId } = await params;
  const sanitizedProjectId = sanitizeProjectId(projectId);
  if (!sanitizedProjectId) {
    return Response.json({ error: INVALID_PROJECT_ID_ERROR }, { status: 400 });
  }

  const prefix = buildProjectBlobPrefix(userId, sanitizedProjectId);
  if (!prefix) {
    return Response.json({ error: "Invalid storage path." }, { status: 400 });
  }

  try {
    const { blobs, cursor, hasMore } = await list({ prefix });
    for (const blob of blobs) {
      const filename = getFilenameFromProjectBlobPath(blob.pathname, prefix);
      await ProjectDocumentModel.upsertFromBlob({
        projectId: sanitizedProjectId,
        userId,
        filename,
        pathname: blob.pathname,
        sizeBytes: blob.size,
        contentType: null,
      });
    }

    const projectDocuments = await ProjectDocumentModel.listForProject({
      projectId: sanitizedProjectId,
      userId,
    });
    const documentByPath = new Map(
      projectDocuments.map((document) => [document.pathname, document] as const)
    );

    const documents = blobs.map((blob) => {
      const filename = getFilenameFromProjectBlobPath(blob.pathname, prefix);
      const storedDocument = documentByPath.get(blob.pathname);
      return {
        id: storedDocument?.id ?? `${sanitizedProjectId}:${blob.pathname}`,
        filename,
        pathname: blob.pathname,
        size: blob.size,
        uploadedAt: blob.uploadedAt,
        processingStatus: storedDocument?.processingStatus ?? "QUEUED",
        processingError: storedDocument?.processingError ?? null,
        lastProcessedAt: storedDocument?.lastProcessedAt ?? null,
        reprocessCount: storedDocument?.reprocessCount ?? 0,
        url: blob.url,
        downloadUrl: blob.downloadUrl,
        etag: blob.etag,
      };
    });

    return Response.json({ documents, cursor, hasMore });
  } catch {
    return Response.json({ error: "Failed to list documents." }, { status: 500 });
  }
}
