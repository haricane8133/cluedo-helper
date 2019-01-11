import { Component, OnInit} from "@angular/core";
import { DataService } from "~/app/services/data.service";
import { Player } from "~/app/models/player.model";
import { Router, ActivatedRoute } from "@angular/router";
import { Card } from "~/app/models/card.model";
import * as Toast from 'nativescript-toast';
import { Vibrate } from 'nativescript-vibrate';
import { Location } from '@angular/common';

@Component({
    selector: 'app-game',
    templateUrl: 'game.component.html'
})
export class GameComponent{

    // These are the data that the game componenent uses
    gameViewController = {
        stepNo: 0,
        isProceedButt: false,
        suspectedCards: [],
        noprove: 1,
        playerToprove: undefined,
        userproveText: undefined,
        cardShownToUser: undefined
    };
    gameViewMode: number = 1;
    markPlayer: Player = undefined;
    markCard: Card = undefined;
    gameOver: boolean = false;
    canToast = false;

    skipTurnButt = false;

    manualEditMode = 0;
    manualChosenNotOwners = [];
    

    constructor(private data: DataService, private router: Router, private location: Location) {
        this.initGameData();
    }

    // This is the initialization function
    initGameData() {
        this.data.game.noPlayers = this.data.input.noPlayers;
        this.data.game.players = [];
        for(let i = 0;i<this.data.input.noPlayers;i++){
            this.data.game.players.push(new Player(this.data.input.playerNames[i], Number(this.data.input.playerCardNos[i])));
        }
        this.data.game.user = this.data.game.players[this.data.input.playerPos-1];

        // this is for initializing all the cards with the trick2 object that takes as key the player name and returns the trick2 numbers array
        for(let i=0;i<21;i++) {
            for(let j=0;j<this.data.game.noPlayers;j++) {
                this.data.game.cards[i].trick2[this.data.game.players[j].name] = [];
            }
        }

        // the following for loop is to assign to the user the cards he has chosen from the main cards[] with help from the data.input.selectedCards
        // so that a reference is maintained between the players[] and the cards[]
        this.markPlayer = this.data.game.user;
        for(let c of this.data.input.selectedCards){
            for(let i=0;i<21;i++){
                if(c === this.data.game.cards[i]){
                    // the following part is to add as owner "this.data.game.user" to the card "this.data.game.cards[i]"
                    this.markCard = this.data.game.cards[i];
                    this.addOwnerFunc();
                }
            }
        }
        for(let i=0;i<21;i++){
            let isPresent: boolean = false;
            for(let c of this.data.input.selectedCards){
                if(c === this.data.game.cards[i]){
                    isPresent = true;
                    break;
                }
            }
            if(!isPresent){
                this.markCard = this.data.game.cards[i];
                this.addNotOwnerFunc();
            }
        }
        this.canToast = true;
        this.skipTurnButt = false;
    }

    // This is where a turn starts
    playTapped() {
        this.gameViewMode = 2;
        this.refreshGameViewController();
        this.gameViewController.isProceedButt = false;
        this.skipTurnButt = true;
    }

    refreshGameViewController() {
        this.gameViewController.stepNo = 0;
        this.gameViewController.isProceedButt = true;
        this.gameViewController.suspectedCards = [];
        this.gameViewController.noprove = 1;
        this.gameViewController.playerToprove = undefined;
        this.gameViewController.userproveText = "";
        this.gameViewController.cardShownToUser = undefined;
    }

    // Function gets fired everytime you make a selection in the card list
    onCardListTap(event) {
        if(this.gameViewController.stepNo === 0){
            // if the list is being used for the purpose of selection of Suspected cards
            if(this.isAlreadyThere(this.data.game.cards[event.index])){
                // remove selection
                for(let i=0;i<this.gameViewController.suspectedCards.length;i++){
                    if(this.gameViewController.suspectedCards[i] === this.data.game.cards[event.index]){
                        this.gameViewController.suspectedCards.splice(i, 1);
                        break;
                    }
                }
            } else if(this.gameViewController.suspectedCards.length !== 3){
                // add selection
                this.gameViewController.suspectedCards.push(this.data.game.cards[event.index]);
            }
    
            if(this.gameViewController.suspectedCards.length === 3 && this.gameViewController.suspectedCards[0].type != this.gameViewController.suspectedCards[1].type && this.gameViewController.suspectedCards[0].type != this.gameViewController.suspectedCards[2].type && this.gameViewController.suspectedCards[1].type != this.gameViewController.suspectedCards[2].type) {
                this.gameViewController.isProceedButt = true;
            }
            else {
                this.gameViewController.isProceedButt = false;
            }
        } else if(this.gameViewController.stepNo === 3){
            // if the list is being used for the purpose of choosing the card that was shown to the user
            for(let i=0;i<21;i++){
                if(this.data.game.cards[i] === this.gameViewController.suspectedCards[event.index]){
                    this.gameViewController.cardShownToUser = this.data.game.cards[i];
                    break;
                }
            }
            this.gameViewController.isProceedButt = true;
        }
    }



    addOwnerFunc() {
        if(this.markPlayer === undefined){
            // if undefined, no need to add
            return;
        }
        if(this.isAlreadyOwner()){
            // this means that we have already deduced the card
            return;
        }
        // this function adds the card 'this.markCard' to the player 'this.markPlayer'
        if(this.markPlayer.noFoundCards === this.markPlayer.noCards){
            // this means that there is a fault in the proceedings
            this.router.navigate(['exception']);
        } else{
            let error = false;
            // Check if any other player is found to have the same card
            for(let i=0;i<this.data.game.noPlayers;i++) {
                if(this.data.game.players[i] != this.markPlayer){
                    for(let card of this.data.game.players[i].cards){
                        if(card === this.markCard){
                            error = true;
                            console.log('2.1');
                            break;
                        }
                    }
                }
                if(error){
                    break;
                }
            }

            // Check if the same player is marked as notOwner of the card
            for(let player of this.markCard.notOwners) {
                if(this.markPlayer === player){
                    error = true;
                    console.log('2.2 and ' + this.markPlayer.name + ' is equal to ' + player.name);
                    break;
                }
            }

            if(!error){
                // If there are no errors found
                // here we add the card to the owner's array
                this.markPlayer.cards[this.markPlayer.noFoundCards] = this.markCard;
                this.markPlayer.noFoundCards++;
                //here, we add the owner to the card
                this.markCard.owner = this.markPlayer;
                // here we add the rest of the players to the card's array
                this.markCard.notOwners = [];
                for(let i=0;i<this.data.game.noPlayers;i++){
                    if(this.data.game.players[i] !== this.markPlayer){
                        this.markCard.notOwners.push(this.data.game.players[i]);
                    }
                }
                // this part is to refresh the suspects array
                for(let i=0;i<this.data.game.suspects.length;i++){
                    if(this.data.game.suspects[i] === this.markCard){
                        this.data.game.suspects.splice(i, 1);
                        break;
                    }
                }

                // Trick2 must be evaluated
                // but this trick is done only if the player is not the user
                if(!(this.markPlayer === this.data.game.user)) {
                    // now trick2 is evaluated on the 'this.markCard'
                    // here, evaluated means removed,,, as for newOwner, there is no use of anything
                    for(let i=0;i<this.markCard.trick2[this.markPlayer.name].length;i++) {
                        let mark = this.markCard.trick2[this.markPlayer.name][i];
                        this.markCard.trick2[this.markPlayer.name].splice(i, 1);
                        i=-1;
                        for(let j=0;j<21;j++) {
                            if(!(this.data.game.cards[j] === this.markCard)){
                                for(let k=0;k<this.data.game.cards[j].trick2[this.markPlayer.name].length;k++) {
                                    if(this.data.game.cards[j].trick2[this.markPlayer.name][k] === mark){
                                        this.data.game.cards[j].trick2[this.markPlayer.name].splice(k,1);
                                        k=-1;
                                    }
                                }
                            }
                        }
                    }
                }

                if(this.canToast){
                    let vibrator = new Vibrate();
                    vibrator.vibrate(100);
                    Toast.makeText(this.markPlayer.name + ' has ' + this.markCard.name).show();
                }
            } else {
                // error
                this.router.navigate(['exception']);
                console.log(2);
            }
        }
    }

    // this function is used in manualEditMode
    removeOwnerFunc() {
        console.log('removeOwnerFunc');
        // this function operates the card 'this.markCard' and 'this.markPlayer'
        if(this.markPlayer === undefined) {
            //there is no need to remove
        } else {
            this.markCard.notOwners = [];
            if(this.markCard.owner.trick2Number === -1){
                // we need to add other cards of the same type into the suspects array as they would have been removed earlier
                this.markCard.owner = undefined;
                // we need to append cards of type 'this.markCard.type' those that do not have an owner defined
                for(let i=0;i<21;i++){
                    if((this.data.game.cards[i].type === this.markCard.type) && (this.data.game.cards[i].owner === undefined) && !(this.data.game.cards[i] === this.markCard)){
                        this.data.game.suspects.push(this.data.game.cards[i]);
                    }
                }
            } else {
                // this is the actual remove process where we add a dummy 'question' card if a card is removed
                for(let i=0;i<this.markPlayer.cards.length;i++) {
                    if(this.markPlayer.cards[i] === this.markCard){
                        this.markPlayer.cards.splice(i, 1);
                        this.markPlayer.cards.push(new Card(-1, -1, "question"));
                        this.markPlayer.noFoundCards--;
                        this.markCard.owner = undefined;
                        break;
                    }
                }
                // we need to simply add 'this.markCard' to the suspets array
                this.data.game.suspects.push(this.markCard);
            }

            // we need to sort the suspects array properly
            this.data.game.suspects.sort(this.compare);
        }
    }

    // this function is the aux function to compare suspects array
    compare (a: Card, b: Card): number{
        let acnt = a.type * 10;
        let bcnt = b.type * 10;
        acnt += a.ind;
        bcnt += b.ind;
        return acnt-bcnt;
    }

    isAlreadyOwner(): boolean {
        // checks with the card 'this.markCard' and the player 'this.markPlayer'
        let ans = false;
        for(let j=0;j<this.markPlayer.cards.length;j++){
            if(this.markPlayer.cards[j] === this.markCard){
                ans = true;
                break;
            }
        }
        return ans;
    }

    addNotOwnerFunc() {
        // this function marks the card denoted by 'this.markCard'
        // with the player denoted by 'this.markPlayer'

        for(let i of this.markPlayer.cards){
            if(i === this.markCard){
                // this means error as we are trying to mark a card as notOwner when we know that it is owned by the player
                this.router.navigate(['exception']);
                console.log(3);
                return;
            }
        }

        if(this.isAlreadyNotOwner()){
            // the card and the owner are already marked as notOwner
        } else {
            this.markCard.notOwners.push(this.markPlayer);
            this.checkNotOwnerFill();

            if(this.canToast){
                let vibrator = new Vibrate();
                vibrator.vibrate(100);
                Toast.makeText(this.markPlayer.name + ' doesn\'t have ' + this.markCard.name).show();
            }

            // Trick2 must be evaluated
            // Here is exactly the place where the trick will yeild useful answers
            for(let i=0;i<this.markCard.trick2[this.markPlayer.name].length;i++) {
                let mark = this.markCard.trick2[this.markPlayer.name][i];
                this.markCard.trick2[this.markPlayer.name].splice(i, 1);
                i=-1;
                let remaining = [];
                for(let j=0;j<21;j++) {
                    if(!(this.data.game.cards[j] === this.markCard)) {
                        for(let k=0;k<this.data.game.cards[j].trick2[this.markPlayer.name].length;k++) {
                            if(this.data.game.cards[j].trick2[this.markPlayer.name][k] === mark){
                                remaining.push({j, k});
                            }
                        }
                    }
                }
                if(remaining.length === 1) {
                    // this means that 'this.markPlayer' showed the card 'this.data.game.cards[remaining[0].j]' and owns it
                    this.data.game.cards[remaining[0].j].trick2[this.markPlayer.name].splice(remaining[0].k, 1);
                    this.markCard = this.data.game.cards[remaining[0].j];
                    this.addOwnerFunc();
                } else if(remaining.length === 2) {
                    // this means that one card has been ruled out from an old list of suspected cards (X3)
                } else {
                    // this signifies an error as we can only have three max and one already deleted
                    this.router.navigate(['exception']);
                    console.log(4);
                }
            }
        }
    }

    // this function is called to remove one by one the notOwners
    // this function is used in manualEditMode
    removeNotOwnerFunc() {
        // operates on 'this.markCard' for 'this.markPlayer'
        if(this.markPlayer === undefined){
            // no need to do anything if the markPlayer is undefined
            return;
        }

        if(this.isAlreadyNotOwner()){
            // remove here
            for(let i=0;i<this.markCard.notOwners.length;i++) {
                if(this.markCard.notOwners[i] === this.markPlayer) {
                    this.markCard.notOwners.splice(i, 1);
                    break;
                }
            }
        } else {
            // there is no need to do anything as 'this.markCard' is not marked with 'this.markPlayer'
        }
    }

    isAlreadyNotOwner(): boolean {
        // checks with the card 'this.markCard' and the player 'this.markPlayer'
        let ans = false;
        for(let j=0;j<this.markCard.notOwners.length;j++){
            if(this.markCard.notOwners[j] === this.markPlayer){
                ans = true;
                break;
            }
        }
        return ans;
    }

    checkNotOwnerFill() {
        // checks with the card 'this.markCard'
        if(this.markCard.notOwners.length === this.data.game.noPlayers) {
            // the card 'this.markCard' belongs in the envelope and hence we need to remove all the other cards of the same type from the suspects array
            // this part is to refresh the suspects array
            this.markCard.owner = new Player('The Culprit!', 3);
            this.markCard.owner.trick2Number = -1;
            for(let i=0;i<this.data.game.suspects.length;i++){
                if(!(this.data.game.suspects[i] === this.markCard) && (this.data.game.suspects[i].type === this.markCard.type)){
                    this.data.game.suspects.splice(i, 1);
                    i=-1;
                }
            }

            if(this.canToast) {
                let vibrator = new Vibrate();
                vibrator.vibrate(500);
                Toast.makeText(this.markCard.name + ' is responsible for murder!', 'long').show();
            }
        }
    }

    imgTapped(paramType: number, paramInd: number) {
        if(paramType === -1){
            // the following is just a shortcut to overcome the hardcoded code in the imageComponent
            this.router.navigate(['img'], {queryParams: {type: 'ques', ind: 'tion'}});
        } else {
            this.router.navigate(['img'], {queryParams: {type: paramType, ind: paramInd}});
        }
    }

    isAlreadyThere(cmp: Card): boolean {
        for(let c of this.gameViewController.suspectedCards){
            if(c === cmp){
                return true;
            }
        }
        return false;
    }

    onProceedClick() {
        if(this.gameViewController.stepNo === 0){
            // if the list is being used for the purpose of selection of Suspected cards
            this.gameViewController.isProceedButt = false;
            this.gameViewController.playerToprove = this.data.game.play.turnNo - this.gameViewController.noprove;
            if(this.gameViewController.playerToprove<0) {
                this.gameViewController.playerToprove += this.data.game.noPlayers;
            }
            if(this.data.game.players[this.gameViewController.playerToprove] === this.data.game.user){
                // it is the users chance to prove
                this.userToprove();
            }
            else {
                this.gameViewController.stepNo = 1;
            }
            /*this.gameViewController.noprove++;
            if(this.gameViewController.noprove === this.data.game.noPlayers) {
                this.gameViewController.noprove=1;
                this.gameViewController.stepNo=1;
            }*/
        }else if(this.gameViewController.stepNo === 3){
            // if the list is being used for the purpose of choosing the card that was shown to the user
            this.shownToUser();
            this.gameViewController.isProceedButt = false;
        }
    }

    shownToUser(){
        // the card shown to the user is 'this.gameViewController.cardShownToUser'
        // the card is shown by 'this.markPlayer'
        // the player is already added to this.markPlayer
        this.markCard = this.gameViewController.cardShownToUser;
        this.addOwnerFunc();
        this.endTurn();
    }

    proved() {
        this.markPlayer = this.data.game.players[this.gameViewController.playerToprove];
        if(this.data.game.players[this.data.game.play.turnNo] === this.data.game.user){
            // a card is shown to the user
            // the following line is to find out which card was shown to the user
            this.gameViewController.stepNo=3;
        }
        else{
            // the player with the index 'this.gameViewController.playerToprove' has proved one of the cards given by 'this.gameViewController.suspectedCards'
            // Trick 1:- we find out the whether among the three suspected cards, we know about the presence of two of them elsewhere (belonging to other players). if so , it becomes easy for us to declare that the particular card was shown
            // but this trick can be run only if we do not know any suspected cards pocessed by the player
            this.trick1Init(); // this will automatically call the trick2 Init Function
            // Trick 2:- this trick, done in case the previous step yeilds more than one card (this is the famous trick that you have)
            this.endTurn();
        }
    }

    trick1Init() {
        // this part is to check whether the player ('this.markPlayer') has any of the suspected cards
        // if he has those cards, then the two tricks cannot be used
        let tricksPossible: boolean = true;
        for(let i=0;i<3;i++){
            for(let j=0;j<this.markPlayer.noFoundCards;j++){
                if(this.gameViewController.suspectedCards[i] === this.markPlayer.cards[j]){
                    tricksPossible = false;
                    break;
                }
            }
            if(!tricksPossible){
                break;
            }
        }

        // returns and stops the function if the trick cannot be used
        if(!tricksPossible){
            return;
        }

        // Trick 1:- we find out the whether among the three suspected cards, we know about the presence of two of them elsewhere (belonging to other players). if so , it becomes easy for us to declare that the particular card was shown
        // this array contains the list of index not possible to have been shown by the player ('this.markPlayer')
        let notShown: number[] = [];
        // this loop runs through the list of suspected cards
        for(let i=0;i<3;i++){
            let cont: boolean = false;
            // this loop runs through the notOwners array of the card focussed by the parent loop and this is done to scan for the presence of the proving player in the array
            for(let j=0;j<this.gameViewController.suspectedCards[i].notOwners.length;j++){
                if(this.gameViewController.suspectedCards[i].notOwners[j] === this.markPlayer){
                    notShown.push(i);
                    cont = true;
                    break;
                }
            }
            // this if runs only if the card is not overruled by the above loop
            if(!cont){
                // this loop checks the presence of the card choosed by the parent loop among the other players in order to rule out the card
                for(let j=0;j<this.data.game.noPlayers;j++){
                    cont = false;
                    if(this.data.game.players[j] === this.markPlayer){
                        continue;
                    }
                    for(let k=0;k<this.data.game.players[j].noCards;k++){
                        if(this.gameViewController.suspectedCards[i] === this.data.game.players[j].cards[k]){
                            notShown.push(i);
                            cont=true;
                            break;
                        }
                    }
                    if(cont){
                        break;
                    }
                }
            }
        }
        if(notShown.length === 3){
            // this if means that the player could not have proved any card, but still in the game the player has proved, that indicates that something is wrong with the app
            this.router.navigate(['exception']);
            console.log(5);
        } else if(notShown.length === 2){
            // this means that the player who proved, does not have two of the three suspected cards, and hence we can mark the remaining suspected card with owner = the player ('this.markPlayer')
            // this loop gets the index that was not pushed into the notShown array
            for(let k=0;k<3;k++){
                let okay:boolean = false;
                for(let j=0;j<2;j++){
                    if(notShown[j] === k){
                        okay = true;
                        break;
                    }
                }
                if(!okay){
                    // now, k is the indice among the this.gameViewController.suspectedCards[] that was shown by the user
                    this.markCard = this.gameViewController.suspectedCards[k];
                    this.addOwnerFunc();
                }
            }
        } else if(notShown.length === 1){
            // Trick1 cannot deduct anything and hence we need to pass over the two remaining cards to be marked by the trick2
            let remainingCards = [0, 1, 2];
            remainingCards.splice(notShown[0], 1);
            this.trick2Init(remainingCards);
        } else if(notShown.length === 0){
            // Trick1 cannot deduct anything and hence we need to pass over the remaining cards to be marked by the trick2
            let remainingCards = [0, 1, 2];
            this.trick2Init(remainingCards);
        }
    }

    // this function gets an array containing the index of cards in the 'this.gameController.suspectedCards'
    trick2Init(remainingCards) {
        for(let i=0;i<remainingCards.length;i++) {
            this.gameViewController.suspectedCards[remainingCards[i]].trick2[this.markPlayer.name].push(this.markPlayer.trick2Number);
        }
        this.markPlayer.trick2Number++;
    }

    notproved() {
        // the player with the index 'this.gameViewController.playerToprove' does not have the cards given by 'this.gameViewController.suspectedCards'
        this.markPlayer = this.data.game.players[this.gameViewController.playerToprove];
        for(let i=0;i<3;i++){
            this.markCard = this.gameViewController.suspectedCards[i];
            this.addNotOwnerFunc();            
        }
        this.rite();
    }

    userDone() {
        // user is done proving/not proving
        if(this.gameViewController.userproveText !== "You don't have a card to prove"){
            this.endTurn();
        } else {
            this.gameViewController.userproveText = "";
            this.gameViewController.stepNo = 1;
            this.rite();
        }
    }

    userToprove() {
        this.gameViewController.stepNo = 2;
        let cnt = 0;
        for(let i=0;i<this.data.game.user.cards.length;i++) {
            for(let j=0;j<3;j++){
                if(this.data.game.user.cards[i] === this.gameViewController.suspectedCards[j]){
                    cnt++;
                }
            }
        }
        if(cnt===0){
            this.gameViewController.userproveText="You don't have a card to prove";
        }
        else if(cnt===1){
            this.gameViewController.userproveText="Click on this card to show";
        }
        else {
            this.gameViewController.userproveText="Click on one of the cards to show";
        }
    }

    rite() {
        // this function is run to continue the prove chain
        this.gameViewController.noprove++;
        this.gameViewController.playerToprove = this.data.game.play.turnNo - this.gameViewController.noprove;
        if(this.gameViewController.playerToprove<0) {
            this.gameViewController.playerToprove += this.data.game.noPlayers;
        }
        if(this.gameViewController.noprove === this.data.game.noPlayers){
            // every body has finished their chance to prove
            // 'gameloop' finished
            this.endTurn();
        }
        else if(this.data.game.players[this.gameViewController.playerToprove] === this.data.game.user){
            // it is the users chance to prove
            this.userToprove();
        }
    }

    endTurn() {
        this.checkGameover();
        this.refreshGameViewController();
        this.data.game.play.turnNo++;
        if(this.data.game.play.turnNo === this.data.game.noPlayers) {
            this.data.game.play.turnNo = 0;
        }
        if(this.data.game.players[this.data.game.play.turnNo] === this.data.game.user && this.gameOver){
            this.gameViewMode = 3;
        } else {
            this.gameViewMode = 1;
            // update the memory for the undo redo feature
        }
    }

    checkGameover() {
        // check for game over
        // if game is over, then notify the user to use this the next time in his turn
        if(this.data.game.suspects.length === 3) {
            if(this.data.game.suspects[0].type != this.data.game.suspects[1].type && this.data.game.suspects[0].type != this.data.game.suspects[2].type && this.data.game.suspects[1].type != this.data.game.suspects[2].type){
                this.gameOver = true;
                if(this.canToast) {
                    let vibrator = new Vibrate();
                    vibrator.vibrate(2000);
                    setTimeout(() => {
                        vibrator.vibrate(2000);
                    }, 200);
                    Toast.makeText('The deduction is Complete! Wait for your turn', 'long').show();
                }
            } else{
                this.router.navigate(['exception']);
                console.log(6);
            }
        }
        else if(this.data.game.suspects.length < 3){
            this.router.navigate(['exception']);
            console.log(7);
        }
    }

    onEntityListTap(event) {
        this.markCard = this.data.game.cards[event.index];
        this.markPlayer = this.markCard.owner;
        this.gameViewMode = 4;
    }

    manualEditModeChange(mode){
        this.manualEditMode = mode;
        if(mode === 2) {
            // initialize with the pre existing notOwners
            this.manualChosenNotOwners = [];
            for(let i of this.markCard.notOwners) {
                this.manualChosenNotOwners.push(i);
            }
        }
    }

    onManualEditOwner(event){
        this.markPlayer = this.markCard.owner;
        this.removeOwnerFunc();
        
        if(this.markPlayer === this.data.game.players[event.index]) {
            this.markPlayer = undefined;
        } else {
            this.markPlayer = this.data.game.players[event.index];
        }
    }

    onManualEditNotOwner(event){
        this.markPlayer = this.markCard.owner;
        this.removeOwnerFunc();
        this.markCard.notOwners = [];

        this.markPlayer = this.data.game.players[event.index];

        if(this.isManualNotOwnerSelected(this.markPlayer)){
            // remove selection
            for(let i=0;i<this.manualChosenNotOwners.length;i++){
                if(this.manualChosenNotOwners[i] === this.markPlayer){
                    this.manualChosenNotOwners.splice(i, 1);
                    break;
                }
            }
        } else {
            // add selection
            this.manualChosenNotOwners.push(this.markPlayer);
        }
    }

    isManualNotOwnerSelected(player: Player): boolean {
        for(let i of this.manualChosenNotOwners) {
            if(i === player){
                return true;
            }
        }
        return false;
    }

    onManualEditFinished() {
        if(this.manualEditMode === 1) {
            if(!(this.markPlayer === undefined)){
                if(this.markPlayer.noCards === this.markPlayer.noFoundCards) {
                    // we have already found out all the cards of the player and we cannot add anymore
                    let vibrator = new Vibrate();
                    vibrator.vibrate(100);
                    Toast.makeText(this.markPlayer.name + ' cannot have another card').show();
                } else {
                    this.addOwnerFunc();
                }
            }
        } else if(this.manualEditMode === 2) {
            for(let i of this.manualChosenNotOwners) {
                this.markPlayer = i;
                this.addNotOwnerFunc();
            }
        }
        this.gameViewMode = 1;
        this.manualEditMode = 0;
        this.manualChosenNotOwners = [];
        this.checkGameover();
    }    
}