import { Card } from "~/app/models/card.model";
import { Player } from "~/app/models/player.model";

export class DataService{

    public input: {
        noPlayers: number,
        playerPos: number,
        playerNames: string[],
        playerCardNos: string[],
        selectedCards: Card[]
    } = {
        noPlayers: 3,
        playerPos: 1,
        playerNames: [],
        playerCardNos: [],
        selectedCards: undefined
    };

    memoryController: {
        top: number,
        cur: number
    } = {
        top: 0,
        cur: 0
    }

    public game: {
        //everything is kept here in a 0 based index
        cards: Card[],
        suspects: Card[],
        players: Player[],
        user: Player,
        noPlayers: number,
        selectedTab: number,
        play: {
            turnNo: number
        }
    } = {
        cards: undefined,
        suspects: undefined,
        players: undefined,
        user: undefined,
        noPlayers: 0,
        selectedTab: 0,
        play: {
            turnNo: 0
        }
    };

    constructor() {
        this.input.selectedCards=[];
        this.game.cards=[];
        this.game.players=[];
        this.fillCards();
    }

    fillCards() {
        this.game.cards = [];
        this.game.cards.push(new Card(0, 0, "Miss Peacock"));
        this.game.cards.push(new Card(0, 1, "Colonel Mustard"));
        this.game.cards.push(new Card(0, 2, "Professor Plum"));
        this.game.cards.push(new Card(0, 3, "Scarlett"));
        this.game.cards.push(new Card(0, 4, "Reverend Green"));
        this.game.cards.push(new Card(0, 5, "Mrs White"));
        this.game.cards.push(new Card(1, 0, "Dagger"));
        this.game.cards.push(new Card(1, 1, "Rope"));
        this.game.cards.push(new Card(1, 2, "Candle Stick"));
        this.game.cards.push(new Card(1, 3, "Revolver"));
        this.game.cards.push(new Card(1, 4, "Lead Pipe"));
        this.game.cards.push(new Card(1, 5, "Spanner"));
        this.game.cards.push(new Card(2, 0, "Hall"));
        this.game.cards.push(new Card(2, 1, "Ball Room"));
        this.game.cards.push(new Card(2, 2, "Lounge"));
        this.game.cards.push(new Card(2, 3, "Library"));
        this.game.cards.push(new Card(2, 4, "Study"));
        this.game.cards.push(new Card(2, 5, "Dining Room"));
        this.game.cards.push(new Card(2, 6, "Billiard Room"));
        this.game.cards.push(new Card(2, 7, "Kitchen"));
        this.game.cards.push(new Card(2, 8, "Conservatory"));

        this.game.suspects = [];
        this.game.suspects.push(this.game.cards[0]);
        this.game.suspects.push(this.game.cards[1]);
        this.game.suspects.push(this.game.cards[2]);
        this.game.suspects.push(this.game.cards[3]);
        this.game.suspects.push(this.game.cards[4]);
        this.game.suspects.push(this.game.cards[5]);
        this.game.suspects.push(this.game.cards[6]);
        this.game.suspects.push(this.game.cards[7]);
        this.game.suspects.push(this.game.cards[8]);
        this.game.suspects.push(this.game.cards[9]);
        this.game.suspects.push(this.game.cards[10]);
        this.game.suspects.push(this.game.cards[11]);
        this.game.suspects.push(this.game.cards[12]);
        this.game.suspects.push(this.game.cards[13]);
        this.game.suspects.push(this.game.cards[14]);
        this.game.suspects.push(this.game.cards[15]);
        this.game.suspects.push(this.game.cards[16]);
        this.game.suspects.push(this.game.cards[17]);
        this.game.suspects.push(this.game.cards[18]);
        this.game.suspects.push(this.game.cards[19]);
        this.game.suspects.push(this.game.cards[20]);
    }
}