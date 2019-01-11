import { Component } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { Location } from '@angular/common';

@Component({
    selector: 'app-img',
    templateUrl: 'img.component.html'
})
export class ImgComponent{
    imgPath: string;
    constructor(route: ActivatedRoute, private location: Location) {
        let param = route.snapshot.queryParams;
        this.imgPath = '~/Assets/Cluedo Cards/' + param.type + param.ind + '.jpg';
    }
    goBack() {
        this.location.back();
    }
}