import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/components/settings/ApiKeyCard", () => ({
  ApiKeyCard: ({ initial }: { initial: { provider: string } }) => (
    <div data-testid={`api-key-card-${initial.provider}`}>
      {initial.provider}
    </div>
  ),
}));

const { ApiKeySection } = await import("@/components/settings/ApiKeySection");

describe("ApiKeySection", () => {
  const mockStatuses = [
    {
      id: "key-1",
      provider: "OPENAI" as const,
      isSet: true,
      hint: "abcd",
      defaultModel: "gpt-4o-mini",
      enabled: true,
      lastValidatedAt: "2024-06-01T00:00:00Z",
    },
    {
      id: null,
      provider: "ANTHROPIC" as const,
      isSet: false,
      hint: null,
      defaultModel: "claude-3-5-sonnet-latest",
      enabled: false,
      lastValidatedAt: null,
    },
    {
      id: null,
      provider: "GOOGLE" as const,
      isSet: false,
      hint: null,
      defaultModel: "gemini-2.5-flash",
      enabled: false,
      lastValidatedAt: null,
    },
  ];

  it("renders an ApiKeyCard for each provider", () => {
    render(<ApiKeySection initial={mockStatuses} />);

    expect(screen.getByTestId("api-key-card-OPENAI")).toBeInTheDocument();
    expect(screen.getByTestId("api-key-card-ANTHROPIC")).toBeInTheDocument();
    expect(screen.getByTestId("api-key-card-GOOGLE")).toBeInTheDocument();
  });

  it("renders the correct number of cards", () => {
    render(<ApiKeySection initial={mockStatuses} />);

    const cards = screen.getAllByTestId(/^api-key-card-/);
    expect(cards).toHaveLength(3);
  });

  it("renders with empty initial array", () => {
    render(<ApiKeySection initial={[]} />);

    const cards = screen.queryAllByTestId(/^api-key-card-/);
    expect(cards).toHaveLength(0);
  });
});
