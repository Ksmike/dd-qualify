import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

const { NavigationProgress } = await import("@/components/NavigationProgress");

describe("NavigationProgress", () => {
  it("is hidden by default", () => {
    render(<NavigationProgress />);

    expect(screen.queryByTestId("navigation-progress")).not.toBeInTheDocument();
  });
});
