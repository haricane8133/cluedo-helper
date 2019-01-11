import {Player} from '~/app/models/player.model';

export class Card{
    
    owner: Player;
    notOwners: Player[];
    type: number;
    ind: number;
    imgCardPath: string;
    imgTokenPath: string;
    name: string;
    trick2: {};
    
    constructor(paramType: number, paramVal: number, paramName: string) {
        this.type = paramType;
        this.ind = paramVal;
        this.name = paramName;
        if(this.type === -1){
            this.imgCardPath = '~/Assets/Cluedo Cards/question.jpg';
            this.imgTokenPath = '~/Assets/Cluedo Tokens/question.jpg';
        } else{
            this.imgCardPath = '~/Assets/Cluedo Cards/' + this.type + this.ind + '.jpg';
            this.imgTokenPath = '~/Assets/Cluedo Tokens/' + this.type + this.ind + '.jpg';
        }
        this.notOwners = [];
        this.trick2 = {};
    }
}