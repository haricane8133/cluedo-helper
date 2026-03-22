import { useNavigate } from "react-router-dom";
import { PageChrome } from "./PageChrome";

const sections = [
  {
    title: "Direct Facts The Engine Uses",
    lines: [
      "If a detective directly shows you a card, that card is locked to that detective immediately.",
      "If a detective says no to a suggestion, the engine marks that detective as impossible for all three suggested cards.",
      "If every detective is ruled out for a card, that card must be in the envelope.",
      "If only one card in a category can still be in the envelope, the engine closes that category automatically."
    ]
  },
  {
    title: "Direct Proof Collapse",
    lines: [
      "When a detective proves a suggestion and two of the three cards are already impossible for them, the remaining card becomes confirmed immediately.",
      "This is the fast path where a prove result directly collapses to one card because the board already ruled the other two out."
    ]
  },
  {
    title: "Proof Memory / Indirect Reveal",
    lines: [
      "When a detective proves a suggestion but the exact card is unknown, the engine remembers that they must own one of those candidate cards.",
      "Later eliminations can shrink that remembered set until only one card remains, at which point the engine resolves ownership automatically.",
      "Open proof memories are summarized in the timeline section so you can see what unresolved proof memory is still influencing deductions."
    ]
  },
  {
    title: "Exposure Memory / Direct Reveal",
    lines: [
      "When you prove a suggestion, the app now remembers which detective definitely saw the exact card you chose.",
      "It also counts how often one of your cards was part of a public proof that other detectives could observe.",
      "Use the Detective View and the prove dialog to avoid accidentally teaching the table more about your hand than necessary."
    ]
  },
  {
    title: "Hand Size Constraints",
    lines: [
      "The solver respects each detective's hand size from setup.",
      "Once enough cards are confirmed for a detective to fill their full hand, the remaining unknown cards cannot be assigned to them.",
      "This indirectly strengthens direct proof collapse, proof memory resolution, and envelope deductions because impossible ownership options disappear sooner."
    ]
  },
  {
    title: "Best Practices",
    lines: [
      "Enter each suggestion in the exact table order and keep the prove direction correct from the start.",
      "Only mark an exact shown card when you truly saw the card yourself. For other detectives proving to one another, record only yes or no.",
      "Use the timeline after every suspicious entry. If something feels wrong, restore the last good state before layering manual edits on top.",
      "Keep player names unique and realistic so the audit timeline remains readable during long games."
    ]
  },
  {
    title: "What You Still Need To Do Manually",
    lines: [
      "Choose good suggestions at the table. The solver does not tell you the strongest move to make from your current room.",
      "Track physical movement, room reachability, and whether a human player may be bluffing or forgetting the table flow.",
      "Notice social clues or board-state opportunities that are outside the card-ownership logic. The engine only reasons about the information you explicitly record."
    ]
  },
  {
    title: "How To Recover From Mistakes",
    lines: [
      "Use undo or redo for normal turn-by-turn corrections.",
      "Use the timeline to jump back to any saved turn or manual correction when the mistake happened further back.",
      "Use manual edit only when the physical game gave you a fact that the normal turn flow could not represent cleanly."
    ]
  }
];

export const GuidePage = () => {
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
          <h1 className="section-title" style={{ margin: 0 }}>Deduction Guide</h1>
          <p className="subtle" style={{ margin: 0 }}>
            This page describes the deduction rules inside the solver and the table habits that make the web app most effective during real play.
          </p>
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
