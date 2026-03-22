import test from "node:test";
import assert from "node:assert/strict";
import {
  applyProofNo,
  applyProofYes,
  applyProofShown,
  continueAfterProofNo,
  commitTurn,
  createGameFromSetup,
  createTurnDraft,
  getSetupStepErrors,
  getAuditTimelineEntries,
  getEnvelopeCardIdForCategory
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

test("trick 2 memory resolves after later eliminations", () => {
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
  assert.equal(game.auditLog.some((entry) => entry.summary.includes("Trick 2 resolved")), true);
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
