"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function buildRouteKey(pathname: string, search: string): string {
  return search ? `${pathname}?${search}` : pathname;
}

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);

  const routeKey = useMemo(() => {
    const search = searchParams?.toString() ?? "";
    return buildRouteKey(pathname, search);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (isNavigating) {
      setIsNavigating(false);
    }
  }, [routeKey, isNavigating]);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      if (anchor.target && anchor.target !== "_self") {
        return;
      }
      if (anchor.hasAttribute("download")) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) {
        return;
      }

      const nextUrl = new URL(anchor.href, window.location.href);
      if (nextUrl.origin !== window.location.origin) {
        return;
      }

      const nextRouteKey = buildRouteKey(nextUrl.pathname, nextUrl.search.slice(1));
      if (nextRouteKey === routeKey) {
        return;
      }

      setIsNavigating(true);
    }

    document.addEventListener("click", handleDocumentClick, true);
    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [routeKey]);

  if (!isNavigating) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      data-testid="navigation-progress"
      className="pointer-events-none fixed inset-x-0 top-0 z-[120] h-0.5 overflow-hidden bg-primary/20"
    >
      <div className="h-full w-1/3 bg-primary/90 animate-[ddq-nav-progress_1s_ease-in-out_infinite]" />
    </div>
  );
}
