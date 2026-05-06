import type { AppLabels, SupportedLocale } from "@/labels/types";
import { enLabels } from "@/labels/en";

const labelsByLocale: Record<SupportedLocale, AppLabels> = {
  en: enLabels,
};

export function getLabels(locale: SupportedLocale): AppLabels {
  return labelsByLocale[locale];
}

export function getLabelsForLocale(locale: string): {
  labels: AppLabels;
  locale: SupportedLocale;
} {
  const resolvedLocale: SupportedLocale = locale === "en" ? "en" : "en";

  return {
    locale: resolvedLocale,
    labels: getLabels(resolvedLocale),
  };
}
