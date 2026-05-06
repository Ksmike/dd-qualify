export type SupportedLocale = "en";

export type MetricLabel = {
  label: string;
  value: string;
};

export type WorkflowStepLabel = {
  title: string;
  description: string;
};

export type MarketingLabels = {
  hero: {
    badge: string;
    title: string;
    description: string;
    trialCta: string;
    demoCta: string;
    segmentLabels: string[];
  };
  metrics: MetricLabel[];
  workflow: {
    heading: string;
    steps: WorkflowStepLabel[];
  };
  coverage: {
    heading: string;
    description: string;
    items: string[];
    outcomesTitle: string;
    outcomesParagraphs: string[];
  };
  taxonomy: {
    heading: string;
    description: string;
    items: string[];
  };
  cta: {
    heading: string;
    description: string;
    createWorkspaceCta: string;
    contactSalesCta: string;
    footnote: string;
  };
};

export type AppLabels = {
  marketing: MarketingLabels;
};
