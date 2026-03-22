import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useDismissibleLayer } from "@/app/useDismissibleLayer";
import { useAppActions, useAppState } from "@/app/AppContext";
import {
  CARD_DEFINITIONS,
  PLAY_ICON_PATH,
  QUESTION_TOKEN_IMAGE_PATH,
  TAB_LABELS,
  getCardDefinition,
  getTokenImagePath
} from "@/lib/constants";
import {
  ENVELOPE_OWNER_ID,
  getActivePlayer,
  getAuditTimelineEntries,
  getDetectiveKnowledgeSummaries,
  getGameSummaryLabel,
  getOwnerLabel,
  getPlayerHandView,
  getSolutionCardIds,
  getSuspectCardIds,
  getUserExposureCompactByCategory,
  getUserExposureSummary,
  isValidSuggestion,
  shouldShowSolutionScreen
} from "@/lib/game";
import type { CardId, GameState } from "@/lib/types";
import { PageChrome } from "./PageChrome";

type GameDialog = "solved" | null;

const OwnerLine = ({ game, cardId }: { game: GameState; cardId: CardId }) => {
  const ownerLabel = getOwnerLabel(game, game.cards[cardId].ownerId);
  const notOwnerLabels = game.cards[cardId].notOwnerIds.map(
    (playerId) => game.players.find((player) => player.id === playerId)?.name ?? playerId
  );

  return (
    <>
      <div className="meta-line">
        <strong>Owner:</strong>
        <span>{ownerLabel}</span>
      </div>
      <div className="meta-line">
        <strong>Not Owners:</strong>
        {notOwnerLabels.length > 0 ? notOwnerLabels.map((label) => <span key={label} className="tag">{label}</span>) : <span>None yet</span>}
      </div>
    </>
  );
};

const CardTile = ({
  cardId,
  selected,
  onClick,
  game,
  showStatus = true,
  allowManualEdit = false
}: {
  cardId: CardId;
  selected?: boolean;
  onClick?: () => void;
  game: GameState;
  showStatus?: boolean;
  allowManualEdit?: boolean;
}) => {
  const card = getCardDefinition(cardId);
  const isEnvelopeCard = showStatus && game.cards[cardId].ownerId === ENVELOPE_OWNER_ID;

  return (
    <article className={`card-tile ${selected ? "selected" : ""} ${onClick ? "clickable" : ""} ${isEnvelopeCard ? "resolved-envelope" : ""}`} onClick={onClick}>
      <Link to={`/img/${cardId}`} onClick={(event) => event.stopPropagation()}>
        <img className="card-thumb" src={getTokenImagePath(cardId)} alt={card.name} />
      </Link>
      <div className="card-meta">
        <div className="card-name">{card.name}</div>
        {selected && <div className="meta-line"><strong>Selected</strong></div>}
        {isEnvelopeCard && (
          <div className="meta-line">
            <span className="tag tag-success">Envelope Confirmed</span>
          </div>
        )}
        {showStatus && <OwnerLine game={game} cardId={cardId} />}
        {showStatus && (
          <div className="meta-line">
            <strong>Times Suspected:</strong>
            <span>{game.cards[cardId].suggestedCount}</span>
          </div>
        )}
        {allowManualEdit && <span className="subtle">Open to edit owner and not-owner deductions.</span>}
      </div>
    </article>
  );
};

export const GamePage = () => {
  const navigate = useNavigate();
  const { history, turnDraft, manualEdit } = useAppState();
  const actions = useAppActions();
  const [dialog, setDialog] = useState<GameDialog>(null);
  const previousSolutionReadyRef = useRef(Boolean(history.present?.solutionReady));

  const game = turnDraft?.game ?? history.present;

  useDismissibleLayer(Boolean(manualEdit || dialog), () => {
    if (dialog) {
      setDialog(null);
      return;
    }

    if (manualEdit) {
      actions.cancelManualEdit();
    }
  });

  useEffect(() => {
    const currentSolutionReady = Boolean(history.present?.solutionReady);

    if (currentSolutionReady && !previousSolutionReadyRef.current) {
      setDialog("solved");
    }

    previousSolutionReadyRef.current = currentSolutionReady;
  }, [history.present]);

  if (!game) {
    return <Navigate to="/home" replace />;
  }

  const activePlayer = getActivePlayer(game);
  const suspectCardIds = getSuspectCardIds(game);
  const solutionCardIds = getSolutionCardIds(game);
  const currentProver = turnDraft?.currentProverId
    ? game.players.find((player) => player.id === turnDraft.currentProverId) ?? null
    : null;
  const userMatchingCards = turnDraft
    ? turnDraft.suggestedCardIds.filter((cardId) => game.cards[cardId].ownerId === game.userPlayerId)
    : [];
  const canProceedSuggestion = turnDraft ? isValidSuggestion(turnDraft.suggestedCardIds) : false;
  const canContinueUserProof = userMatchingCards.length === 0 || Boolean(turnDraft?.shownCardId);
  const canConfirmObservedShownCard = Boolean(turnDraft?.shownCardId);
  const timelineEntries = useMemo(() => getAuditTimelineEntries(history), [history]);
  const exposureSummary = useMemo(() => getUserExposureSummary(game), [game]);
  const exposureByCategory = useMemo(() => getUserExposureCompactByCategory(game), [game]);
  const detectiveKnowledge = useMemo(() => getDetectiveKnowledgeSummaries(game), [game]);
  const currentAskingPlayerId = turnDraft?.step === "user-prove" ? activePlayer.id : null;

  const topbarActions = (
    <>
      <button className="ghost-button" onClick={() => navigate("/home")}>
        Home
      </button>
      <button className="ghost-button" onClick={actions.resetTurn} disabled={!turnDraft}>
        Reset Current Turn
      </button>
    </>
  );

  const renderEntityView = () => (
    <section className="stack">
      {CARD_DEFINITIONS.map((card) => (
        <CardTile
          key={card.id}
          cardId={card.id}
          game={game}
          allowManualEdit
          onClick={() => actions.openManualEdit(card.id)}
        />
      ))}
    </section>
  );

  const renderSuspectView = () => (
    <section className="stack">
      {game.solutionReady && (
        <section className="panel strong game-card stack suspect-warrant-panel">
          <h3 className="section-title" style={{ marginTop: 0 }}>
            {shouldShowSolutionScreen(game) ? "Warrant Ready" : "Warrant Locked In"}
          </h3>
          <p className="subtle" style={{ margin: 0 }}>
            {shouldShowSolutionScreen(game)
              ? "The deduction is complete and it is your turn. These are the three cards to accuse with."
              : "The deduction is complete. Keep following the table until play returns to you, then accuse with these three cards."}
          </p>
          {renderSolution()}
        </section>
      )}
      {!game.solutionReady && suspectCardIds.map((cardId) => (
        <CardTile key={cardId} cardId={cardId} game={game} />
      ))}
    </section>
  );

  const renderDetectiveView = () => (
    <section className="stack">
      {game.players.map((player) => {
        const hand = getPlayerHandView(game, player.id);
        const knowledge = detectiveKnowledge.find((entry) => entry.detectiveId === player.id) ?? null;
        return (
          <article key={player.id} className="panel game-card detective-card stack">
            <div>
              <h1 className="section-title" style={{ marginTop: 0 }}>
                {player.id === game.userPlayerId ? "You" : player.name}
              </h1>
            </div>
            {player.id === game.userPlayerId ? (
              <div className="exposure-grid user-hand-grid">
                {exposureSummary.byCard.map((entry) => {
                  const card = getCardDefinition(entry.cardId);
                  return (
                    <article key={entry.cardId} className="status-card user-exposure-card">
                      <Link to={`/img/${entry.cardId}`}>
                        <img className="card-thumb" src={getTokenImagePath(entry.cardId)} alt={card.name} />
                      </Link>
                      <div className="card-meta">
                        <div className="card-name">{card.name}</div>
                        <div className="meta-line">
                          <strong>Direct Reveals:</strong>
                          <span>{entry.exactRevealCount}</span>
                        </div>
                        <div className="meta-line">
                          <strong>Indirect Reveals:</strong>
                          <span>{entry.publicExposureTurnCount}</span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <>
                <div className="meta-line">
                  <strong>Cards we know they have:</strong>
                </div>
                <div className="detective-hand">
                  {hand.knownCardIds.map((cardId) => {
                    const card = getCardDefinition(cardId);
                    return (
                      <Link key={cardId} to={`/img/${cardId}`} className="thumb-only">
                        <img src={getTokenImagePath(cardId)} alt={card.name} />
                        <span className="subtle">{card.name}</span>
                      </Link>
                    );
                  })}
                  {Array.from({ length: hand.unknownSlots }).map((_, index) => (
                    <div key={`${player.id}-unknown-${index}`} className="thumb-only">
                      <img src={QUESTION_TOKEN_IMAGE_PATH} alt="Unknown card" />
                      <span className="subtle">Unknown</span>
                    </div>
                  ))}
                </div>
                {knowledge && (
                  <>
                    <div className="meta-line">
                      <strong>Cards we suspect they may have:</strong>
                      {knowledge.proofMemories.length > 0
                        ? knowledge.proofMemories.map((memory, index) => (
                            <span key={`${player.id}:memory:${index}`} className="tag">
                              {memory.candidateCardIds.map((cardId) => getCardDefinition(cardId).name).join(", ")}
                            </span>
                          ))
                        : <span>None</span>}
                    </div>
                    <div className="meta-line">
                      <strong>Cards we know they don't have:</strong>
                      {
                        Object.keys(game.cards).map(
                          (cardId) => game.cards[cardId].notOwnerIds.includes(player.id) &&
                          <span key={`${player.id}:donthave:${cardId}`} className="tag">
                            {getCardDefinition(cardId).name}
                          </span>
                        )
                      }
                    </div>
                    <br/>
                    <div className="meta-line">
                      <strong>Cards they know you have:</strong>
                      {knowledge.exactCardIds.length > 0
                        ? knowledge.exactCardIds.map((cardId) => <span key={`${player.id}:known:${cardId}`} className="tag">{getCardDefinition(cardId).name}</span>)
                        : <span>None</span>}
                    </div>
                    <div className="meta-line">
                      <strong>Cards they suspect you may have:</strong>
                      {knowledge.publicExposureCounts.length > 0
                        ? knowledge.publicExposureCounts.map((entry) => (
                            <span key={`${player.id}:public:${entry.cardId}`} className="tag">
                              {getCardDefinition(entry.cardId).name} x{entry.count}
                            </span>
                          ))
                        : <span>None</span>}
                    </div>
                    <div className="meta-line">
                      <strong>Cards they know you don't have:</strong>
                      {knowledge.knownNotOwnerCardIds.length > 0
                        ? knowledge.knownNotOwnerCardIds.map((cardId) => (
                            <span key={`${player.id}:not-owner:${cardId}`} className="tag">
                              {getCardDefinition(cardId).name}
                            </span>
                          ))
                        : <span>None</span>}
                    </div>
                  </>
                )}
              </>
            )}
          </article>
        );
      })}
    </section>
  );

  const renderAuditView = () => (
    <section className="stack">
      <section className="panel game-card stack">
        <div>
          <h3 className="section-title" style={{ marginTop: 0 }}>Timeline</h3>
          <p className="subtle" style={{ marginBottom: 0 }}>
            One saved entry exists for setup, every committed turn, and every manual correction. Restore any entry to jump
            back to that exact deduction state. Proof memories are folded into the change list for the turn where
            they were learned or resolved.
          </p>
        </div>
        {timelineEntries.length > 0 ? (
          <div className="audit-list">
            {timelineEntries.map((entry) => (
              <article key={entry.id} className={`audit-entry stack ${entry.isCurrent ? "current" : ""}`}>
                <div className="audit-header">
                  <div className="audit-meta">
                    <span className="tag">{entry.kind}</span>
                    <span className="subtle">{new Date(entry.recordedAt).toLocaleString()}</span>
                    {entry.isCurrent && <span className="tag audit-current-tag">Current</span>}
                  </div>
                  {!entry.isCurrent && (
                    <button className="ghost-button audit-restore-button" onClick={() => actions.restoreHistory(entry.snapshotIndex)}>
                      Restore This State
                    </button>
                  )}
                </div>
                <div className="card-name">{entry.title}</div>
                <p className="audit-summary" style={{ margin: 0 }}>{entry.summary}</p>
                <p className="subtle" style={{ margin: 0 }}>{entry.reasoning}</p>
                {entry.changeLines.length > 0 && (
                  <div className="audit-change-list">
                    {entry.changeLines.map((line, index) => (
                      <p key={`${entry.id}:${index}`} className="subtle audit-change-line">
                        - {line}
                      </p>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : <p className="subtle empty-state">No saved states yet.</p>}
      </section>
    </section>
  );

  const renderGameBoard = () => (
    <div className="stack">
      <section className="panel game-card stack">
        <div className="banner">
          <h2 className="section-title" style={{ marginTop: 0 }}>
            {activePlayer.id === game.userPlayerId ? "Your Turn" : `${activePlayer.name}'s Turn`}
          </h2>
          <p className="subtle" style={{ marginBottom: 0 }}>
            {getGameSummaryLabel(game)}
          </p>
        </div>
        {history.future.length > 0 && (
          <div className="banner">
            You are viewing an earlier saved state. Starting a new turn or saving a manual correction will discard {history.future.length} newer state{history.future.length === 1 ? "" : "s"}.
          </div>
        )}
        <div className="tabs">
          {Object.entries(TAB_LABELS).map(([tab, label]) => (
            <button
              key={tab}
              className={`tab ${game.selectedTab === tab ? "active" : ""}`}
              onClick={() => actions.setTab(tab as GameState["selectedTab"])}
            >
              {label}
            </button>
          ))}
        </div>
        {game.selectedTab === "entity" && renderEntityView()}
        {game.selectedTab === "suspect" && renderSuspectView()}
        {game.selectedTab === "detective" && renderDetectiveView()}
        {game.selectedTab === "audit" && renderAuditView()}
      </section>
      <button className="fab" onClick={actions.startTurn} aria-label={game.solutionReady ? "Show solved suspect view" : "Start the next turn"} disabled={Boolean(turnDraft || manualEdit)}>
        <img src={PLAY_ICON_PATH} alt="Play" />
      </button>
    </div>
  );

  const renderSuggestionSelection = () => (
    <section className="panel game-card stack">
      <div className="banner">
        <h2 className="section-title" style={{ marginTop: 0 }}>
          {activePlayer.id === game.userPlayerId ? "Your turn" : `${activePlayer.name}'s turn`}
        </h2>
        <p className="subtle" style={{ marginBottom: 0 }}>
          Select one suspect, one weapon, and one room for this suggestion.
        </p>
      </div>
      <div className="button-row">
        <button className="button primary" onClick={actions.proceedTurnSelection} disabled={!canProceedSuggestion}>
          Proceed
        </button>
        <button className="button danger" onClick={actions.skipTurn}>
          Skip Turn
        </button>
      </div>
      {activePlayer.id === game.userPlayerId && (
        <section className="banner stack">
          <div>
            <h3 className="section-title" style={{ margin: 0 }}>What The Table Knows About Your Cards</h3>
          </div>
          <div className="exposure-grid user-hand-grid">
            {exposureSummary.byCard.map((entry) => {
              const card = getCardDefinition(entry.cardId);
              return (
                <article key={entry.cardId} className="status-card user-exposure-card">
                  <Link to={`/img/${entry.cardId}`}>
                    <img className="card-thumb" src={getTokenImagePath(entry.cardId)} alt={card.name} />
                  </Link>
                  <div className="card-meta">
                    <div className="card-name">{card.name}</div>
                    <div className="meta-line">
                      <strong>Direct Reveals:</strong>
                      <span>{entry.exactRevealCount}</span>
                    </div>
                    <div className="meta-line">
                      <strong>Indirect Reveals:</strong>
                      <span>{entry.publicExposureTurnCount}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
      <div className="card-list">
        {CARD_DEFINITIONS.map((card) => (
          <CardTile
            key={card.id}
            cardId={card.id}
            game={game}
            showStatus={false}
            selected={turnDraft?.suggestedCardIds.includes(card.id)}
            onClick={() => actions.toggleSuggestedCard(card.id)}
          />
        ))}
      </div>
    </section>
  );

  const renderProofQuestion = () => (
    <section className="panel game-card stack">
      <h2 className="section-title" style={{ marginTop: 0 }}>
        {currentProver?.name} must prove
      </h2>
      <p className="subtle" style={{ marginTop: 0 }}>
        Did {currentProver?.name} show one of the suggested cards?
      </p>
      <div className="button-row">
        <button className="button success" onClick={actions.turnProofYes}>
          Yes
        </button>
        <button className="button danger" onClick={actions.turnProofNo}>
          No
        </button>
      </div>
    </section>
  );

  const renderUserProof = () => (
    <section className="panel game-card stack">
      <h2 className="section-title" style={{ marginTop: 0 }}>You Must Prove</h2>
      <p className="subtle" style={{ marginTop: 0 }}>{turnDraft?.userMessage}</p>
      {userMatchingCards.length > 0 ? (
        <div className="card-list">
          {userMatchingCards.map((cardId) => {
            const card = getCardDefinition(cardId);
            const exposureEntry = exposureSummary.byCard.find((entry) => entry.cardId === cardId);
            const exactViewerIds = exposureEntry?.exactViewerIds ?? [];
            const otherExactViewers = exactViewerIds.filter((playerId) => playerId !== currentAskingPlayerId);
            const alreadyShownToAsker = currentAskingPlayerId ? exactViewerIds.includes(currentAskingPlayerId) : false;

            return (
              <article
                key={cardId}
                className={`status-card clickable ${turnDraft?.shownCardId === cardId ? "selected" : ""}`}
                onClick={() => actions.setShownCard(cardId)}
              >
                <Link to={`/img/${cardId}`} className="thumb-only" onClick={(event) => event.stopPropagation()}>
                  <img src={getTokenImagePath(cardId)} alt={card.name} />
                  <span className="subtle">{card.name}</span>
                </Link>
                <div className="card-meta">
                  <div className="card-name">{card.name}</div>
                  <div className="meta-line">
                    <span className={`tag ${alreadyShownToAsker ? "tag-accent" : "tag-success"}`}>
                      {currentAskingPlayerId
                        ? alreadyShownToAsker
                          ? `Already shown to ${activePlayer.name}`
                          : `New to ${activePlayer.name}`
                        : "Selectable"}
                    </span>
                    {turnDraft?.shownCardId === cardId && <span className="tag tag-success">Selected</span>}
                  </div>
                  <div className="meta-line">
                    <strong>Direct Reveals:</strong>
                    <span>{otherExactViewers.length}</span>
                  </div>
                  <div className="meta-line">
                    <strong>Indirect Reveals:</strong>
                    <span>{exposureEntry?.publicExposureTurnCount ?? 0}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="subtle" style={{ margin: 0 }}>You do not hold any of the suggested cards.</p>
      )}
      <div className="button-row">
        <button className="button primary" onClick={actions.turnUserContinue} disabled={!canContinueUserProof}>
          {userMatchingCards.length > 0 ? "Confirm Shown Card" : "Continue"}
        </button>
      </div>
    </section>
  );

  const renderShownCardSelection = () => (
    <section className="panel game-card stack">
      <h2 className="section-title" style={{ marginTop: 0 }}>What card was shown?</h2>
      <div className="button-row">
        <button className="button primary" onClick={actions.confirmShownCard} disabled={!canConfirmObservedShownCard}>
          Confirm
        </button>
      </div>
      <div className="card-list">
        {turnDraft?.suggestedCardIds.map((cardId) => (
          <CardTile
            key={cardId}
            cardId={cardId}
            game={game}
            showStatus={false}
            selected={turnDraft.shownCardId === cardId}
            onClick={() => actions.setShownCard(cardId)}
          />
        ))}
      </div>
    </section>
  );

  const renderTurnFlow = () => {
    if (!turnDraft) {
      return null;
    }

    if (turnDraft.step === "select") {
      return renderSuggestionSelection();
    }

    if (turnDraft.step === "ask") {
      return renderProofQuestion();
    }

    if (turnDraft.step === "user-prove") {
      return renderUserProof();
    }

    return renderShownCardSelection();
  };

  const renderManualEdit = () => {
    if (!manualEdit) {
      return null;
    }

    const card = getCardDefinition(manualEdit.cardId);
    return (
      <div className="overlay-backdrop" onClick={actions.cancelManualEdit} role="presentation">
        <section
          className="panel strong game-card stack overlay-panel"
          role="dialog"
          aria-modal="true"
          aria-label={`Master edit ${card.name}`}
          onClick={(event) => event.stopPropagation()}
        >
          <h2 className="section-title" style={{ marginTop: 0 }}>Master Edit {card.name}</h2>
          <p className="subtle" style={{ marginTop: 0 }}>
            Changes stay in this draft until you press save. Press Escape or use the device back button to close this popup.
          </p>
          <div className="button-row">
            <button className={`tab ${manualEdit.mode === "menu" ? "active" : ""}`} onClick={() => actions.setManualMode("menu")}>Menu</button>
            <button className={`tab ${manualEdit.mode === "owner" ? "active" : ""}`} onClick={() => actions.setManualMode("owner")}>Edit Owner</button>
            <button className={`tab ${manualEdit.mode === "notOwners" ? "active" : ""}`} onClick={() => actions.setManualMode("notOwners")}>Edit Not Owners</button>
          </div>
          {manualEdit.mode === "menu" && (
            <div className="banner">
              Choose whether you want to override the confirmed owner or the detectives who definitely do not own this card.
            </div>
          )}
          {manualEdit.mode === "owner" && (
            <div className="card-list">
              {game.players.map((player) => (
                <article
                  key={player.id}
                  className={`status-card clickable ${manualEdit.ownerId === player.id ? "selected" : ""}`}
                  onClick={() => actions.toggleManualOwner(player.id)}
                >
                  <div className="card-meta">
                    <div className="card-name">{player.name}</div>
                    <div className="meta-line">
                      <span className="tag">{player.cardCount} cards</span>
                      {manualEdit.ownerId === player.id && <strong>Selected</strong>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
          {manualEdit.mode === "notOwners" && (
            <div className="card-list">
              {game.players.map((player) => (
                <article
                  key={player.id}
                  className={`status-card clickable ${manualEdit.notOwnerIds.includes(player.id) ? "selected" : ""}`}
                  onClick={() => actions.toggleManualNotOwner(player.id)}
                >
                  <div className="card-meta">
                    <div className="card-name">{player.name}</div>
                    <div className="meta-line">
                      {manualEdit.notOwnerIds.includes(player.id) && <strong>Selected</strong>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
          <div className="button-row">
            <button className="button primary" onClick={actions.saveManualEdit} disabled={manualEdit.mode === "menu"}>Save Edit</button>
            <button className="ghost-button" onClick={actions.cancelManualEdit}>Cancel</button>
          </div>
        </section>
      </div>
    );
  };

  const renderSolution = () => (
    <section className="panel strong game-card stack">
      <h1 className="headline">Here Is the Warrant for Arrest</h1>
      <p className="subtle" style={{ marginTop: 0 }}>The game is solved. These are the cards that must be in the envelope.</p>
      <div className="solution-grid">
        {solutionCardIds.map((cardId) => (
          <article key={cardId} className="panel setup-card stack" style={{ alignItems: "center" }}>
            <img className="card-thumb" src={getTokenImagePath(cardId)} alt={getCardDefinition(cardId).name} />
            <div className="card-name" style={{ textAlign: "center" }}>{getCardDefinition(cardId).name}</div>
          </article>
        ))}
      </div>
    </section>
  );

  const renderSolvedDialog = () => (
    <div className="overlay-backdrop" onClick={() => setDialog(null)} role="presentation">
      <section
        className="panel strong game-card stack overlay-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Envelope solved"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="section-title" style={{ marginTop: 0 }}>Envelope Solved</h2>
        <p className="subtle" style={{ margin: 0 }}>
          The deduction engine is now certain about the suspect, weapon, and room.
          {shouldShowSolutionScreen(game)
            ? " It is your turn, so you can make the accusation now."
            : " Keep tracking play until the turn comes back to you, and the solved suspect view will stay visible then."}
        </p>
        <div className="solution-grid">
          {solutionCardIds.map((cardId) => (
            <article key={`dialog:${cardId}`} className="panel setup-card stack" style={{ alignItems: "center" }}>
              <img className="card-thumb" src={getTokenImagePath(cardId)} alt={getCardDefinition(cardId).name} />
              <div className="card-name" style={{ textAlign: "center" }}>{getCardDefinition(cardId).name}</div>
            </article>
          ))}
        </div>
        <div className="button-row">
          <button className="button success" onClick={() => setDialog(null)}>
            Continue
          </button>
        </div>
      </section>
    </div>
  );

  return (
    <PageChrome background="board" actions={topbarActions}>
      <div className="stack">
        {!turnDraft && renderGameBoard()}
        {turnDraft && renderTurnFlow()}
      </div>

      {manualEdit && renderManualEdit()}

      {dialog === "solved" && renderSolvedDialog()}
    </PageChrome>
  );
};
