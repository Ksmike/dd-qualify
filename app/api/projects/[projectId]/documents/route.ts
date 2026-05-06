import { list, put } from "@vercel/blob";
import { auth } from "@/lib/auth";
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

    return Response.json(
      {
        document: {
          filename: sanitizedFilename,
          pathname: blob.pathname,
          url: blob.url,
          downloadUrl: blob.downloadUrl,
          size: file.size,
          contentType: file.type || null,
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
    const documents = blobs.map((blob) => ({
      filename: getFilenameFromProjectBlobPath(blob.pathname, prefix),
      pathname: blob.pathname,
      size: blob.size,
      uploadedAt: blob.uploadedAt,
      url: blob.url,
      downloadUrl: blob.downloadUrl,
      etag: blob.etag,
    }));

    return Response.json({ documents, cursor, hasMore });
  } catch {
    return Response.json({ error: "Failed to list documents." }, { status: 500 });
  }
}
