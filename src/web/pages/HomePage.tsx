import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDismissibleLayer } from "@/app/useDismissibleLayer";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PageChrome } from "./PageChrome";
import { useAppActions, useAppState } from "@/app/AppContext";

type HomeDialog = "replace" | "clear" | null;

export const HomePage = () => {
  const navigate = useNavigate();
  const { history } = useAppState();
  const { clearGame } = useAppActions();
  const hasSavedGame = Boolean(history.present);
  const [dialog, setDialog] = useState<HomeDialog>(null);

  useDismissibleLayer(Boolean(dialog), () => setDialog(null));

  const startNewGame = () => {
    if (hasSavedGame) {
      setDialog("replace");
      return;
    }

    navigate("/input");
  };

  const confirmReplace = () => {
    clearGame();
    setDialog(null);
    navigate("/input");
  };

  const confirmClear = () => {
    clearGame();
    setDialog(null);
  };

  return (
    <PageChrome background="home">
      <section className="hero-center">
        <div className="panel strong setup-card stack" style={{ width: "min(560px, 100%)" }}>
          <p className="subtle accent-font">Board-side deduction assistant</p>
          <h1 className="headline">Track every clue without losing the case.</h1>
          <p className="subtle">
            Keep the game board in front of you, feed each suggestion and proof into the app, and let the solver narrow
            the suspect, weapon, and room.
          </p>
          <div className="stack">
            <div className="button-row">
              <button className="button primary" onClick={startNewGame}>
                {hasSavedGame ? "Start Fresh Game" : "Start Game"}
              </button>
              <button className="ghost-button" onClick={() => navigate("/info")}>
                Instructions
              </button>
            </div>
            {hasSavedGame && (
              <div className="button-row">
                <button className="button success" onClick={() => navigate("/game")}>
                  Resume Saved Game
                </button>
                <button className="button danger" onClick={() => setDialog("clear")}>
                  Clear Saved Game
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {dialog === "replace" && (
        <ConfirmDialog
          title="Replace Saved Game?"
          confirmLabel="Start Fresh"
          tone="danger"
          onConfirm={confirmReplace}
          onCancel={() => setDialog(null)}
        >
          <p style={{ margin: 0 }}>
            Starting a fresh game will clear the one currently stored in this browser and return you to setup.
          </p>
        </ConfirmDialog>
      )}

      {dialog === "clear" && (
        <ConfirmDialog
          title="Clear Saved Game?"
          confirmLabel="Clear Game"
          tone="danger"
          onConfirm={confirmClear}
          onCancel={() => setDialog(null)}
        >
          <p style={{ margin: 0 }}>
            This removes the persisted game state from local storage so the next session starts clean.
          </p>
        </ConfirmDialog>
      )}
    </PageChrome>
  );
};
