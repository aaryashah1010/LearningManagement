import { useEffect } from "react";

// AppShell renders exactly one <main> per page as the app's scroll container
// (see components/layout/app-shell.tsx) — every page-level infinite list lives
// inside it, so watching its scroll position is simpler and more reliable
// than an IntersectionObserver sentinel against the viewport, which doesn't
// fire consistently for elements clipped by a nested overflow container.
export function useInfiniteScrollSentinel(onLoadMore: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const main = document.querySelector("main");
    if (!main) return;

    function handleScroll() {
      if (!main) return;
      if (main.scrollHeight - main.scrollTop - main.clientHeight < 200) onLoadMore();
    }
    main.addEventListener("scroll", handleScroll);
    return () => main.removeEventListener("scroll", handleScroll);
  }, [onLoadMore, enabled]);
}
