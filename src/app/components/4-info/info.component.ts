import { Component } from "@angular/core";
import { Location } from '@angular/common';

@Component({
    selector: 'app-over',
    templateUrl: 'info.component.html'
})

export class InfoComponent{
    text: string = "";

    constructor(private location: Location) {
    }

    goBack() {
        this.location.back();
    }
}