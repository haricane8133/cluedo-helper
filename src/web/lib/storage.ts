import { DEFAULT_TAB } from "./constants";
import type { AppState, GameState, GameTab, HistoryState, PersistedAppState } from "./types";
import { createDefaultSetup, createEmptyHistory, sanitizeSetupDraft } from "./game";

const STORAGE_KEY = "cluedo-helper::state::v1";

const isValidTab = (tab: unknown): tab is GameTab =>
  tab === "entity" || tab === "suspect" || tab === "detective" || tab === "audit";

const normalizeGame = (game: GameState | null | undefined): GameState | null => {
  if (!game) {
    return null;
  }

  return {
    ...game,
    proofs: Array.isArray(game.proofs) ? game.proofs : [],
    auditLog: Array.isArray(game.auditLog) ? game.auditLog : [],
    selectedTab: isValidTab(game.selectedTab) ? game.selectedTab : DEFAULT_TAB,
    lastCommittedAt: game.lastCommittedAt ?? new Date().toISOString()
  };
};

const normalizeHistory = (history: HistoryState | null | undefined): HistoryState => {
  if (!history) {
    return createEmptyHistory();
  }

  return {
    past: Array.isArray(history.past)
      ? history.past.map((game) => normalizeGame(game)).filter(Boolean) as GameState[]
      : [],
    present: normalizeGame(history.present),
    future: Array.isArray(history.future)
      ? history.future.map((game) => normalizeGame(game)).filter(Boolean) as GameState[]
      : []
  };
};

export const loadPersistedState = (): PersistedAppState | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PersistedAppState;
    if (parsed.version !== 1) {
      return null;
    }

    const history = normalizeHistory(parsed.history);
    const normalizedTurnGame = parsed.turnDraft ? normalizeGame(parsed.turnDraft.game) : null;

    return {
      version: 1,
      setup: sanitizeSetupDraft(parsed.setup ?? createDefaultSetup()),
      history,
      turnDraft: parsed.turnDraft && normalizedTurnGame
        ? {
            ...parsed.turnDraft,
            game: normalizedTurnGame,
            eventLog: Array.isArray(parsed.turnDraft.eventLog)
              ? parsed.turnDraft.eventLog.filter((entry): entry is string => typeof entry === "string")
              : []
          }
        : null,
      manualEdit: parsed.manualEdit ?? null
    };
  } catch {
    return null;
  }
};

export const savePersistedState = (state: AppState): void => {
  if (typeof window === "undefined") {
    return;
  }

  const payload = {
    version: 1,
    setup: sanitizeSetupDraft(state.setup),
    history: state.history,
    turnDraft: state.turnDraft,
    manualEdit: state.manualEdit
  } satisfies PersistedAppState;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

export const clearPersistedState = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
};
