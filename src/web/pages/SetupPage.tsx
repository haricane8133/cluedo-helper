import { useEffect, useMemo } from "react";
import { useBlocker, useNavigate } from "react-router-dom";
import { PageChrome } from "./PageChrome";
import { CARD_DEFINITIONS, CATEGORY_LABELS, getTokenImagePath } from "@/lib/constants";
import { useAppActions, useAppState } from "@/app/AppContext";
import { getSetupStepErrors, isStepValid, sanitizeSetupDraft } from "@/lib/game";
import type { SetupDraft } from "@/lib/types";

const STEP_LABELS = ["Population", "Names", "Cards", "Your Hand"];

const buildSetup = (setup: SetupDraft, updates: Partial<SetupDraft>): SetupDraft => sanitizeSetupDraft({ ...setup, ...updates });

export const SetupPage = () => {
  const navigate = useNavigate();
  const { setup } = useAppState();
  const { setSetup, startGame } = useAppActions();
  const stepBackBlocker = useBlocker(({ historyAction }) => setup.step > 1 && historyAction === "POP");

  const errors = useMemo(() => getSetupStepErrors(setup, setup.step), [setup]);

  const updateSetup = (updates: Partial<SetupDraft>) => setSetup(buildSetup(setup, updates));

  useEffect(() => {
    if (stepBackBlocker.state !== "blocked") {
      return;
    }

    updateSetup({ step: setup.step - 1 });
    stepBackBlocker.reset?.();
  }, [setup.step, stepBackBlocker]);

  const updatePlayerName = (index: number, value: string) => {
    const nextNames = [...setup.playerNames];
    nextNames[index] = value;
    updateSetup({ playerNames: nextNames });
  };

  const updatePlayerCardCount = (index: number, value: string) => {
    const nextCounts = [...setup.playerCardCounts];
    nextCounts[index] = value.replace(/[^0-9]/g, "");
    updateSetup({ playerCardCounts: nextCounts });
  };

  const toggleSelectedCard = (cardId: string) => {
    const userCardCount = Number(setup.playerCardCounts[setup.playerPos - 1] || 0);
    const exists = setup.selectedCardIds.includes(cardId);
    const nextSelected = exists
      ? setup.selectedCardIds.filter((entry) => entry !== cardId)
      : setup.selectedCardIds.length < userCardCount
        ? [...setup.selectedCardIds, cardId]
        : setup.selectedCardIds;
    updateSetup({ selectedCardIds: nextSelected });
  };

  const goNext = () => {
    if (setup.step < 4) {
      updateSetup({ step: setup.step + 1 });
      return;
    }

    startGame();
    navigate("/game", { replace: true });
  };

  const goPrevious = () => {
    if (setup.step === 1) {
      navigate("/home");
      return;
    }
    updateSetup({ step: setup.step - 1 });
  };

  const renderPopulationStep = () => (
    <section className="panel setup-card stack">
      <h1 className="section-title">Detective Population Details</h1>
      <div className="grid two">
        <label className="field">
          <span>Number of Detectives</span>
          <input
            type="range"
            min={3}
            max={6}
            value={setup.noPlayers}
            onChange={(event) => updateSetup({ noPlayers: Number(event.target.value), playerPos: 1 })}
          />
          <strong>{setup.noPlayers}</strong>
        </label>
        <label className="field">
          <span>Your Position</span>
          <input
            type="range"
            min={1}
            max={setup.noPlayers}
            value={setup.playerPos}
            onChange={(event) => updateSetup({ playerPos: Number(event.target.value) })}
          />
          <strong>{setup.playerPos}</strong>
        </label>
      </div>
      <label className="field">
        <span>Prove Direction</span>
        <select
          value={setup.proveDirection}
          onChange={(event) => updateSetup({ proveDirection: event.target.value as SetupDraft["proveDirection"] })}
        >
          <option value="clockwise">Clockwise / standard Cluedo order</option>
          <option value="counterclockwise">Counterclockwise / reverse order</option>
        </select>
      </label>
    </section>
  );

  const renderNamesStep = () => (
    <section className="panel setup-card stack">
      <h1 className="section-title">Detective Names</h1>
      <div className="grid two">
        {Array.from({ length: setup.noPlayers }).map((_, index) => (
          <label key={index} className="field">
            <span>{index === setup.playerPos - 1 ? "Your Name" : `Detective ${index + 1}`}</span>
            <input value={setup.playerNames[index] ?? ""} onChange={(event) => updatePlayerName(index, event.target.value)} />
          </label>
        ))}
      </div>
    </section>
  );

  const renderCardCountsStep = () => (
    <section className="panel setup-card stack">
      <h1 className="section-title">Cards with Detectives</h1>
      <div className="grid two">
        {Array.from({ length: setup.noPlayers }).map((_, index) => (
          <label key={index} className="field">
            <span>{index === setup.playerPos - 1 ? "Cards with you" : `Cards with Detective ${index + 1}`}</span>
            <input
              inputMode="numeric"
              maxLength={2}
              value={setup.playerCardCounts[index] ?? ""}
              onChange={(event) => updatePlayerCardCount(index, event.target.value)}
            />
          </label>
        ))}
      </div>
      <p className="subtle" style={{ margin: 0 }}>
        The total dealt cards must add up to 18.
      </p>
    </section>
  );

  const renderHandStep = () => (
    <section className="panel setup-card stack">
      <h1 className="section-title">Reveal Your Cards</h1>
      <p className="subtle" style={{ margin: 0 }}>
        Select exactly {Number(setup.playerCardCounts[setup.playerPos - 1] || 0)} cards from your hand.
      </p>
      <div className="card-list">
        {CARD_DEFINITIONS.map((card) => {
          const selected = setup.selectedCardIds.includes(card.id);
          return (
            <article key={card.id} className={`card-tile clickable ${selected ? "selected" : ""}`} onClick={() => toggleSelectedCard(card.id)}>
              <img className="card-thumb" src={getTokenImagePath(card.id)} alt={card.name} />
              <div className="card-meta">
                <div className="card-name">{card.name}</div>
                <div className="meta-line">
                  <span className="tag">{CATEGORY_LABELS[card.category]}</span>
                  {selected && <strong>Selected</strong>}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );

  return (
    <PageChrome
      background="board"
      actions={
        <>
          <button className="ghost-button" onClick={goPrevious}>
            {setup.step === 1 ? "Cancel" : "Previous"}
          </button>
          <button className="button primary" onClick={goNext} disabled={!isStepValid(setup, setup.step)}>
            {setup.step === 4 ? "Start" : "Next"}
          </button>
        </>
      }
    >
      <div className="step-indicator">
        {STEP_LABELS.map((label, index) => (
          <div key={label} className={`step-pill ${setup.step === index + 1 ? "active" : ""}`}>
            {index + 1}. {label}
          </div>
        ))}
      </div>

      <div className="stack">
        {setup.step === 1 && renderPopulationStep()}
        {setup.step === 2 && renderNamesStep()}
        {setup.step === 3 && renderCardCountsStep()}
        {setup.step === 4 && renderHandStep()}

        {errors.length > 0 && (
          <section className="panel info-card stack">
            <h2 className="section-title">Check These Details</h2>
            {errors.map((error) => (
              <p key={error} className="subtle" style={{ margin: 0 }}>
                {error}
              </p>
            ))}
          </section>
        )}
      </div>
    </PageChrome>
  );
};
