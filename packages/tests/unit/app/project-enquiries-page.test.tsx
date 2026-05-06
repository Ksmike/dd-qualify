import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

const mockRedirect = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});
const mockNotFound = vi.fn(() => {
  throw new Error("NOT_FOUND");
});
vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>(
    "next/navigation"
  );
  return {
    ...actual,
    redirect: mockRedirect,
    notFound: mockNotFound,
  };
});

const mockFindByIdForUser = vi.fn();
vi.mock("@/lib/models/ProjectModel", () => ({
  ProjectModel: {
    findByIdForUser: mockFindByIdForUser,
  },
}));

vi.mock("@/labels", () => ({
  getLabelsForLocale: vi.fn(() => ({
    locale: "en",
    labels: {
      app: {
        enquiries: {
          heading: "Enquiries",
          description: "Open questions and follow-ups for this project.",
          placeholder: "Enquiries are coming soon.",
        },
      },
    },
  })),
}));

const { default: EnquiriesPage } = await import(
  "@/app/(app)/project/[id]/enquiries/page"
);

describe("project enquiries page", () => {
  it("redirects unauthenticated users to login", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(
      EnquiriesPage({ params: Promise.resolve({ id: "project-1" }) })
    ).rejects.toThrow("REDIRECT:/login?callbackUrl=/project/project-1/enquiries");
  });

  it("throws notFound when the project does not exist", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", locale: "en" } });
    mockFindByIdForUser.mockResolvedValue(null);

    await expect(
      EnquiriesPage({ params: Promise.resolve({ id: "missing" }) })
    ).rejects.toThrow("NOT_FOUND");
  });

  it("renders enquiries placeholder for the project", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", locale: "en" } });
    mockFindByIdForUser.mockResolvedValue({
      id: "project-1",
      name: "Alpha Project",
      status: "draft",
      createdAt: new Date(),
    });

    const page = await EnquiriesPage({
      params: Promise.resolve({ id: "project-1" }),
    });

    render(page);
    expect(screen.getByText("Enquiries")).toBeInTheDocument();
    expect(
      screen.getByText("Alpha Project - Open questions and follow-ups for this project.")
    ).toBeInTheDocument();
    expect(screen.getByText("Enquiries are coming soon.")).toBeInTheDocument();
  });
});
