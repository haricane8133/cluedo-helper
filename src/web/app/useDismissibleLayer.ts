import { useEffect, useRef } from "react";

export const useDismissibleLayer = (active: boolean, onDismiss: () => void): void => {
  const ignoreNextPopRef = useRef(false);

  useEffect(() => {
    if (!active || typeof window === "undefined") {
      return undefined;
    }

    const sentinelKey = `dismissible:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    window.history.pushState({ ...window.history.state, dismissibleLayerKey: sentinelKey }, "", window.location.href);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      onDismiss();
    };

    const handlePopState = () => {
      if (ignoreNextPopRef.current) {
        ignoreNextPopRef.current = false;
        return;
      }

      onDismiss();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("popstate", handlePopState);

      if (window.history.state?.dismissibleLayerKey === sentinelKey) {
        ignoreNextPopRef.current = true;
        window.history.back();
      }
    };
  }, [active, onDismiss]);
};
