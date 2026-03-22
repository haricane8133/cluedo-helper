import {
  CARD_CATEGORIES,
  CARD_DEFINITIONS,
  CARD_IDS,
  DEFAULT_PROVE_DIRECTION,
  DEFAULT_TAB,
  getCardDefinition,
  getCardsForCategory
} from "./constants";
import type {
  AppState,
  AuditEntry,
  AuditKind,
  AuditTimelineEntry,
  CardCategory,
  CardId,
  CardState,
  DetectiveKnowledgeSummary,
  GameState,
  HistoryState,
  ManualEditDraft,
  OwnerId,
  PlayerId,
  PlayerState,
  ProofRecord,
  SetupDraft,
  TurnDraft,
  UserExposureCardSummary,
  UserExposureSummary,
  UserExposureViewerSummary
} from "./types";

export const ENVELOPE_OWNER_ID = "__envelope__" as const;

export class GameInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GameInvariantError";
  }
}

const DEFAULT_PLAYERS = 3;
const MAX_AUDIT_ENTRIES = 250;

const deepClone = <T,>(value: T): T => {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
};

const invariant = (condition: unknown, message: string): void => {
  if (!condition) {
    throw new GameInvariantError(message);
  }
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);
const createStringArray = (length: number): string[] => Array.from({ length }, () => "");
const nowIso = (): string => new Date().toISOString();

const resizeArray = (values: string[], length: number): string[] => {
  const next = values.slice(0, length);
  while (next.length < length) {
    next.push("");
  }
  return next;
};

const parseCardCount = (value: string): number | null => {
  if (!/^\d+$/.test(value.trim())) {
    return null;
  }

  return Number(value.trim());
};

const normalizePlayerIdOrder = (playerIds: PlayerId[], players: PlayerState[]): PlayerId[] => {
  const order = new Map(players.map((player, index) => [player.id, index]));
  return [...new Set(playerIds)].sort((left, right) => (order.get(left) ?? 0) - (order.get(right) ?? 0));
};

const getCardNamesText = (cardIds: CardId[]): string =>
  cardIds.map((cardId) => getCardDefinition(cardId).name).join(", ");

const createCandidateKey = (cardIds: CardId[]): string =>
  [...cardIds].sort((left, right) => getCardDefinition(left).order - getCardDefinition(right).order).join("|");

const dedupeSequentialStrings = (values: string[]): string[] =>
  values.filter((value, index) => value.trim().length > 0 && value !== values[index - 1]);

const appendAuditEntry = (
  game: GameState,
  kind: AuditKind,
  summary: string,
  reasoning: string,
  turnIndex = game.turnIndex
): void => {
  game.auditLog.unshift({
    id: `${kind}:${turnIndex}:${game.auditLog.length}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    recordedAt: nowIso(),
    turnIndex,
    kind,
    summary,
    reasoning
  });
  game.auditLog = game.auditLog.slice(0, MAX_AUDIT_ENTRIES);
};

const recordTurnEvent = (draft: TurnDraft, detail: string): void => {
  if (detail.trim().length === 0) {
    return;
  }

  if (draft.eventLog[draft.eventLog.length - 1] === detail) {
    return;
  }

  draft.eventLog = [...draft.eventLog, detail];
};

const getTurnSuggestionText = (cardIds: CardId[]): string =>
  getCardNamesText(
    [...cardIds].sort((left, right) => getCardDefinition(left).order - getCardDefinition(right).order)
  );

const buildTurnCommitAudit = (
  game: GameState,
  draft: TurnDraft | null | undefined,
  nextActivePlayerName: string
): { summary: string; reasoning: string } => {
  const activePlayer = getActivePlayer(game);

  if (!draft || draft.suggestedCardIds.length === 0) {
    return {
      summary: `Turn committed for ${activePlayer.name}`,
      reasoning: `No suggestion was recorded before the turn was saved. Play advanced to ${nextActivePlayerName}.`
    };
  }

  const suggestionText = getTurnSuggestionText(draft.suggestedCardIds);
  const responseEvents = dedupeSequentialStrings(draft.eventLog);
  const responseText = responseEvents.length > 0
    ? responseEvents.join(" ")
    : "No proof response changed the deduction board during this turn.";

  return {
    summary: `${activePlayer.name} suggested ${suggestionText}`,
    reasoning: `${responseText} Play advanced to ${nextActivePlayerName}.`
  };
};

export const createDefaultSetup = (): SetupDraft => ({
  noPlayers: DEFAULT_PLAYERS,
  playerPos: 1,
  step: 1,
  proveDirection: DEFAULT_PROVE_DIRECTION,
  playerNames: createStringArray(DEFAULT_PLAYERS),
  playerCardCounts: createStringArray(DEFAULT_PLAYERS),
  selectedCardIds: []
});

export const sanitizeSetupDraft = (setup: SetupDraft): SetupDraft => {
  const noPlayers = clamp(Number(setup.noPlayers) || DEFAULT_PLAYERS, 3, 6);
  const playerPos = clamp(Number(setup.playerPos) || 1, 1, noPlayers);
  const step = clamp(Number(setup.step) || 1, 1, 4);
  const playerNames = resizeArray(setup.playerNames ?? [], noPlayers);
  const playerCardCounts = resizeArray(setup.playerCardCounts ?? [], noPlayers);
  const selectedCardIds = [...new Set((setup.selectedCardIds ?? []).filter((cardId) => CARD_IDS.includes(cardId)))];

  return {
    noPlayers,
    playerPos,
    step,
    proveDirection: setup.proveDirection === "counterclockwise" ? "counterclockwise" : DEFAULT_PROVE_DIRECTION,
    playerNames,
    playerCardCounts,
    selectedCardIds
  };
};

export const isDefaultSetup = (setup: SetupDraft): boolean => {
  const base = createDefaultSetup();
  const normalized = sanitizeSetupDraft(setup);
  return JSON.stringify(normalized) === JSON.stringify(base);
};

interface SetupValidationState {
  normalized: SetupDraft;
  trimmedNames: string[];
  duplicateNames: Set<string>;
  validCounts: boolean;
  totalCards: number;
  userCardCount: number;
}

const getSetupValidationState = (setup: SetupDraft): SetupValidationState => {
  const normalized = sanitizeSetupDraft(setup);
  const trimmedNames = normalized.playerNames.map((name) => name.trim());
  const filledNames = trimmedNames.filter(Boolean);
  const duplicateNames = new Set<string>();
  const seenNames = new Set<string>();

  filledNames.forEach((name) => {
    const key = name.toLowerCase();
    if (seenNames.has(key)) {
      duplicateNames.add(name);
    }
    seenNames.add(key);
  });

  const cardCounts = normalized.playerCardCounts.map(parseCardCount);
  const validCounts = cardCounts.every((count) => count !== null && count > 0);
  const totalCards = cardCounts.reduce<number>((sum, count) => sum + (count ?? 0), 0);
  const userCardCount = cardCounts[normalized.playerPos - 1] ?? 0;

  return {
    normalized,
    trimmedNames,
    duplicateNames,
    validCounts,
    totalCards,
    userCardCount
  };
};

const getSetupNameErrors = (validation: SetupValidationState): string[] => {
  const errors: string[] = [];

  if (validation.trimmedNames.some((name) => name.length === 0)) {
    errors.push("Every detective needs a name.");
  }

  if (validation.duplicateNames.size > 0) {
    errors.push("Detective names must be unique.");
  }

  return errors;
};

const getSetupCardCountErrors = (validation: SetupValidationState): string[] => {
  const errors: string[] = [];

  if (!validation.validCounts) {
    errors.push("Each detective must have a whole-number card count.");
  }

  if (validation.validCounts && validation.totalCards !== 18) {
    errors.push("The total number of dealt cards must be 18.");
  }

  return errors;
};

const getSetupHandErrors = (
  validation: SetupValidationState,
  options: { includeDependencyError?: boolean } = {}
): string[] => {
  if (options.includeDependencyError && getSetupCardCountErrors(validation).length > 0) {
    return ["Finish the detective card counts before choosing your hand."];
  }

  if (validation.normalized.selectedCardIds.length !== validation.userCardCount) {
    return ["Select exactly the cards that are in your hand."];
  }

  return [];
};

export const getSetupErrors = (setup: SetupDraft): string[] => {
  const validation = getSetupValidationState(setup);

  return [
    ...getSetupNameErrors(validation),
    ...getSetupCardCountErrors(validation),
    ...getSetupHandErrors(validation)
  ];
};

export const getSetupStepErrors = (setup: SetupDraft, step = sanitizeSetupDraft(setup).step): string[] => {
  const validation = getSetupValidationState(setup);

  if (step === 2) {
    return getSetupNameErrors(validation);
  }

  if (step === 3) {
    return getSetupCardCountErrors(validation);
  }

  if (step === 4) {
    return getSetupHandErrors(validation, { includeDependencyError: true });
  }

  return [];
};

export const isStepValid = (setup: SetupDraft, step: number): boolean => {
  const normalized = sanitizeSetupDraft(setup);
  const errors = getSetupErrors(normalized);

  if (step === 1) {
    return true;
  }

  if (step === 2) {
    return normalized.playerNames.every((name) => name.trim().length > 0) &&
      new Set(normalized.playerNames.map((name) => name.trim().toLowerCase())).size === normalized.noPlayers;
  }

  if (step === 3) {
    return normalized.playerCardCounts.every((value) => parseCardCount(value) !== null && Number(value) > 0) &&
      normalized.playerCardCounts.reduce((sum, value) => sum + Number(value), 0) === 18;
  }

  if (step === 4) {
    return errors.length === 0;
  }

  return false;
};

export const cloneGame = (game: GameState): GameState => deepClone(game);

export const cloneTurnDraft = (draft: TurnDraft): TurnDraft => deepClone(draft);

export const cloneAppStateForPersistence = (state: AppState) => ({
  version: 1 as const,
  setup: sanitizeSetupDraft(state.setup),
  history: deepClone(state.history),
  turnDraft: state.turnDraft ? deepClone(state.turnDraft) : null,
  manualEdit: state.manualEdit ? deepClone(state.manualEdit) : null
});

const getPlayer = (game: GameState, playerId: PlayerId): PlayerState => {
  const player = game.players.find((entry) => entry.id === playerId);
  if (!player) {
    throw new GameInvariantError("The referenced detective does not exist in this case.");
  }
  return player;
};

const getCardState = (game: GameState, cardId: CardId): CardState => {
  const card = game.cards[cardId];
  if (!card) {
    throw new GameInvariantError(`The card ${cardId} does not exist.`);
  }
  return card;
};

export const getKnownOwnedCardIds = (game: GameState, playerId: PlayerId): CardId[] =>
  CARD_DEFINITIONS.filter((card) => game.cards[card.id].ownerId === playerId)
    .sort((left, right) => left.order - right.order)
    .map((card) => card.id);

const getKnownOwnedCount = (game: GameState, playerId: PlayerId): number => getKnownOwnedCardIds(game, playerId).length;

const setOwnerDirect = (game: GameState, cardId: CardId, ownerId: OwnerId): boolean => {
  const card = getCardState(game, cardId);

  if (card.ownerId === ownerId) {
    return false;
  }

  invariant(card.ownerId === null, `${getCardDefinition(cardId).name} already has a confirmed owner.`);

  if (ownerId === ENVELOPE_OWNER_ID) {
    const existingEnvelopeCard = getEnvelopeCardIdForCategory(game, getCardDefinition(cardId).category);
    invariant(
      !existingEnvelopeCard || existingEnvelopeCard === cardId,
      `${getCardDefinition(existingEnvelopeCard ?? cardId).name} is already locked into the envelope for this category, so ${getCardDefinition(cardId).name} cannot also be placed there.`
    );
    card.ownerId = ENVELOPE_OWNER_ID;
    card.notOwnerIds = game.players.map((player) => player.id);
    return true;
  }

  invariant(!card.notOwnerIds.includes(ownerId), `${getPlayer(game, ownerId).name} cannot own ${getCardDefinition(cardId).name}.`);
  invariant(
    getKnownOwnedCount(game, ownerId) < getPlayer(game, ownerId).cardCount,
    `${getPlayer(game, ownerId).name} already has their full hand accounted for.`
  );

  card.ownerId = ownerId;
  card.notOwnerIds = game.players.filter((player) => player.id !== ownerId).map((player) => player.id);
  return true;
};

const markNotOwnerDirect = (game: GameState, cardId: CardId, playerId: PlayerId): boolean => {
  const card = getCardState(game, cardId);

  if (card.ownerId === playerId) {
    throw new GameInvariantError(`${getPlayer(game, playerId).name} is already confirmed as owning ${getCardDefinition(cardId).name}.`);
  }

  if (card.notOwnerIds.includes(playerId)) {
    return false;
  }

  card.notOwnerIds = normalizePlayerIdOrder([...card.notOwnerIds, playerId], game.players);
  return true;
};

const runProofDeductions = (game: GameState): void => {
  let changed = true;

  while (changed) {
    changed = false;

    for (const cardId of CARD_IDS) {
      const card = getCardState(game, cardId);
      if (card.ownerId === null && card.notOwnerIds.length === game.players.length) {
        const didAssign = setOwnerDirect(game, cardId, ENVELOPE_OWNER_ID);
        if (didAssign) {
          appendAuditEntry(
            game,
            "deduction",
            `${getCardDefinition(cardId).name} must be in the envelope`,
            `Every detective has been ruled out as the owner of ${getCardDefinition(cardId).name}, so the envelope is the only location left.`
          );
          changed = true;
        }
      }
    }

    for (const category of CARD_CATEGORIES) {
      const envelopeCardId = getEnvelopeCardIdForCategory(game, category);
      if (envelopeCardId) {
        continue;
      }

      const unresolvedCards = getCardsForCategory(category).filter((card) => game.cards[card.id].ownerId === null);
      if (unresolvedCards.length === 1) {
        const lastCardId = unresolvedCards[0].id;
        const didAssign = setOwnerDirect(game, lastCardId, ENVELOPE_OWNER_ID);
        if (didAssign) {
          appendAuditEntry(
            game,
            "deduction",
            `${getCardDefinition(lastCardId).name} is the only remaining ${category}`,
            `All other ${category} cards are already accounted for elsewhere, so ${getCardDefinition(lastCardId).name} must be the envelope card.`
          );
          changed = true;
        }
      }
    }

    for (const proof of game.proofs) {
      const anyKnownCardAlreadyOwned = proof.candidateCardIds.some(
        (cardId) => getCardState(game, cardId).ownerId === proof.playerId
      );

      if (anyKnownCardAlreadyOwned) {
        continue;
      }

      const viableCardIds = proof.candidateCardIds.filter((cardId) => {
        const card = getCardState(game, cardId);
        return card.ownerId === null && !card.notOwnerIds.includes(proof.playerId);
      });

      invariant(
        viableCardIds.length > 0,
        `${getPlayer(game, proof.playerId).name} was recorded as proving a suggestion, but none of those cards can belong to them anymore.`
      );

      if (viableCardIds.length === 1) {
        const resolvedCardId = viableCardIds[0];
        const didAssign = setOwnerDirect(game, resolvedCardId, proof.playerId);
        if (didAssign) {
          appendAuditEntry(
            game,
            "deduction",
            `${getPlayer(game, proof.playerId).name} must have ${getCardDefinition(resolvedCardId).name}`,
            `${getPlayer(game, proof.playerId).name} previously proved one of ${getCardNamesText(proof.candidateCardIds)}. Later eliminations left only ${getCardDefinition(resolvedCardId).name} as a valid option.`
          );
          changed = true;
        }
      }
    }
  }
};

const validateGame = (game: GameState): void => {
  for (const player of game.players) {
    invariant(
      getKnownOwnedCount(game, player.id) <= player.cardCount,
      `${player.name} has been assigned more cards than their hand size allows.`
    );
  }

  for (const cardId of CARD_IDS) {
    const card = getCardState(game, cardId);
    card.notOwnerIds = normalizePlayerIdOrder(card.notOwnerIds, game.players);

    if (card.ownerId && card.ownerId !== ENVELOPE_OWNER_ID) {
      invariant(!card.notOwnerIds.includes(card.ownerId), `${getCardDefinition(cardId).name} cannot be both owned and not owned by the same detective.`);
    }
  }

  for (const category of CARD_CATEGORIES) {
    const envelopeCards = getCardsForCategory(category).filter((card) => game.cards[card.id].ownerId === ENVELOPE_OWNER_ID);
    invariant(envelopeCards.length <= 1, `Only one ${category} card can be in the envelope.`);
  }

  game.solutionReady = CARD_CATEGORIES.every((category) => Boolean(getEnvelopeCardIdForCategory(game, category)));
};

const syncGameState = (game: GameState): void => {
  runProofDeductions(game);
  validateGame(game);
};

export const assignOwner = (
  game: GameState,
  cardId: CardId,
  ownerId: OwnerId,
  auditNote?: { kind: AuditKind; summary: string; reasoning: string }
): void => {
  const didAssign = setOwnerDirect(game, cardId, ownerId);
  syncGameState(game);

  if (didAssign && auditNote) {
    appendAuditEntry(game, auditNote.kind, auditNote.summary, auditNote.reasoning);
  }
};

export const clearCardKnowledge = (game: GameState, cardId: CardId): void => {
  const card = getCardState(game, cardId);
  card.ownerId = null;
  card.notOwnerIds = [];
  syncGameState(game);
};

export const markNotOwner = (game: GameState, cardId: CardId, playerId: PlayerId): void => {
  markNotOwnerDirect(game, cardId, playerId);
  syncGameState(game);
};

export const getOwnerLabel = (game: GameState, ownerId: OwnerId | null): string => {
  if (!ownerId) {
    return "Unknown";
  }

  if (ownerId === ENVELOPE_OWNER_ID) {
    return "Envelope";
  }

  return getPlayer(game, ownerId).name;
};

export const getEnvelopeCardIdForCategory = (game: GameState, category: CardCategory): CardId | null => {
  const card = getCardsForCategory(category).find((entry) => game.cards[entry.id].ownerId === ENVELOPE_OWNER_ID);
  return card?.id ?? null;
};

export const getSuspectCardIds = (game: GameState): CardId[] => {
  const suspectCardIds: CardId[] = [];

  for (const category of CARD_CATEGORIES) {
    const envelopeCardId = getEnvelopeCardIdForCategory(game, category);
    if (envelopeCardId) {
      suspectCardIds.push(envelopeCardId);
      continue;
    }

    getCardsForCategory(category)
      .filter((card) => game.cards[card.id].ownerId === null)
      .forEach((card) => suspectCardIds.push(card.id));
  }

  return suspectCardIds;
};

export const getPlayerHandView = (game: GameState, playerId: PlayerId): { knownCardIds: CardId[]; unknownSlots: number } => {
  const player = getPlayer(game, playerId);
  const knownCardIds = getKnownOwnedCardIds(game, playerId);

  return {
    knownCardIds,
    unknownSlots: Math.max(player.cardCount - knownCardIds.length, 0)
  };
};

export const getKnownNotOwnedUserCardIdsForViewer = (game: GameState, viewerId: PlayerId): CardId[] => {
  const cardIds = new Set<CardId>();

  game.userExposureEvents.forEach((event) => {
    if (event.kind !== "not-owner" || event.viewerId !== viewerId || !event.cardId) {
      return;
    }

    cardIds.add(event.cardId);
  });

  return [...cardIds].sort((left, right) => getCardDefinition(left).order - getCardDefinition(right).order);
};

export const getUserExposureSummary = (game: GameState): UserExposureSummary => {
  const userCardIds = getKnownOwnedCardIds(game, game.userPlayerId);
  const otherPlayers = game.players.filter((player) => player.id !== game.userPlayerId);
  const byViewerMap = new Map<PlayerId, { exactCardIds: Set<CardId>; publicExposureCounts: Map<CardId, number> }>();
  const byCardMap = new Map<CardId, { exactViewerIds: Set<PlayerId>; publicExposureTurnKeys: Set<string> }>();

  otherPlayers.forEach((player) => {
    byViewerMap.set(player.id, { exactCardIds: new Set(), publicExposureCounts: new Map() });
  });

  userCardIds.forEach((cardId) => {
    byCardMap.set(cardId, { exactViewerIds: new Set(), publicExposureTurnKeys: new Set() });
  });

  for (const event of game.userExposureEvents) {
    const viewer = byViewerMap.get(event.viewerId);
    if (!viewer) {
      continue;
    }

    if (event.kind === "exact" && event.cardId && byCardMap.has(event.cardId)) {
      viewer.exactCardIds.add(event.cardId);
      byCardMap.get(event.cardId)?.exactViewerIds.add(event.viewerId);
      continue;
    }

    if (event.kind === "public" && event.cardId && byCardMap.has(event.cardId)) {
      const nextCount = (viewer.publicExposureCounts.get(event.cardId) ?? 0) + 1;
      viewer.publicExposureCounts.set(event.cardId, nextCount);
      byCardMap.get(event.cardId)?.publicExposureTurnKeys.add(event.turnKey ?? `${event.turnIndex}:${event.viewerId}:${event.cardId}`);
    }
  }

  const byViewer: UserExposureViewerSummary[] = otherPlayers.map((player) => {
    const viewer = byViewerMap.get(player.id)!;
    const exactCardIds = [...viewer.exactCardIds].sort((left, right) => getCardDefinition(left).order - getCardDefinition(right).order);
    const publicExposureCounts = [...viewer.publicExposureCounts.entries()]
      .map(([cardId, count]) => ({ cardId, count }))
      .sort((left, right) => getCardDefinition(left.cardId).order - getCardDefinition(right.cardId).order);

    return {
      viewerId: player.id,
      exactCardIds,
      publicExposureCounts
    };
  });

  const byCard: UserExposureCardSummary[] = userCardIds.map((cardId) => {
    const summary = byCardMap.get(cardId)!;
    return {
      cardId,
      exactViewerIds: normalizePlayerIdOrder([...summary.exactViewerIds], game.players),
      exactRevealCount: summary.exactViewerIds.size,
      publicExposureTurnCount: summary.publicExposureTurnKeys.size
    };
  });

  return { byViewer, byCard };
};

export const getDetectiveKnowledgeSummary = (game: GameState, detectiveId: PlayerId): DetectiveKnowledgeSummary => {
  const exposureSummary = getUserExposureSummary(game);
  const viewerSummary = exposureSummary.byViewer.find((entry) => entry.viewerId === detectiveId);
  const proofMemories = getActiveProofRecords(game)
    .filter((proof) => proof.playerId === detectiveId)
    .map((proof) => ({
      candidateCardIds: proof.candidateCardIds.filter((cardId) => {
        const card = game.cards[cardId];
        return card.ownerId === detectiveId || (card.ownerId === null && !card.notOwnerIds.includes(detectiveId));
      })
    }));

  return {
    detectiveId,
    exactCardIds: viewerSummary?.exactCardIds ?? [],
    publicExposureCounts: viewerSummary?.publicExposureCounts ?? [],
    proofMemories,
    knownNotOwnerCardIds: getKnownNotOwnedUserCardIdsForViewer(game, detectiveId)
  };
};

export const getDetectiveKnowledgeSummaries = (game: GameState): DetectiveKnowledgeSummary[] =>
  game.players.map((player) => getDetectiveKnowledgeSummary(game, player.id));

export const getUserExposureCompactByCategory = (game: GameState): Record<CardCategory, UserExposureCardSummary[]> => {
  const summary = getUserExposureSummary(game);

  return {
    suspect: summary.byCard.filter((entry) => getCardDefinition(entry.cardId).category === "suspect"),
    weapon: summary.byCard.filter((entry) => getCardDefinition(entry.cardId).category === "weapon"),
    room: summary.byCard.filter((entry) => getCardDefinition(entry.cardId).category === "room")
  };
};

export const canCardPossiblyBelongToPlayer = (game: GameState, cardId: CardId, playerId: PlayerId): boolean => {
  const card = getCardState(game, cardId);

  if (card.ownerId === playerId) {
    return true;
  }

  if (card.ownerId !== null) {
    return false;
  }

  if (card.notOwnerIds.includes(playerId)) {
    return false;
  }

  return getKnownOwnedCount(game, playerId) < getPlayer(game, playerId).cardCount;
};

const recordProof = (game: GameState, playerId: PlayerId, candidateCardIds: CardId[]): void => {
  const uniqueCandidates = [...new Set(candidateCardIds)].sort(
    (left, right) => getCardDefinition(left).order - getCardDefinition(right).order
  );

  const exists = game.proofs.some(
    (proof) => proof.playerId === playerId && JSON.stringify(proof.candidateCardIds) === JSON.stringify(uniqueCandidates)
  );

  if (exists) {
    return;
  }

  game.proofs.push({
    id: `${playerId}:${game.proofs.length}:${Date.now()}`,
    playerId,
    candidateCardIds: uniqueCandidates
  });

  syncGameState(game);
  appendAuditEntry(
    game,
    "proof",
    `${getPlayer(game, playerId).name} has one of ${getCardNamesText(uniqueCandidates)}`,
    `${getPlayer(game, playerId).name} proved the suggestion, but the exact card is still unknown. This proof memory stays active until later eliminations reduce it to one card.`
  );
};

export const getActiveProofRecords = (game: GameState): ProofRecord[] =>
  game.proofs.filter((proof) => {
    const alreadyResolved = proof.candidateCardIds.some((cardId) => game.cards[cardId].ownerId === proof.playerId);
    if (alreadyResolved) {
      return false;
    }

    const viableCardIds = proof.candidateCardIds.filter((cardId) => {
      const card = game.cards[cardId];
      return card.ownerId === null && !card.notOwnerIds.includes(proof.playerId);
    });

    return viableCardIds.length > 1;
  });

const recordUserExposureExact = (game: GameState, viewerId: PlayerId, shownCardId: CardId): boolean => {
  if (viewerId === game.userPlayerId || game.cards[shownCardId].ownerId !== game.userPlayerId) {
    return false;
  }

  const exists = game.userExposureEvents.some((event) =>
    event.kind === "exact" && event.viewerId === viewerId && event.cardId === shownCardId
  );

  if (exists) {
    return false;
  }

  game.userExposureEvents.push({
    id: `user-exact:${viewerId}:${shownCardId}:${game.userExposureEvents.length}:${Date.now()}`,
    viewerId,
    sourcePlayerId: viewerId,
    turnIndex: game.turnIndex,
    kind: "exact",
    cardId: shownCardId
  });
  return true;
};

const recordUserExposurePublic = (game: GameState, viewerId: PlayerId, sourcePlayerId: PlayerId, cardId: CardId): boolean => {
  if (viewerId === game.userPlayerId) {
    return false;
  }

  if (game.cards[cardId].ownerId !== game.userPlayerId) {
    return false;
  }

  const turnKey = `${game.turnIndex}:${viewerId}:${cardId}`;
  const exists = game.userExposureEvents.some((event) =>
    event.kind === "public" &&
    event.viewerId === viewerId &&
    event.cardId === cardId &&
    event.turnKey === turnKey
  );

  if (exists) {
    return false;
  }

  game.userExposureEvents.push({
    id: `user-public:${viewerId}:${cardId}:${turnKey}:${game.userExposureEvents.length}:${Date.now()}`,
    viewerId,
    sourcePlayerId,
    turnIndex: game.turnIndex,
    turnKey,
    kind: "public",
    cardId
  });
  return true;
};

const recordUserExposureNotOwner = (game: GameState, viewerId: PlayerId, sourcePlayerId: PlayerId, cardId: CardId): boolean => {
  if (viewerId === game.userPlayerId) {
    return false;
  }

  if (game.cards[cardId].ownerId === game.userPlayerId) {
    return false;
  }

  const exists = game.userExposureEvents.some((event) =>
    event.kind === "not-owner" && event.viewerId === viewerId && event.cardId === cardId
  );

  if (exists) {
    return false;
  }

  game.userExposureEvents.push({
    id: `user-not-owner:${viewerId}:${cardId}:${game.userExposureEvents.length}:${Date.now()}`,
    viewerId,
    sourcePlayerId,
    turnIndex: game.turnIndex,
    kind: "not-owner",
    cardId
  });
  return true;
};

const applyUserExposureFromReveal = (game: GameState, askingPlayerId: PlayerId, shownCardId: CardId, suggestedCardIds: CardId[]): void => {
  const exactAdded = recordUserExposureExact(game, askingPlayerId, shownCardId);
  const userOwnedSuggestedCardIds = suggestedCardIds
    .filter((cardId) => game.cards[cardId].ownerId === game.userPlayerId)
    .sort((left, right) => getCardDefinition(left).order - getCardDefinition(right).order);
  const publicExposureChanges = new Map<CardId, PlayerId[]>();

  game.players
    .filter((player) => player.id !== game.userPlayerId && player.id !== askingPlayerId)
    .forEach((player) => {
      userOwnedSuggestedCardIds.forEach((cardId) => {
        const changed = recordUserExposurePublic(game, player.id, askingPlayerId, cardId);
        if (!changed) {
          return;
        }

        const viewers = publicExposureChanges.get(cardId) ?? [];
        viewers.push(player.id);
        publicExposureChanges.set(cardId, viewers);
      });
    });

  if (!exactAdded && publicExposureChanges.size === 0) {
    return;
  }

  const exactLine = exactAdded
    ? `${getPlayer(game, askingPlayerId).name} now knows you have ${getCardDefinition(shownCardId).name}.`
    : null;
  const publicLines = [...publicExposureChanges.entries()].map(([cardId, viewerIds]) =>
    `${getPlayerNamesText(game, viewerIds)} publicly saw ${getCardDefinition(cardId).name} in this proof.`
  );
  const reasoningParts = [exactLine, ...publicLines].filter(Boolean);

  appendAuditEntry(
    game,
    "proof",
    `Exposure memory updated from your proof to ${getPlayer(game, askingPlayerId).name}`,
    reasoningParts.join(" ")
  );
};

export const applyProofShown = (game: GameState, provingPlayerId: PlayerId, shownCardId: CardId): void => {
  assignOwner(game, shownCardId, provingPlayerId, {
    kind: "proof",
    summary: `${getPlayer(game, provingPlayerId).name} showed ${getCardDefinition(shownCardId).name}`,
    reasoning: `${getPlayer(game, provingPlayerId).name} directly revealed ${getCardDefinition(shownCardId).name}, so ownership is confirmed.`
  });
};

export const applyProofYes = (game: GameState, provingPlayerId: PlayerId, suggestedCardIds: CardId[]): void => {
  const knownOwnedSuggestedCardIds = suggestedCardIds.filter((cardId) => getCardState(game, cardId).ownerId === provingPlayerId);
  if (knownOwnedSuggestedCardIds.length > 0) {
    return;
  }

  const viableCardIds = suggestedCardIds.filter((cardId) => canCardPossiblyBelongToPlayer(game, cardId, provingPlayerId));
  invariant(
    viableCardIds.length > 0,
    `${getPlayer(game, provingPlayerId).name} was marked as proving, but they cannot own any of the suggested cards.`
  );

  if (viableCardIds.length === 1) {
    const resolvedCardId = viableCardIds[0];
    assignOwner(game, resolvedCardId, provingPlayerId, {
      kind: "deduction",
      summary: `${getPlayer(game, provingPlayerId).name} must have ${getCardDefinition(resolvedCardId).name}`,
      reasoning: `${getPlayer(game, provingPlayerId).name} proved ${getCardNamesText(suggestedCardIds)}. The other suggested cards were already impossible for them, so ${getCardDefinition(resolvedCardId).name} is the only remaining option.`
    });
    return;
  }

  recordProof(game, provingPlayerId, viableCardIds);
};

export const applyProofNo = (game: GameState, provingPlayerId: PlayerId, suggestedCardIds: CardId[]): void => {
  let changed = false;

  for (const cardId of suggestedCardIds) {
    changed = markNotOwnerDirect(game, cardId, provingPlayerId) || changed;
  }

  syncGameState(game);

  if (changed) {
    appendAuditEntry(
      game,
      "proof",
      `${getPlayer(game, provingPlayerId).name} could not prove ${getCardNamesText(suggestedCardIds)}`,
      `${getPlayer(game, provingPlayerId).name} said no, so they were ruled out as the owner of each suggested card.`
    );
  }
};

export const createGameFromSetup = (setupDraft: SetupDraft): GameState => {
  const setup = sanitizeSetupDraft(setupDraft);
  const errors = getSetupErrors(setup);
  invariant(errors.length === 0, errors[0]);

  const players: PlayerState[] = setup.playerNames.map((name, index) => ({
    id: `player-${index}`,
    name: name.trim(),
    cardCount: parseCardCount(setup.playerCardCounts[index]) ?? 0
  }));

  const cards = Object.fromEntries(
    CARD_DEFINITIONS.map((card) => [card.id, { id: card.id, ownerId: null, notOwnerIds: [], suggestedCount: 0 }])
  ) as Record<CardId, CardState>;

  const game: GameState = {
    id: `game-${Date.now()}`,
    proveDirection: setup.proveDirection,
    players,
    userPlayerId: players[setup.playerPos - 1]!.id,
    turnIndex: 0,
    cards,
    proofs: [],
    userExposureEvents: [],
    auditLog: [],
    selectedTab: DEFAULT_TAB,
    solutionReady: false,
    lastCommittedAt: nowIso()
  };

  const selectedCards = new Set(setup.selectedCardIds);
  selectedCards.forEach((cardId) => {
    setOwnerDirect(game, cardId, game.userPlayerId);
  });

  for (const cardId of CARD_IDS) {
    if (!selectedCards.has(cardId)) {
      markNotOwnerDirect(game, cardId, game.userPlayerId);
    }
  }

  syncGameState(game);
  appendAuditEntry(
    game,
    "setup",
    `Setup complete for ${players.length} detectives`,
    `You are ${getPlayer(game, game.userPlayerId).name}. Hand sizes: ${players.map((player) => `${player.name} ${player.cardCount}`).join(", ")}. Your cards: ${setup.selectedCardIds.length > 0 ? getCardNamesText(setup.selectedCardIds) : "none"}.`
  );
  game.lastCommittedAt = nowIso();
  return game;
};

export const createTurnDraft = (game: GameState): TurnDraft => ({
  game: cloneGame(game),
  step: "select",
  suggestedCardIds: [],
  proveOffset: 1,
  currentProverId: null,
  shownCardId: null,
  userMessage: "",
  eventLog: []
});

const recordSuggestionCounts = (game: GameState, suggestedCardIds: CardId[]): void => {
  suggestedCardIds.forEach((cardId) => {
    game.cards[cardId].suggestedCount += 1;
  });
};

export const toggleSuggestedCard = (draft: TurnDraft, cardId: CardId): TurnDraft => {
  const exists = draft.suggestedCardIds.includes(cardId);
  const nextSuggested = exists
    ? draft.suggestedCardIds.filter((entry) => entry !== cardId)
    : draft.suggestedCardIds.length < 3
      ? [...draft.suggestedCardIds, cardId]
      : draft.suggestedCardIds;

  return {
    ...draft,
    suggestedCardIds: nextSuggested,
    shownCardId: nextSuggested.includes(draft.shownCardId ?? "") ? draft.shownCardId : null
  };
};

export const isValidSuggestion = (cardIds: CardId[]): boolean => {
  if (cardIds.length !== 3) {
    return false;
  }

  const categories = new Set(cardIds.map((cardId) => getCardDefinition(cardId).category));
  return categories.size === 3;
};

export const getActivePlayer = (game: GameState): PlayerState => game.players[game.turnIndex]!;

export const getPlayerIndex = (game: GameState, playerId: PlayerId): number =>
  game.players.findIndex((player) => player.id === playerId);

export const getProverForOffset = (game: GameState, offset: number): PlayerState => {
  const direction = game.proveDirection;
  const modifier = direction === "clockwise" ? 1 : -1;
  const index = (game.turnIndex + modifier * offset + game.players.length * 10) % game.players.length;
  const player = game.players[index];
  if (!player) {
    throw new GameInvariantError("The proving order could not resolve a detective.");
  }
  return player;
};

export const advanceTurnFlow = (draft: TurnDraft): TurnDraft => {
  invariant(isValidSuggestion(draft.suggestedCardIds), "Select one suspect, one weapon, and one room before proceeding.");
  invariant(draft.proveOffset < draft.game.players.length, "The proving chain cannot advance any further.");

  const nextProver = getProverForOffset(draft.game, draft.proveOffset);
  const matchingUserCards = draft.suggestedCardIds.filter(
    (cardId) => draft.game.cards[cardId].ownerId === draft.game.userPlayerId
  );

  if (nextProver.id === draft.game.userPlayerId) {
    return {
      ...draft,
      step: "user-prove",
      currentProverId: nextProver.id,
      shownCardId: matchingUserCards.length === 1 ? matchingUserCards[0]! : null,
      userMessage:
        matchingUserCards.length === 0
          ? "You don't have a card to prove. Continue to the next detective."
          : matchingUserCards.length === 1
            ? "Confirm the card you showed to the detective who asked."
            : "Choose the card you showed to the detective who asked."
    };
  }

  return {
    ...draft,
    step: "ask",
    currentProverId: nextProver.id,
    userMessage: ""
  };
};

export const continueAfterUserProof = (draft: TurnDraft): TurnDraft | null => {
  const askingPlayer = getActivePlayer(draft.game);
  const matchingUserCards = draft.suggestedCardIds.filter(
    (cardId) => draft.game.cards[cardId].ownerId === draft.game.userPlayerId
  );
  const nonOwnedSuggestedCardIds = draft.suggestedCardIds.filter(
    (cardId) => draft.game.cards[cardId].ownerId !== draft.game.userPlayerId
  );

  if (matchingUserCards.length > 0) {
    const selectedShownCardId = matchingUserCards.length === 1 ? matchingUserCards[0]! : draft.shownCardId;
    invariant(selectedShownCardId && matchingUserCards.includes(selectedShownCardId), "Choose the card you showed before continuing.");
    const shownCardId = selectedShownCardId as CardId;

    applyUserExposureFromReveal(draft.game, askingPlayer.id, shownCardId, draft.suggestedCardIds);
    recordTurnEvent(draft, `You proved the suggestion with ${getCardDefinition(shownCardId).name}.`);
    return null;
  }

  const notOwnerLearnedCardIds = nonOwnedSuggestedCardIds.filter((cardId) =>
    recordUserExposureNotOwner(draft.game, askingPlayer.id, askingPlayer.id, cardId)
  );

  if (notOwnerLearnedCardIds.length > 0) {
    appendAuditEntry(
      draft.game,
      "proof",
      `Exposure memory updated from your failed proof to ${askingPlayer.name}`,
      `${askingPlayer.name} now knows you do not have ${getCardNamesText(notOwnerLearnedCardIds)}.`
    );
  }

  recordTurnEvent(draft, "You could not prove the suggestion.");

  const nextOffset = draft.proveOffset + 1;
  if (nextOffset >= draft.game.players.length) {
    return null;
  }

  return advanceTurnFlow({
    ...draft,
    proveOffset: nextOffset,
    currentProverId: null,
    step: "select",
    userMessage: ""
  });
};

export const continueAfterProofNo = (draft: TurnDraft): TurnDraft | null => {
  const provingPlayerId = draft.currentProverId;
  invariant(provingPlayerId, "There is no detective queued to answer this proof.");
  if (!provingPlayerId) {
    return draft;
  }

  applyProofNo(draft.game, provingPlayerId, draft.suggestedCardIds);
  recordTurnEvent(draft, `${getPlayer(draft.game, provingPlayerId).name} could not prove the suggestion.`);

  const nextOffset = draft.proveOffset + 1;
  if (nextOffset >= draft.game.players.length) {
    return null;
  }

  return advanceTurnFlow({
    ...draft,
    proveOffset: nextOffset,
    currentProverId: null,
    step: "select",
    userMessage: "",
    shownCardId: null
  });
};

export const continueAfterProofYes = (draft: TurnDraft): TurnDraft | null => {
  const provingPlayerId = draft.currentProverId;
  invariant(provingPlayerId, "There is no detective queued to prove this suggestion.");
  if (!provingPlayerId) {
    return draft;
  }

  if (getActivePlayer(draft.game).id === draft.game.userPlayerId) {
    return {
      ...draft,
      step: "user-shown",
      shownCardId: null
    };
  }

  applyProofYes(draft.game, provingPlayerId, draft.suggestedCardIds);
  recordTurnEvent(draft, `${getPlayer(draft.game, provingPlayerId).name} proved the suggestion.`);
  return null;
};

export const completeShownCard = (draft: TurnDraft): void => {
  const provingPlayerId = draft.currentProverId;
  const shownCardId = draft.shownCardId;

  invariant(provingPlayerId, "There is no detective recorded as showing a card.");
  invariant(shownCardId, "Select the card that was shown.");

  if (!provingPlayerId || !shownCardId) {
    return;
  }

  applyProofShown(draft.game, provingPlayerId, shownCardId);
  recordTurnEvent(draft, `${getPlayer(draft.game, provingPlayerId).name} showed ${getCardDefinition(shownCardId).name}.`);
};

export const commitTurn = (game: GameState, draft?: TurnDraft | null): GameState => {
  const next = cloneGame(game);
  const completedTurnIndex = next.turnIndex;
  const solutionWasReady = next.solutionReady;

  if (draft?.suggestedCardIds.length === 3) {
    recordSuggestionCounts(next, draft.suggestedCardIds);
  }

  next.turnIndex = (next.turnIndex + 1) % next.players.length;
  next.lastCommittedAt = nowIso();
  syncGameState(next);

  if (shouldShowSolutionScreen(next)) {
    next.selectedTab = "suspect";
  }

  const audit = buildTurnCommitAudit(game, draft, getActivePlayer(next).name);
  appendAuditEntry(next, "turn", audit.summary, audit.reasoning, completedTurnIndex);

  if (!solutionWasReady && next.solutionReady) {
    const solutionText = getSolutionCardIds(next).map((cardId) => getCardDefinition(cardId).name).join(", ");
    appendAuditEntry(
      next,
      "deduction",
      `Warrant ready: ${solutionText}`,
      shouldShowSolutionScreen(next)
        ? `The full warrant is now confirmed, and it is your turn to make the accusation.`
        : `The full warrant is now confirmed. Keep tracking turns until it comes back to you.`
    );
  }

  return next;
};

export const setSelectedTab = (game: GameState, tab: GameState["selectedTab"]): GameState => ({
  ...game,
  selectedTab: tab
});

export const createManualEditDraft = (game: GameState, cardId: CardId): ManualEditDraft => {
  const card = getCardState(game, cardId);
  return {
    cardId,
    mode: "menu",
    ownerId: card.ownerId && card.ownerId !== ENVELOPE_OWNER_ID ? card.ownerId : null,
    notOwnerIds: [...card.notOwnerIds]
  };
};

export const applyManualEdit = (game: GameState, edit: ManualEditDraft): GameState => {
  const next = cloneGame(game);
  next.proofs = next.proofs.filter((proof) => !proof.candidateCardIds.includes(edit.cardId));
  next.userExposureEvents = next.userExposureEvents.filter((event) =>
    event.cardId !== edit.cardId && !event.candidateCardIds?.includes(edit.cardId)
  );

  const card = getCardState(next, edit.cardId);
  const cardName = getCardDefinition(edit.cardId).name;
  let summary = `Manual override cleared knowledge for ${cardName}`;
  let reasoning = `The user manually reset deductions related to ${cardName}. Any stored proof memory involving this card was cleared first.`;

  card.ownerId = null;
  card.notOwnerIds = [];

  if (edit.mode === "owner") {
    if (edit.ownerId) {
      setOwnerDirect(next, edit.cardId, edit.ownerId);
      summary = `Manual override: ${cardName} assigned to ${getPlayer(next, edit.ownerId).name}`;
      reasoning = `A manual correction confirmed that ${getPlayer(next, edit.ownerId).name} owns ${cardName}. Proof memories involving ${cardName} were cleared before re-running deductions.`;
    } else {
      summary = `Manual override: owner cleared for ${cardName}`;
    }
  } else if (edit.mode === "notOwners") {
    for (const playerId of edit.notOwnerIds) {
      markNotOwnerDirect(next, edit.cardId, playerId);
    }

    summary = edit.notOwnerIds.length > 0
      ? `Manual override: updated detectives ruled out for ${cardName}`
      : `Manual override: cleared not-owner list for ${cardName}`;
    reasoning = edit.notOwnerIds.length > 0
      ? `${cardName} was manually marked as impossible for ${edit.notOwnerIds.map((playerId) => getPlayer(next, playerId).name).join(", ")}. Proof memories involving ${cardName} were cleared before deductions ran again.`
      : `All not-owner marks for ${cardName} were manually cleared. Proof memories involving ${cardName} were also cleared first.`;
  }

  next.lastCommittedAt = nowIso();
  syncGameState(next);
  appendAuditEntry(next, "manual", summary, reasoning);
  return next;
};

export const shouldShowSolutionScreen = (game: GameState): boolean =>
  game.solutionReady && getActivePlayer(game).id === game.userPlayerId;

export const getSolutionCardIds = (game: GameState): CardId[] =>
  CARD_CATEGORIES.map((category) => getEnvelopeCardIdForCategory(game, category)).filter(Boolean) as CardId[];

export const getExposureLabel = (game: GameState, viewerIds: PlayerId[]): string =>
  viewerIds.length > 0
    ? viewerIds.map((playerId) => getPlayer(game, playerId).name).join(", ")
    : "None";

export const getPlayerNamesText = (game: GameState, playerIds: PlayerId[]): string =>
  playerIds.length > 0
    ? normalizePlayerIdOrder(playerIds, game.players).map((playerId) => getPlayer(game, playerId).name).join(", ")
    : "None";

export const getGameSummaryLabel = (game: GameState): string => {
  if (shouldShowSolutionScreen(game)) {
    return "The deduction is complete. Make the accusation on your turn.";
  }

  if (game.solutionReady) {
    return "The deduction is complete. Keep tracking turns until the case comes back to you.";
  }

  return "Track every suggestion, proof, and correction until only one suspect, weapon, and room remain.";
};

const getOrderedHistorySnapshots = (history: HistoryState): GameState[] =>
  history.present ? [...history.past, history.present, ...history.future] : [];

const getNewAuditEntries = (previous: GameState | null, current: GameState): AuditEntry[] => {
  const previousIds = new Set(previous?.auditLog.map((entry) => entry.id) ?? []);
  return current.auditLog.filter((entry) => !previousIds.has(entry.id));
};

const summarizeBoardDiff = (previous: GameState | null, current: GameState): string[] => {
  if (!previous) {
    return [];
  }

  const lines: string[] = [];

  for (const card of CARD_DEFINITIONS) {
    const previousCard = previous.cards[card.id];
    const currentCard = current.cards[card.id];

    if (previousCard.ownerId !== currentCard.ownerId) {
      lines.push(`${card.name}: owner confirmed as ${getOwnerLabel(current, currentCard.ownerId)}`);
      continue;
    }

    const newNotOwners = currentCard.notOwnerIds.filter((playerId) => !previousCard.notOwnerIds.includes(playerId));
    if (newNotOwners.length > 0) {
      lines.push(`${card.name}: ruled out for ${newNotOwners.map((playerId) => getPlayer(current, playerId).name).join(", ")}`);
    }
  }

  const previousProofIds = new Set(previous.proofs.map((proof) => proof.id));
  current.proofs
    .filter((proof) => !previousProofIds.has(proof.id))
    .forEach((proof) => {
      lines.push(`Proof memory stored: ${getPlayer(current, proof.playerId).name} has one of ${getCardNamesText(proof.candidateCardIds)}`);
    });

  const previousExposureIds = new Set(previous.userExposureEvents.map((event) => event.id));
  const newExposureEvents = current.userExposureEvents.filter((event) => !previousExposureIds.has(event.id));

  newExposureEvents
    .filter((event) => event.kind === "exact" && event.cardId)
    .forEach((event) => {
      lines.push(`${getPlayer(current, event.viewerId).name} has definitely seen ${getCardDefinition(event.cardId!).name}`);
    });

  const publicExposureLines = new Map<string, { cardId: CardId; viewerIds: PlayerId[] }>();
  newExposureEvents
    .filter((event) => event.kind === "public" && event.cardId)
    .forEach((event) => {
      const key = event.turnKey ?? `${event.turnIndex}:${event.cardId}`;
      const existing = publicExposureLines.get(key);
      if (existing) {
        existing.viewerIds.push(event.viewerId);
        return;
      }

      publicExposureLines.set(key, {
        cardId: event.cardId as CardId,
        viewerIds: [event.viewerId]
      });
    });

  publicExposureLines.forEach(({ cardId, viewerIds }) => {
    lines.push(`${getCardDefinition(cardId).name}: public proof exposure for ${getPlayerNamesText(current, viewerIds)}`);
  });

  newExposureEvents
    .filter((event) => event.kind === "not-owner" && event.cardId)
    .forEach((event) => {
      lines.push(`${getPlayer(current, event.viewerId).name} now knows you do not have ${getCardDefinition(event.cardId!).name}`);
    });

  const dedupedLines = dedupeSequentialStrings(lines);

  if (dedupedLines.length > 8) {
    return [...dedupedLines.slice(0, 8), `...and ${dedupedLines.length - 8} more board changes.`];
  }

  return dedupedLines;
};

export const getAuditTimelineEntries = (history: HistoryState): AuditTimelineEntry[] => {
  const snapshots = getOrderedHistorySnapshots(history);
  const currentIndex = history.present ? history.past.length : -1;
  let committedTurnCount = 0;

  return snapshots
    .map((snapshot, snapshotIndex) => {
      const previousSnapshot = snapshotIndex > 0 ? snapshots[snapshotIndex - 1] ?? null : null;
      const addedEntriesNewestFirst = getNewAuditEntries(previousSnapshot, snapshot);
      const addedEntries = [...addedEntriesNewestFirst].reverse();
      const primaryEntry =
        addedEntries.find((entry) => entry.kind === "turn" || entry.kind === "manual" || entry.kind === "setup") ??
        addedEntries[addedEntries.length - 1] ??
        null;

      if (primaryEntry?.kind === "turn") {
        committedTurnCount += 1;
      }

      const changeLines = dedupeSequentialStrings(summarizeBoardDiff(previousSnapshot, snapshot));

      return {
        id: primaryEntry?.id ?? `${snapshot.id}:${snapshotIndex}`,
        snapshotIndex,
        kind: primaryEntry?.kind ?? "turn",
        title:
          primaryEntry?.kind === "setup"
            ? "Setup"
            : primaryEntry?.kind === "manual"
              ? "Manual Correction"
              : primaryEntry?.kind === "turn"
                ? `Turn ${committedTurnCount} • ${snapshot.players[primaryEntry.turnIndex]?.name ?? "Unknown detective"}`
                : `Saved State ${snapshotIndex + 1}`,
        summary: primaryEntry?.summary ?? "Saved game state",
        reasoning: primaryEntry?.reasoning ?? "This snapshot can be restored later if you need to return to it.",
        changeLines:
          changeLines.length > 0
            ? changeLines
            : primaryEntry?.kind === "turn"
              ? ["No deduction-board changes were recorded for this turn."]
              : [],
        recordedAt: primaryEntry?.recordedAt ?? snapshot.lastCommittedAt,
        isCurrent: snapshotIndex === currentIndex
      } satisfies AuditTimelineEntry;
    })
    .reverse();
};

export const getExceptionMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "An unexpected error interrupted this case.";

export const isGameAvailable = (state: AppState): boolean => Boolean(state.history.present);

export const createEmptyHistory = () => ({
  past: [],
  present: null,
  future: []
});
