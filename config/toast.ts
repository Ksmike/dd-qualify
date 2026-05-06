import type { ToastProviderProps } from "@heroui/react";

/**
 * Centralized toast configuration.
 * Import this wherever ToastProvider is rendered so all toast behavior
 * is controlled from one place.
 */
export const toastConfig: Partial<ToastProviderProps> = {
  placement: "bottom end",
};
