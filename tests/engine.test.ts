import test from "node:test";
import assert from "node:assert/strict";
import {
  applyManualEdit,
  applyProofNo,
  applyProofYes,
  applyProofShown,
  completeShownCard,
  continueAfterProofNo,
  continueAfterUserProof,
  commitTurn,
  createGameFromSetup,
  createManualEditDraft,
  createTurnDraft,
  setSelectedTab,
  getSetupStepErrors,
  getAuditTimelineEntries,
  getEnvelopeCardIdForCategory,
  getDetectiveKnowledgeSummary,
  getUserExposureSummary
} from "../src/web/lib/game";
import type { HistoryState, SetupDraft } from "../src/web/lib/types";

const createSetup = (overrides: Partial<SetupDraft> = {}): SetupDraft => ({
  noPlayers: 3,
  playerPos: 1,
  step: 4,
  proveDirection: "clockwise",
  playerNames: ["Hari", "Asha", "Nikhil"],
  playerCardCounts: ["6", "6", "6"],
  selectedCardIds: [
    "suspect-0",
    "weapon-0",
    "room-0",
    "suspect-1",
    "weapon-1",
    "room-1"
  ],
  ...overrides
});

test("proof memory resolves after later eliminations", () => {
  const game = createGameFromSetup(createSetup());
  const ashaId = game.players[1]!.id;
  const nikhilId = game.players[2]!.id;
  const candidateCards = ["suspect-2", "weapon-2", "room-2"] as const;

  applyProofYes(game, ashaId, [...candidateCards]);
  assert.equal(game.cards["suspect-2"].ownerId, null);
  assert.equal(game.proofs.length, 1);

  applyProofNo(game, ashaId, ["suspect-2", "weapon-5", "room-8"]);
  applyProofNo(game, ashaId, ["weapon-2", "suspect-5", "room-7"]);

  assert.equal(game.cards["room-2"].ownerId, ashaId);
  assert.equal(game.cards["suspect-2"].notOwnerIds.includes(ashaId), true);
  assert.equal(game.cards["weapon-2"].notOwnerIds.includes(ashaId), true);
  assert.equal(game.auditLog.some((entry) => entry.summary.includes("must have")), true);
  assert.equal(game.proofs.length, 1);

  applyProofShown(game, nikhilId, "room-3");
  assert.equal(game.cards["room-3"].ownerId, nikhilId);
});

test("turn timeline summarizes the turn event and the board changes it caused", () => {
  const initial = createGameFromSetup(createSetup());
  const playerTwo = initial.players[1]!.id;
  const draft = createTurnDraft(initial);

  draft.step = "ask";
  draft.suggestedCardIds = ["suspect-2", "weapon-2", "room-2"];
  draft.currentProverId = playerTwo;

  applyProofNo(draft.game, playerTwo, draft.suggestedCardIds);
  draft.eventLog = ["Asha could not prove the suggestion."];

  const afterTurn = commitTurn(draft.game, draft);
  const history: HistoryState = {
    past: [initial],
    present: afterTurn,
    future: []
  };

  const entries = getAuditTimelineEntries(history);
  assert.equal(entries.length, 2);
  assert.equal(entries[0]!.summary.includes("suggested"), true);
  assert.equal(entries[0]!.reasoning.includes("Asha could not prove the suggestion."), true);
  assert.equal(entries[0]!.changeLines.some((line) => line.includes("could not prove")), false);
  assert.equal(entries[0]!.changeLines.some((line) => line.includes("ruled out for Asha")), true);
  assert.equal(entries[1]!.title, "Setup");
});

test("detective knowledge summary includes exact sightings and proof memories", () => {
  const game = createGameFromSetup(createSetup());
  const ashaId = game.players[1]!.id;

  applyProofNo(game, ashaId, ["suspect-2", "weapon-2", "room-2"]);
  applyProofYes(game, ashaId, ["suspect-3", "weapon-3", "room-3"]);

  const knowledge = getDetectiveKnowledgeSummary(game, ashaId);

  assert.equal(knowledge.detectiveId, ashaId);
  assert.ok(Array.isArray(knowledge.exactCardIds));
  assert.ok(Array.isArray(knowledge.publicExposureCounts));
  assert.ok(Array.isArray(knowledge.proofMemories));
  assert.ok(Array.isArray(knowledge.knownNotOwnerCardIds));
  assert.deepEqual(knowledge.proofMemories, [{ candidateCardIds: ["suspect-3", "weapon-3", "room-3"] }]);
});

test("failed user proof records cards the asking detective knows you do not have", () => {
  const game = createGameFromSetup(createSetup());
  const ashaId = game.players[1]!.id;

  game.turnIndex = 1;
  const draft = createTurnDraft(game);
  draft.step = "user-prove";
  draft.suggestedCardIds = ["suspect-2", "weapon-2", "room-2"];
  draft.currentProverId = game.userPlayerId;

  continueAfterUserProof(draft);

  const knowledge = getDetectiveKnowledgeSummary(draft.game, ashaId);
  assert.deepEqual(knowledge.knownNotOwnerCardIds, ["suspect-2", "weapon-2", "room-2"]);
});

test("two later no-proofs can place one suspect, one weapon, and one room into the envelope together", () => {
  const game = createGameFromSetup(createSetup({
    playerNames: ["Player1", "Player2", "Player3"],
    selectedCardIds: ["suspect-0", "suspect-1", "weapon-0", "weapon-1", "room-0", "room-1"]
  }));
  const player2 = game.players[1]!.id;
  const player3 = game.players[2]!.id;

  applyProofNo(game, player2, ["suspect-5", "weapon-5", "room-8"]);
  applyProofNo(game, player3, ["suspect-5", "weapon-5", "room-8"]);

  assert.equal(game.cards["suspect-5"].ownerId, "__envelope__");
  assert.equal(game.cards["weapon-5"].ownerId, "__envelope__");
  assert.equal(game.cards["room-8"].ownerId, "__envelope__");
});

test("suspect tab is selected automatically when the solved turn comes back to the user", () => {
  let game = setSelectedTab(createGameFromSetup(createSetup()), "audit");

  game.cards["suspect-5"].ownerId = "__envelope__";
  game.cards["weapon-5"].ownerId = "__envelope__";
  game.cards["room-8"].ownerId = null;
  game.cards["suspect-5"].notOwnerIds = game.players.map((player) => player.id);
  game.cards["weapon-5"].notOwnerIds = game.players.map((player) => player.id);
  game.cards["room-8"].notOwnerIds = game.players.map((player) => player.id);
  game.turnIndex = 2;
  game.solutionReady = false;

  const draft = createTurnDraft(game);
  const committed = commitTurn(draft.game, draft);

  assert.equal(committed.solutionReady, true);
  assert.equal(committed.selectedTab, "suspect");
  assert.equal(committed.auditLog.some((entry) => entry.summary.startsWith("Warrant ready:")), true);
});

test("committed turns count how many times each card was suspected", () => {
  const game = createGameFromSetup(createSetup());
  const draft = createTurnDraft(game);
  const playerTwo = game.players[1]!.id;

  draft.step = "ask";
  draft.suggestedCardIds = ["suspect-2", "weapon-2", "room-2"];
  draft.currentProverId = playerTwo;

  const committed = commitTurn(draft.game, draft);

  assert.equal(committed.cards["suspect-2"].suggestedCount, 1);
  assert.equal(committed.cards["weapon-2"].suggestedCount, 1);
  assert.equal(committed.cards["room-2"].suggestedCount, 1);
  assert.equal(committed.cards["suspect-3"].suggestedCount, 0);
});

test("shown-card confirmation requires a selected card", () => {
  const game = createGameFromSetup(createSetup());
  const playerTwo = game.players[1]!.id;
  const draft = createTurnDraft(game);

  draft.step = "user-shown";
  draft.suggestedCardIds = ["suspect-2", "weapon-2", "room-2"];
  draft.currentProverId = playerTwo;
  draft.shownCardId = null;

  assert.throws(() => completeShownCard(draft), /Select the card that was shown\./);

  draft.shownCardId = "suspect-2";
  assert.doesNotThrow(() => completeShownCard(draft));
});

test("manual edit clears stale exposure memory for the edited card", () => {
  const game = createGameFromSetup(createSetup());
  const ashaId = game.players[1]!.id;

  game.turnIndex = 1;
  const draft = createTurnDraft(game);
  draft.step = "user-prove";
  draft.suggestedCardIds = ["suspect-2", "weapon-2", "room-2"];
  draft.currentProverId = game.userPlayerId;
  continueAfterUserProof(draft);

  assert.deepEqual(getDetectiveKnowledgeSummary(draft.game, ashaId).knownNotOwnerCardIds, ["suspect-2", "weapon-2", "room-2"]);

  const clearOwnedCard = createManualEditDraft(draft.game, "suspect-0");
  clearOwnedCard.mode = "owner";
  clearOwnedCard.ownerId = null;
  const afterClearingOwnedCard = applyManualEdit(draft.game, clearOwnedCard);

  const edit = createManualEditDraft(afterClearingOwnedCard, "suspect-2");
  edit.mode = "owner";
  edit.ownerId = afterClearingOwnedCard.userPlayerId;

  const corrected = applyManualEdit(afterClearingOwnedCard, edit);
  assert.deepEqual(getDetectiveKnowledgeSummary(corrected, ashaId).knownNotOwnerCardIds, ["weapon-2", "room-2"]);
});

test("setup step errors only show the current page requirements", () => {
  const setup = createSetup({
    step: 2,
    playerNames: ["Hari", "", "Nikhil"],
    playerCardCounts: ["", "", ""],
    selectedCardIds: []
  });

  assert.deepEqual(getSetupStepErrors(setup, 2), ["Every detective needs a name."]);
  assert.deepEqual(getSetupStepErrors(setup, 3), ["Each detective must have a whole-number card count."]);
  assert.deepEqual(getSetupStepErrors(setup, 4), ["Finish the detective card counts before choosing your hand."]);
});

test("turn draft updates stay pure while proof flow advances", () => {
  const initial = createGameFromSetup(createSetup());
  const playerTwo = initial.players[1]!.id;
  const draft = createTurnDraft(initial);

  draft.step = "ask";
  draft.suggestedCardIds = ["suspect-2", "weapon-2", "room-2"];
  draft.currentProverId = playerTwo;

  const snapshotBefore = structuredClone(draft);
  const nextDraft = continueAfterProofNo(structuredClone(draft));

  assert.deepEqual(draft, snapshotBefore);
  assert.equal(nextDraft?.eventLog.length, 1);
  assert.equal(nextDraft?.eventLog[0], "Asha could not prove the suggestion.");
});

test("envelope deduction closes a category once all detectives are ruled out", () => {
  const game = createGameFromSetup(createSetup());
  const otherPlayers = game.players.slice(1).map((player) => player.id);

  for (const playerId of otherPlayers) {
    applyProofNo(game, playerId, ["weapon-3", "suspect-5", "room-8"]);
  }

  assert.equal(getEnvelopeCardIdForCategory(game, "weapon"), "weapon-3");
  assert.equal(game.cards["weapon-3"].ownerId, "__envelope__");
  assert.equal(game.auditLog.some((entry) => entry.summary === "Revolver must be in the envelope"), true);
});

test("user proof records exact exposure and public proof counts for the user's own cards", () => {
  const initial = createGameFromSetup(createSetup());
  initial.turnIndex = 2;
  const draft = createTurnDraft(initial);
  const ashaId = initial.players[1]!.id;
  const nikhilId = initial.players[2]!.id;

  draft.step = "user-prove";
  draft.suggestedCardIds = ["suspect-0", "weapon-4", "room-8"];
  draft.currentProverId = initial.userPlayerId;
  draft.shownCardId = "suspect-0";

  const result = continueAfterUserProof(draft);
  assert.equal(result, null);

  const committed = commitTurn(draft.game, draft);
  const exposure = getUserExposureSummary(committed);

  assert.deepEqual(exposure.byViewer.find((entry) => entry.viewerId === nikhilId)?.exactCardIds, ["suspect-0"]);
  assert.deepEqual(exposure.byViewer.find((entry) => entry.viewerId === nikhilId)?.publicExposureCounts, []);
  assert.deepEqual(exposure.byViewer.find((entry) => entry.viewerId === ashaId)?.exactCardIds, []);
  assert.deepEqual(exposure.byViewer.find((entry) => entry.viewerId === ashaId)?.publicExposureCounts, [{ cardId: "suspect-0", count: 1 }]);
  assert.equal(exposure.byCard.find((entry) => entry.cardId === "suspect-0")?.exactRevealCount, 1);
  assert.equal(exposure.byCard.find((entry) => entry.cardId === "suspect-0")?.publicExposureTurnCount, 1);

  const history: HistoryState = {
    past: [initial],
    present: committed,
    future: []
  };
  const entries = getAuditTimelineEntries(history);

  assert.equal(entries[0]!.changeLines.some((line) => line.includes("Nikhil has definitely seen Miss Peacock")), true);
  assert.equal(entries[0]!.changeLines.some((line) => line.includes("Miss Peacock: public proof exposure for Asha")), true);
});

test("duplicate user proofs do not duplicate exposure memory entries", () => {
  const game = createGameFromSetup(createSetup());
  game.turnIndex = 2;
  const nikhilId = game.players[2]!.id;

  const firstDraft = createTurnDraft(game);
  firstDraft.step = "user-prove";
  firstDraft.suggestedCardIds = ["suspect-0", "weapon-2", "room-8"];
  firstDraft.currentProverId = game.userPlayerId;
  firstDraft.shownCardId = "suspect-0";

  const firstResult = continueAfterUserProof(firstDraft);
  assert.equal(firstResult, null);
  const exposureCountAfterFirstProof = firstDraft.game.userExposureEvents.length;

  const secondDraft = createTurnDraft(firstDraft.game);
  secondDraft.step = "user-prove";
  secondDraft.suggestedCardIds = ["suspect-0", "weapon-2", "room-8"];
  secondDraft.currentProverId = firstDraft.game.userPlayerId;
  secondDraft.shownCardId = "suspect-0";

  const secondResult = continueAfterUserProof(secondDraft);
  assert.equal(secondResult, null);
  assert.equal(secondDraft.game.userExposureEvents.length, exposureCountAfterFirstProof);
  assert.deepEqual(getUserExposureSummary(secondDraft.game).byViewer.find((entry) => entry.viewerId === nikhilId)?.exactCardIds, ["suspect-0"]);
});

test("public proof counts record one visible exposure per card for the observing detective", () => {
  const game = createGameFromSetup(createSetup());
  const ashaId = game.players[1]!.id;

  game.turnIndex = 2;
  const firstDraft = createTurnDraft(game);
  firstDraft.step = "user-prove";
  firstDraft.suggestedCardIds = ["suspect-0", "weapon-0", "room-8"];
  firstDraft.currentProverId = game.userPlayerId;
  firstDraft.shownCardId = "suspect-0";
  continueAfterUserProof(firstDraft);
  const afterFirstTurn = commitTurn(firstDraft.game, firstDraft);

  const exposure = getUserExposureSummary(afterFirstTurn);
  assert.deepEqual(exposure.byViewer.find((entry) => entry.viewerId === ashaId)?.publicExposureCounts, [
    { cardId: "suspect-0", count: 1 },
    { cardId: "weapon-0", count: 1 }
  ]);
  assert.equal(exposure.byCard.find((entry) => entry.cardId === "suspect-0")?.publicExposureTurnCount, 1);
  assert.equal(exposure.byCard.find((entry) => entry.cardId === "weapon-0")?.publicExposureTurnCount, 1);
});
