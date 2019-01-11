import { Card } from "~/app/models/card.model";
import { Injectable } from "@angular/core";

@Injectable()

export class Player{
    name: string;
    noCards: number;
    cards: Card[];
    noFoundCards: number;
    trick2Number: number;

    constructor(paramName: string, paramNoCards: number) {
        this.name = paramName;
        this.noCards = paramNoCards;
        this.noFoundCards = 0;
        this.cards = [];
        for(let i=0;i<this.noCards;i++){
            this.cards.push(new Card(-1, -1, 'question'));
        }
        this.trick2Number = 0
    }
}