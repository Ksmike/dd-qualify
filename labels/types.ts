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
  app: {
    dashboard: {
      heading: string;
      description: string;
      projectsHeading: string;
      createProjectCta: string;
      statusHeading: string;
      inspectCta: string;
      statuses: {
        draft: string;
        inprogress: string;
        complete: string;
        rejected: string;
      };
    };
    projectInspect: {
      heading: string;
      statusLabel: string;
      createdLabel: string;
      idLabel: string;
      copyIdAriaLabel: string;
      copySuccessToast: string;
      copyErrorToast: string;
      documentsHeading: string;
      fileInputLabel: string;
      uploadInProgress: string;
      dropzoneTitle: string;
      dropzoneHint: string;
      uploadQueueHeading: string;
      uploadStatusQueued: string;
      uploadStatusUploading: string;
      uploadStatusUploaded: string;
      uploadStatusFailed: string;
      emptyDocuments: string;
      loadingDocuments: string;
      loadError: string;
      uploadError: string;
      viewFileCta: string;
      deleteFileCta: string;
      deleteInProgress: string;
      deleteError: string;
      beDiligentCta: string;
      setupApiKeysMessage: string;
      setupApiKeysToast: string;
      diligenceStartToast: string;
    };
    projectCreation: {
      heading: string;
      description: string;
      nameLabel: string;
      namePlaceholder: string;
      filesLabel: string;
      filesHint: string;
      submitCta: string;
    };
  };
};
