export type CardCategory = "suspect" | "weapon" | "room";
export type ProveDirection = "clockwise" | "counterclockwise";
export type GameTab = "entity" | "suspect" | "detective" | "audit";
export type CardId = string;
export type PlayerId = string;
export type OwnerId = PlayerId | "__envelope__";
export type AuditKind = "setup" | "turn" | "proof" | "deduction" | "manual";

export interface CardDefinition {
  id: CardId;
  category: CardCategory;
  categoryIndex: number;
  index: number;
  order: number;
  assetCode: string;
  name: string;
}

export interface SetupDraft {
  noPlayers: number;
  playerPos: number;
  step: number;
  proveDirection: ProveDirection;
  playerNames: string[];
  playerCardCounts: string[];
  selectedCardIds: CardId[];
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  cardCount: number;
}

export interface CardState {
  id: CardId;
  ownerId: OwnerId | null;
  notOwnerIds: PlayerId[];
}

export interface ProofRecord {
  id: string;
  playerId: PlayerId;
  candidateCardIds: CardId[];
}

export interface AuditEntry {
  id: string;
  recordedAt: string;
  turnIndex: number;
  kind: AuditKind;
  summary: string;
  reasoning: string;
}

export interface AuditTimelineEntry {
  id: string;
  snapshotIndex: number;
  kind: AuditKind;
  title: string;
  summary: string;
  reasoning: string;
  changeLines: string[];
  recordedAt: string;
  isCurrent: boolean;
}

export interface GameState {
  id: string;
  proveDirection: ProveDirection;
  players: PlayerState[];
  userPlayerId: PlayerId;
  turnIndex: number;
  cards: Record<CardId, CardState>;
  proofs: ProofRecord[];
  auditLog: AuditEntry[];
  selectedTab: GameTab;
  solutionReady: boolean;
  lastCommittedAt: string;
}

export interface TurnDraft {
  game: GameState;
  step: "select" | "ask" | "user-prove" | "user-shown";
  suggestedCardIds: CardId[];
  proveOffset: number;
  currentProverId: PlayerId | null;
  shownCardId: CardId | null;
  userMessage: string;
  eventLog: string[];
}

export interface ManualEditDraft {
  cardId: CardId;
  mode: "menu" | "owner" | "notOwners";
  ownerId: PlayerId | null;
  notOwnerIds: PlayerId[];
}

export interface HistoryState {
  past: GameState[];
  present: GameState | null;
  future: GameState[];
}

export interface AppException {
  message: string;
}

export interface AppState {
  setup: SetupDraft;
  history: HistoryState;
  turnDraft: TurnDraft | null;
  manualEdit: ManualEditDraft | null;
  exception: AppException | null;
}

export interface PersistedAppState {
  version: 1;
  setup: SetupDraft;
  history: HistoryState;
  turnDraft: TurnDraft | null;
  manualEdit: ManualEditDraft | null;
}
