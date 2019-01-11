import { Component } from "@angular/core";
import { DataService } from "~/app/services/data.service";
import { Router } from "@angular/router";
import { Card } from "~/app/models/card.model";

@Component({
    selector: 'input',
    templateUrl: 'input.component.html'
})
export class InputComponent {
    stepNo = 1;
    prevButtText = 'cancel';
    nextButtText = 'next';
    tempArr = [];
    constructor(private data: DataService, private router: Router) { }

    onNextTap() {
        if (this.stepNo === 1) {
            this.stepNo++;
            this.prevButtText = 'prev';
            this.tempArr = [];
            for (let i = 0; i < this.data.input.noPlayers; i++) {
                if (i !== this.data.input.playerPos - 1) {
                    this.tempArr.push(i + 1);
                    this.data.input.playerNames.push('');
                }
            }
            this.data.input.playerNames.push('');
        } else if (this.stepNo === 2) {
            this.stepNo++;
            this.prevButtText = 'prev';
            this.tempArr = [];
            for (let i = 0; i < this.data.input.noPlayers; i++) {
                if (i !== this.data.input.playerPos - 1) {
                    this.tempArr.push(i + 1);
                    this.data.input.playerCardNos.push('');
                }
            }
            this.data.input.playerCardNos.push('');
        } else if (this.stepNo === 3) {
            this.stepNo++;
            this.prevButtText = 'prev';
        } else if (this.stepNo === 4) {
            this.stepNo++;
            this.router.navigate(['game']);
            setTimeout(() => {
                this.stepNo = 1;
                this.nextButtText = 'Next';
                this.prevButtText = 'cancel';
            }, 2000);
        }
        if (this.stepNo === 4) {
            this.nextButtText = 'Start';
        }
    }
    areNamesValid() {
        let okay = true;
        for (let i = 0; i < this.data.input.noPlayers; i++) {
            if (this.data.input.playerNames[i] === '') {
                okay = false;
                break;
            }
        }
        return okay;
    }
    areCardNosValid() {
        let sum = 0;
        let okay = true;
        for (let i = 0; i < this.data.input.noPlayers; i++) {
            let temp = this.data.input.playerCardNos[i];
            if (isNaN(Number(temp))) {
                okay = false;
                break;
            } else {
                sum += Number(temp);
            }
        }
        if (sum === 18) {
            return true;
        } else {
            return false;
        }
    }
    areCardsValid() {
        if (this.data.input.selectedCards.length === Number(this.data.input.playerCardNos[this.data.input.playerPos - 1])) {
            return true;
        } else {
            return false;
        }
    }
    onSliderValueChange() {
        this.tempArr = [];
        this.data.input.playerNames = [];
        this.data.input.playerCardNos = [];
        this.data.input.selectedCards = [];
    }
    onPrevTap() {
        if (this.stepNo === 2) {
            this.stepNo--;
            this.nextButtText = 'next';
        } else if (this.stepNo === 3) {
            this.stepNo--;
            this.nextButtText = 'next';
        } else if (this.stepNo === 4) {
            this.stepNo--;
            this.nextButtText = 'next';
        } else {
            this.router.navigate(['home']);
        }
        if (this.stepNo === 1) {
            this.prevButtText = 'cancel';
        }
    }

    imgTapped(paramType: number, paramInd: number) {
        this.router.navigate(['img'], { queryParams: { type: paramType, ind: paramInd } });
    }

    onCardListTap(event) {
        if (this.isAlreadyThere(this.data.game.cards[event.index])) {
            // remove selection
            for (let i = 0; i < this.data.input.selectedCards.length; i++) {
                if (this.data.input.selectedCards[i] === this.data.game.cards[event.index]) {
                    this.data.input.selectedCards.splice(i, 1);
                    break;
                }
            }
        } else if (this.data.input.selectedCards.length !== Number(this.data.input.playerCardNos[this.data.input.playerPos - 1])) {
            // add selection
            this.data.input.selectedCards.push(this.data.game.cards[event.index]);
        }
    }

    isAlreadyThere(cmp: Card): boolean {
        for (let c of this.data.input.selectedCards) {
            if (c === cmp) {
                return true;
            }
        }
        return false;
    }
}