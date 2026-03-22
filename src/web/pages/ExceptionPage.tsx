import { useNavigate } from "react-router-dom";
import { PageChrome } from "./PageChrome";
import { useAppActions, useAppState } from "@/app/AppContext";

export const ExceptionPage = () => {
  const navigate = useNavigate();
  const { exception, history } = useAppState();
  const { clearException } = useAppActions();

  const goHome = () => {
    clearException();
    navigate("/home");
  };

  const goBackToGame = () => {
    clearException();
    navigate(history.present ? "/game" : "/home");
  };

  return (
    <PageChrome background="board">
      <section className="panel strong setup-card stack" style={{ width: "min(760px, 100%)", margin: "0 auto" }}>
        <h1 className="headline">Case Interrupted</h1>
        <p className="error-copy">{exception?.message ?? "This case hit an unexpected contradiction."}</p>
        <p className="subtle">
          Review the last move, use undo if needed, or return to the game and fix the data using manual edit.
        </p>
        <div className="button-row">
          <button className="button primary" onClick={goBackToGame}>
            Return to Case
          </button>
          <button className="ghost-button" onClick={goHome}>
            Home
          </button>
        </div>
      </section>
    </PageChrome>
  );
};
