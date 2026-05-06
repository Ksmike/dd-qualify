import type { AppLabels, SupportedLocale } from "@/labels/types";

const labelLoaders: Record<SupportedLocale, () => Promise<AppLabels>> = {
  en: async () => (await import("@/labels/en")).enLabels,
};

export async function getLabels(locale: SupportedLocale): Promise<AppLabels> {
  return labelLoaders[locale]();
}

export async function getLabelsForLocale(locale: string): Promise<{
  labels: AppLabels;
  locale: SupportedLocale;
}> {
  const resolvedLocale: SupportedLocale = locale === "en" ? "en" : "en";

  return {
    locale: resolvedLocale,
    labels: await getLabels(resolvedLocale),
  };
}
