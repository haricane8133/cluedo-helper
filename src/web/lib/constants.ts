import type { CardCategory, CardDefinition, CardId, GameTab, ProveDirection } from "./types";

const createCard = (
  category: CardCategory,
  categoryIndex: number,
  index: number,
  order: number,
  name: string
): CardDefinition => ({
  id: `${category}-${index}`,
  category,
  categoryIndex,
  index,
  order,
  assetCode: `${categoryIndex}${index}`,
  name
});

export const CARD_DEFINITIONS: CardDefinition[] = [
  createCard("suspect", 0, 0, 0, "Miss Peacock"),
  createCard("suspect", 0, 1, 1, "Colonel Mustard"),
  createCard("suspect", 0, 2, 2, "Professor Plum"),
  createCard("suspect", 0, 3, 3, "Scarlett"),
  createCard("suspect", 0, 4, 4, "Reverend Green"),
  createCard("suspect", 0, 5, 5, "Mrs White"),
  createCard("weapon", 1, 0, 6, "Dagger"),
  createCard("weapon", 1, 1, 7, "Rope"),
  createCard("weapon", 1, 2, 8, "Candle Stick"),
  createCard("weapon", 1, 3, 9, "Revolver"),
  createCard("weapon", 1, 4, 10, "Lead Pipe"),
  createCard("weapon", 1, 5, 11, "Spanner"),
  createCard("room", 2, 0, 12, "Hall"),
  createCard("room", 2, 1, 13, "Ball Room"),
  createCard("room", 2, 2, 14, "Lounge"),
  createCard("room", 2, 3, 15, "Library"),
  createCard("room", 2, 4, 16, "Study"),
  createCard("room", 2, 5, 17, "Dining Room"),
  createCard("room", 2, 6, 18, "Billiard Room"),
  createCard("room", 2, 7, 19, "Kitchen"),
  createCard("room", 2, 8, 20, "Conservatory")
];

export const CARD_DEFINITION_MAP = Object.fromEntries(
  CARD_DEFINITIONS.map((card) => [card.id, card])
) as Record<CardId, CardDefinition>;

export const CARD_IDS = CARD_DEFINITIONS.map((card) => card.id);
export const CARD_CATEGORIES: CardCategory[] = ["suspect", "weapon", "room"];
export const DEFAULT_TAB: GameTab = "entity";
export const DEFAULT_PROVE_DIRECTION: ProveDirection = "clockwise";

export const CATEGORY_LABELS: Record<CardCategory, string> = {
  suspect: "Suspects",
  weapon: "Weapons",
  room: "Rooms"
};

export const TAB_LABELS: Record<GameTab, string> = {
  entity: "Card View",
  suspect: "Suspect View",
  detective: "Detective View",
  audit: "Timeline"
};

const PUBLIC_URL_BASE = process.env.PUBLIC_URL_BASE ?? "";
const withPublicPath = (assetPath: string): string => `${PUBLIC_URL_BASE}${assetPath}`;

export const LOGO_IMAGE_PATH = withPublicPath("Assets/Wide310x150Logo.scale-200.png");
export const PLAY_ICON_PATH = withPublicPath("Assets/play_google_icon.png");
export const QUESTION_CARD_IMAGE_PATH = withPublicPath("Assets/Cluedo Cards/question.jpg");
export const QUESTION_TOKEN_IMAGE_PATH = withPublicPath("Assets/Cluedo Tokens/question.jpg");

export const getCardDefinition = (cardId: CardId): CardDefinition => CARD_DEFINITION_MAP[cardId];

export const getCardsForCategory = (category: CardCategory): CardDefinition[] =>
  CARD_DEFINITIONS.filter((card) => card.category === category);

export const getCardImagePath = (cardId: CardId): string => {
  const card = getCardDefinition(cardId);
  return withPublicPath(`Assets/Cluedo Cards/${card.assetCode}.jpg`);
};

export const getTokenImagePath = (cardId: CardId): string => {
  const card = getCardDefinition(cardId);
  return withPublicPath(`Assets/Cluedo Tokens/${card.assetCode}.jpg`);
};
