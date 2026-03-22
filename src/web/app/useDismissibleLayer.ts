import { useEffect } from "react";
import { useBlocker } from "react-router-dom";

export const useDismissibleLayer = (active: boolean, onDismiss: () => void): void => {
  const blocker = useBlocker(({ historyAction }) => active && historyAction === "POP");

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      onDismiss();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [active, onDismiss]);

  useEffect(() => {
    if (blocker.state !== "blocked") {
      return;
    }

    onDismiss();
    blocker.reset?.();
  }, [blocker, onDismiss]);
};
