import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock child components used by pages
vi.mock("@/components/auth/LoginForm", () => ({
  LoginForm: () => <div data-testid="login-form" />,
}));
vi.mock("@/components/auth/RegisterForm", () => ({
  RegisterForm: () => <div data-testid="register-form" />,
}));
vi.mock("@/components/Sidebar", () => ({
  Sidebar: () => <div data-testid="sidebar" />,
}));
vi.mock("@/components/Header", () => ({
  Header: ({ user }: { user?: unknown }) => (
    <div data-testid="header" data-user={user ? "yes" : "no"} />
  ),
}));
vi.mock("@/components/Footer", () => ({
  Footer: () => <div data-testid="footer" />,
}));

// Mock auth for marketing layout
vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

// Mock labels for HomePage
vi.mock("@/labels", () => ({
  getLabelsForLocale: vi.fn().mockReturnValue({
    locale: "en",
    labels: {
      marketing: {
        hero: {
          badge: "Automated Due Diligence Platform",
          title: "DD Qualify helps investors underwrite faster with less blind risk.",
          description: "We combine structured data ingestion...",
          trialCta: "Start Free Trial",
          demoCta: "View Live Workspace",
          segmentLabels: ["VC", "Growth Equity"],
        },
        metrics: [
          { label: "Deals screened per month", value: "240+" },
          { label: "Median first-pass report", value: "36 hours" },
          { label: "Manual analyst effort reduced", value: "92%" },
        ],
        workflow: {
          heading: "How DD Qualify works",
          steps: [
            { title: "Collect", description: "Connect data rooms..." },
            { title: "Analyze", description: "Run automated checks..." },
            { title: "Decide", description: "Get an executive summary..." },
          ],
        },
        coverage: {
          heading: "Risk coverage teams trust",
          description: "Built for pre-investment...",
          items: ["Corporate and contract compliance"],
          outcomesTitle: "Pilot portfolio outcomes",
          outcomesParagraphs: ["Teams using DD Qualify..."],
        },
        taxonomy: {
          heading: "Built-in deal labels",
          description: "Standardized labels...",
          items: ["Data Quality", "Legal Risk"],
        },
        cta: {
          heading: "Ready to automate your next diligence cycle?",
          description: "Launch a workspace in minutes...",
          createWorkspaceCta: "Create Workspace",
          contactSalesCta: "Contact Sales",
          footnote: "Enterprise-ready API...",
        },
      },
    },
  }),
}));

describe("DashboardPage", () => {
  it("renders heading and welcome text", async () => {
    const { default: DashboardPage } = await import(
      "@/app/(app)/dashboard/page"
    );
    render(<DashboardPage />);
    expect(
      screen.getByRole("heading", { name: "Dashboard" })
    ).toBeInTheDocument();
    expect(screen.getByText("Welcome back.")).toBeInTheDocument();
  });
});

describe("SettingsPage", () => {
  it("renders heading and description", async () => {
    const { default: SettingsPage } = await import(
      "@/app/(app)/settings/page"
    );
    render(<SettingsPage />);
    expect(
      screen.getByRole("heading", { name: "Settings" })
    ).toBeInTheDocument();
    expect(screen.getByText("Manage your preferences.")).toBeInTheDocument();
  });
});

describe("LoginPage", () => {
  it("renders heading and login form", async () => {
    const { default: LoginPage } = await import("@/app/(auth)/login/page");
    render(<LoginPage />);
    expect(
      screen.getByRole("heading", { name: "Welcome back" })
    ).toBeInTheDocument();
    expect(screen.getByText("Sign in to your account")).toBeInTheDocument();
    expect(screen.getByTestId("login-form")).toBeInTheDocument();
  });
});

describe("RegisterPage", () => {
  it("renders heading and register form", async () => {
    const { default: RegisterPage } = await import(
      "@/app/(auth)/register/page"
    );
    render(<RegisterPage />);
    expect(
      screen.getByRole("heading", { name: "Create an account" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Get started with DD Qualify")
    ).toBeInTheDocument();
    expect(screen.getByTestId("register-form")).toBeInTheDocument();
  });
});

describe("MarketingLayout", () => {
  it("renders header, footer, and children", async () => {
    const { default: MarketingLayout } = await import(
      "@/app/(marketing)/layout"
    );
    const element = await MarketingLayout({ children: <p>marketing content</p> });
    render(element);
    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
    expect(screen.getByText("marketing content")).toBeInTheDocument();
  });
});

describe("HomePage", () => {
  it("renders hero heading", async () => {
    const { default: HomePage } = await import("@/app/(marketing)/page");
    render(<HomePage />);
    expect(
      screen.getByRole("heading", {
        name: /DD Qualify helps investors underwrite faster/,
      })
    ).toBeInTheDocument();
  });

  it("renders metrics", async () => {
    const { default: HomePage } = await import("@/app/(marketing)/page");
    render(<HomePage />);
    expect(screen.getByText("240+")).toBeInTheDocument();
    expect(screen.getByText("36 hours")).toBeInTheDocument();
    expect(screen.getByText("92%")).toBeInTheDocument();
  });

  it("renders workflow section", async () => {
    const { default: HomePage } = await import("@/app/(marketing)/page");
    render(<HomePage />);
    expect(
      screen.getByRole("heading", { name: "How DD Qualify works" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Collect" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Analyze" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Decide" })
    ).toBeInTheDocument();
  });

  it("renders CTA links", async () => {
    const { default: HomePage } = await import("@/app/(marketing)/page");
    render(<HomePage />);
    const registerLinks = screen.getAllByRole("link", {
      name: /Start Free Trial|Create Workspace/,
    });
    expect(registerLinks.length).toBeGreaterThanOrEqual(1);
  });
});
