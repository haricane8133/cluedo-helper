import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type PropsWithChildren
} from "react";
import {
  advanceTurnFlow,
  applyManualEdit,
  cloneTurnDraft,
  commitTurn,
  continueAfterProofNo,
  continueAfterProofYes,
  continueAfterUserProof,
  createDefaultSetup,
  createEmptyHistory,
  createGameFromSetup,
  createManualEditDraft,
  createTurnDraft,
  getExceptionMessage,
  isDefaultSetup,
  sanitizeSetupDraft,
  setSelectedTab,
  toggleSuggestedCard,
  completeShownCard
} from "@/lib/game";
import { clearPersistedState, loadPersistedState, savePersistedState } from "@/lib/storage";
import type { AppState, GameState, GameTab, PlayerId, SetupDraft, TurnDraft } from "@/lib/types";

type Action =
  | { type: "SET_SETUP"; setup: SetupDraft }
  | { type: "RESET_SETUP" }
  | { type: "START_GAME" }
  | { type: "CLEAR_GAME" }
  | { type: "RESTORE_HISTORY_INDEX"; index: number }
  | { type: "SET_TAB"; tab: GameTab }
  | { type: "START_TURN" }
  | { type: "RESET_TURN" }
  | { type: "SKIP_TURN" }
  | { type: "TOGGLE_SUGGESTED_CARD"; cardId: string }
  | { type: "PROCEED_TURN_SELECTION" }
  | { type: "TURN_PROOF_NO" }
  | { type: "TURN_PROOF_YES" }
  | { type: "TURN_USER_CONTINUE" }
  | { type: "SET_SHOWN_CARD"; cardId: string }
  | { type: "CONFIRM_SHOWN_CARD" }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "OPEN_MANUAL_EDIT"; cardId: string }
  | { type: "CANCEL_MANUAL_EDIT" }
  | { type: "SET_MANUAL_MODE"; mode: "menu" | "owner" | "notOwners" }
  | { type: "TOGGLE_MANUAL_OWNER"; playerId: PlayerId }
  | { type: "TOGGLE_MANUAL_NOT_OWNER"; playerId: PlayerId }
  | { type: "SAVE_MANUAL_EDIT" }
  | { type: "CLEAR_EXCEPTION" };

interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<Action>;
}

const createInitialState = (): AppState => {
  const persisted = loadPersistedState();

  if (!persisted) {
    return {
      setup: createDefaultSetup(),
      history: createEmptyHistory(),
      turnDraft: null,
      manualEdit: null,
      exception: null
    };
  }

  return {
    setup: sanitizeSetupDraft(persisted.setup),
    history: persisted.history,
    turnDraft: persisted.turnDraft,
    manualEdit: persisted.manualEdit,
    exception: null
  };
};

const withEngineGuard = (state: AppState, mutate: () => AppState): AppState => {
  try {
    return {
      ...mutate(),
      exception: null
    };
  } catch (error) {
    return {
      ...state,
      exception: { message: getExceptionMessage(error) }
    };
  }
};

const pushCommittedGame = (state: AppState, nextGame: AppState["history"]["present"]): AppState => {
  const present = state.history.present;
  return {
    ...state,
    history: {
      past: present ? [...state.history.past, present] : state.history.past,
      present: nextGame,
      future: []
    },
    turnDraft: null,
    manualEdit: null,
    exception: null
  };
};

const preserveSelectedTab = (game: GameState | null, selectedTab: GameTab | undefined): GameState | null => {
  if (!game) {
    return null;
  }

  return selectedTab ? setSelectedTab(game, selectedTab) : game;
};

const restoreHistoryIndex = (state: AppState, index: number): AppState => {
  if (state.turnDraft || state.manualEdit) {
    return state;
  }

  const snapshots = state.history.present
    ? [...state.history.past, state.history.present, ...state.history.future]
    : [];

  if (index < 0 || index >= snapshots.length) {
    return state;
  }

  const selectedTab = state.history.present?.selectedTab;

  return {
    ...state,
    history: {
      past: snapshots.slice(0, index),
      present: preserveSelectedTab(snapshots[index] ?? null, selectedTab),
      future: snapshots.slice(index + 1)
    },
    turnDraft: null,
    manualEdit: null,
    exception: null
  };
};

const updateTurnDraft = (state: AppState, updater: (draft: TurnDraft) => TurnDraft | null): AppState => {
  if (!state.turnDraft) {
    return state;
  }

  const workingDraft = cloneTurnDraft(state.turnDraft);
  const result = updater(workingDraft);

  if (result === null) {
    const committed = commitTurn(workingDraft.game, workingDraft);
    return pushCommittedGame(state, committed);
  }

  return {
    ...state,
    turnDraft: result,
    exception: null
  };
};

const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case "SET_SETUP":
      return {
        ...state,
        setup: sanitizeSetupDraft(action.setup)
      };

    case "RESET_SETUP":
      return {
        ...state,
        setup: createDefaultSetup(),
        exception: null
      };

    case "START_GAME":
      return withEngineGuard(state, () => {
        const game = createGameFromSetup(state.setup);
        return {
          ...state,
          history: {
            past: [],
            present: game,
            future: []
          },
          turnDraft: null,
          manualEdit: null
        };
      });

    case "CLEAR_GAME":
      clearPersistedState();
      return {
        setup: createDefaultSetup(),
        history: createEmptyHistory(),
        turnDraft: null,
        manualEdit: null,
        exception: null
      };

    case "RESTORE_HISTORY_INDEX":
      return restoreHistoryIndex(state, action.index);

    case "SET_TAB":
      if (!state.history.present) {
        return state;
      }
      return {
        ...state,
        history: {
          ...state.history,
          present: setSelectedTab(state.history.present, action.tab)
        },
        turnDraft: state.turnDraft
          ? { ...state.turnDraft, game: setSelectedTab(state.turnDraft.game, action.tab) }
          : null
      };

    case "START_TURN":
      if (!state.history.present || state.turnDraft || state.manualEdit) {
        return state;
      }
      if (state.history.present.solutionReady) {
        return {
          ...state,
          history: {
            ...state.history,
            present: setSelectedTab(state.history.present, "suspect")
          },
          exception: null
        };
      }
      return {
        ...state,
        turnDraft: createTurnDraft(state.history.present),
        exception: null
      };

    case "RESET_TURN":
      return {
        ...state,
        turnDraft: null,
        exception: null
      };

    case "SKIP_TURN":
      return withEngineGuard(state, () => {
        if (!state.turnDraft) {
          return state;
        }
        return pushCommittedGame(state, commitTurn(state.turnDraft.game, state.turnDraft));
      });

    case "TOGGLE_SUGGESTED_CARD":
      if (!state.turnDraft) {
        return state;
      }
      return {
        ...state,
        turnDraft: toggleSuggestedCard(state.turnDraft, action.cardId)
      };

    case "PROCEED_TURN_SELECTION":
      return withEngineGuard(state, () => updateTurnDraft(state, (draft) => advanceTurnFlow(draft)));

    case "TURN_PROOF_NO":
      return withEngineGuard(state, () => updateTurnDraft(state, (draft) => continueAfterProofNo(draft)));

    case "TURN_PROOF_YES":
      return withEngineGuard(state, () => updateTurnDraft(state, (draft) => continueAfterProofYes(draft)));

    case "TURN_USER_CONTINUE":
      return withEngineGuard(state, () => updateTurnDraft(state, (draft) => continueAfterUserProof(draft)));

    case "SET_SHOWN_CARD":
      if (!state.turnDraft) {
        return state;
      }
      return {
        ...state,
        turnDraft: {
          ...state.turnDraft,
          shownCardId: action.cardId
        }
      };

    case "CONFIRM_SHOWN_CARD":
      return withEngineGuard(state, () => updateTurnDraft(state, (draft) => {
        completeShownCard(draft);
        return null;
      }));

    case "UNDO": {
      if (state.turnDraft || state.manualEdit || !state.history.present || state.history.past.length === 0) {
        return state;
      }

      const previous = state.history.past[state.history.past.length - 1];
      const nextPast = state.history.past.slice(0, -1);
      return {
        ...state,
        history: {
          past: nextPast,
          present: preserveSelectedTab(previous, state.history.present.selectedTab),
          future: [state.history.present, ...state.history.future]
        },
        exception: null
      };
    }

    case "REDO": {
      if (state.turnDraft || state.manualEdit || !state.history.present || state.history.future.length === 0) {
        return state;
      }

      const [nextPresent, ...nextFuture] = state.history.future;
      return {
        ...state,
        history: {
          past: [...state.history.past, state.history.present],
          present: preserveSelectedTab(nextPresent ?? null, state.history.present.selectedTab),
          future: nextFuture
        },
        exception: null
      };
    }

    case "OPEN_MANUAL_EDIT":
      return withEngineGuard(state, () => {
        if (!state.history.present || state.turnDraft) {
          return state;
        }
        return {
          ...state,
          manualEdit: createManualEditDraft(state.history.present, action.cardId)
        };
      });

    case "CANCEL_MANUAL_EDIT":
      return {
        ...state,
        manualEdit: null,
        exception: null
      };

    case "SET_MANUAL_MODE":
      if (!state.manualEdit) {
        return state;
      }
      return {
        ...state,
        manualEdit: {
          ...state.manualEdit,
          mode: action.mode
        }
      };

    case "TOGGLE_MANUAL_OWNER":
      if (!state.manualEdit) {
        return state;
      }
      return {
        ...state,
        manualEdit: {
          ...state.manualEdit,
          ownerId: state.manualEdit.ownerId === action.playerId ? null : action.playerId
        }
      };

    case "TOGGLE_MANUAL_NOT_OWNER":
      if (!state.manualEdit) {
        return state;
      }
      return {
        ...state,
        manualEdit: {
          ...state.manualEdit,
          notOwnerIds: state.manualEdit.notOwnerIds.includes(action.playerId)
            ? state.manualEdit.notOwnerIds.filter((playerId) => playerId !== action.playerId)
            : [...state.manualEdit.notOwnerIds, action.playerId]
        }
      };

    case "SAVE_MANUAL_EDIT":
      return withEngineGuard(state, () => {
        if (!state.history.present || !state.manualEdit) {
          return state;
        }

        if (state.manualEdit.mode === "menu") {
          return {
            ...state,
            manualEdit: null,
            exception: null
          };
        }

        const nextGame = applyManualEdit(state.history.present, state.manualEdit);
        return pushCommittedGame(state, nextGame);
      });

    case "CLEAR_EXCEPTION":
      return {
        ...state,
        exception: null
      };

    default:
      return state;
  }
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider = ({ children }: PropsWithChildren) => {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);

  useEffect(() => {
    const shouldClear =
      !state.history.present &&
      !state.turnDraft &&
      !state.manualEdit &&
      isDefaultSetup(state.setup);

    if (shouldClear) {
      clearPersistedState();
      return;
    }

    savePersistedState(state);
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state, dispatch]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppState = (): AppState => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppState must be used inside AppProvider.");
  }
  return context.state;
};

export const useAppDispatch = (): Dispatch<Action> => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppDispatch must be used inside AppProvider.");
  }
  return context.dispatch;
};

export const useAppActions = () => {
  const dispatch = useAppDispatch();

  const setSetup = useCallback((setup: SetupDraft) => dispatch({ type: "SET_SETUP", setup }), [dispatch]);
  const resetSetup = useCallback(() => dispatch({ type: "RESET_SETUP" }), [dispatch]);
  const startGame = useCallback(() => dispatch({ type: "START_GAME" }), [dispatch]);
  const clearGame = useCallback(() => dispatch({ type: "CLEAR_GAME" }), [dispatch]);
  const restoreHistory = useCallback((index: number) => dispatch({ type: "RESTORE_HISTORY_INDEX", index }), [dispatch]);
  const setTab = useCallback((tab: GameTab) => dispatch({ type: "SET_TAB", tab }), [dispatch]);
  const startTurn = useCallback(() => dispatch({ type: "START_TURN" }), [dispatch]);
  const resetTurn = useCallback(() => dispatch({ type: "RESET_TURN" }), [dispatch]);
  const skipTurn = useCallback(() => dispatch({ type: "SKIP_TURN" }), [dispatch]);
  const toggleSuggestedCardAction = useCallback(
    (cardId: string) => dispatch({ type: "TOGGLE_SUGGESTED_CARD", cardId }),
    [dispatch]
  );
  const proceedTurnSelection = useCallback(() => dispatch({ type: "PROCEED_TURN_SELECTION" }), [dispatch]);
  const turnProofNo = useCallback(() => dispatch({ type: "TURN_PROOF_NO" }), [dispatch]);
  const turnProofYes = useCallback(() => dispatch({ type: "TURN_PROOF_YES" }), [dispatch]);
  const turnUserContinue = useCallback(() => dispatch({ type: "TURN_USER_CONTINUE" }), [dispatch]);
  const setShownCard = useCallback((cardId: string) => dispatch({ type: "SET_SHOWN_CARD", cardId }), [dispatch]);
  const confirmShownCard = useCallback(() => dispatch({ type: "CONFIRM_SHOWN_CARD" }), [dispatch]);
  const undo = useCallback(() => dispatch({ type: "UNDO" }), [dispatch]);
  const redo = useCallback(() => dispatch({ type: "REDO" }), [dispatch]);
  const openManualEdit = useCallback((cardId: string) => dispatch({ type: "OPEN_MANUAL_EDIT", cardId }), [dispatch]);
  const cancelManualEdit = useCallback(() => dispatch({ type: "CANCEL_MANUAL_EDIT" }), [dispatch]);
  const setManualMode = useCallback(
    (mode: "menu" | "owner" | "notOwners") => dispatch({ type: "SET_MANUAL_MODE", mode }),
    [dispatch]
  );
  const toggleManualOwner = useCallback(
    (playerId: PlayerId) => dispatch({ type: "TOGGLE_MANUAL_OWNER", playerId }),
    [dispatch]
  );
  const toggleManualNotOwner = useCallback(
    (playerId: PlayerId) => dispatch({ type: "TOGGLE_MANUAL_NOT_OWNER", playerId }),
    [dispatch]
  );
  const saveManualEdit = useCallback(() => dispatch({ type: "SAVE_MANUAL_EDIT" }), [dispatch]);
  const clearException = useCallback(() => dispatch({ type: "CLEAR_EXCEPTION" }), [dispatch]);

  return {
    setSetup,
    resetSetup,
    startGame,
    clearGame,
    restoreHistory,
    setTab,
    startTurn,
    resetTurn,
    skipTurn,
    toggleSuggestedCard: toggleSuggestedCardAction,
    proceedTurnSelection,
    turnProofNo,
    turnProofYes,
    turnUserContinue,
    setShownCard,
    confirmShownCard,
    undo,
    redo,
    openManualEdit,
    cancelManualEdit,
    setManualMode,
    toggleManualOwner,
    toggleManualNotOwner,
    saveManualEdit,
    clearException
  };
};
