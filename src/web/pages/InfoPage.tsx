import { Link, useNavigate } from "react-router-dom";
import { PageChrome } from "./PageChrome";

const sections = [
  {
    title: "Before You Start",
    lines: [
      "You must already know how to play Cluedo and keep the physical board in front of you.",
      "This app helps with deduction, but it does not move pieces, remember room access, or replace normal table discipline."
    ]
  },
  {
    title: "What The Web App Tracks",
    lines: [
      "Setup for every detective, your hand, prove direction, and card counts.",
      "Each recorded turn, proof chain, manual correction, undo or redo, and restorable game state.",
      "The live suspect pool, likely hands, and the final envelope once the engine can prove it."
    ]
  },
  {
    title: "Safety Features",
    lines: [
      "The active case is saved locally in this browser so refreshes do not wipe the game.",
      "The timeline lets you jump back to any saved turn or correction if you recorded something incorrectly.",
      "Manual edits still exist for board-side recovery when the physical game and the saved state drift apart."
    ]
  },
  {
    title: "Learn The Deduction Engine",
    lines: [
      "Open the detailed deduction guide for the exact tricks the solver uses, the best ways to feed the app, and the things you still need to handle manually at the table."
    ]
  },
  {
    title: "About",
    lines: [
      "Originally built as a NativeScript mobile app and now rewritten as a static React web application.",
      "Developer: Hari Rajesh. This repository now carries the web client, solver, audit timeline, and recovery workflow."
    ]
  }
];

export const InfoPage = () => {
  const navigate = useNavigate();

  return (
    <PageChrome
      background="board"
      actions={
        <button className="ghost-button" onClick={() => navigate(-1)}>
          Back
        </button>
      }
    >
      <div className="stack">
        <section className="panel info-card stack">
          <h1 className="section-title" style={{ margin: 0 }}>Instructions</h1>
          <p className="subtle" style={{ margin: 0 }}>
            Use this as a board-side assistant. Record each suggestion carefully, let the solver maintain the deduction grid,
            and use the timeline if you ever need to step back to an earlier saved state.
          </p>
          <div className="button-row">
            <Link className="button primary" to="/guide">
              Open Deduction Guide
            </Link>
          </div>
        </section>

        {sections.map((section) => (
          <section key={section.title} className="panel info-card stack">
            <h2 className="section-title">{section.title}</h2>
            {section.lines.map((line) => (
              <p key={line} className="subtle" style={{ margin: 0 }}>
                {line}
              </p>
            ))}
          </section>
        ))}
      </div>
    </PageChrome>
  );
};
