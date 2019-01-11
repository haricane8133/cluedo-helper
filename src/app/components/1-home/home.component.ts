import { Component} from "@angular/core";
import { Router} from "@angular/router";
import { DataService } from "~/app/services/data.service";

@Component({
    selector: "app-home",
    templateUrl: "home.component.html"
})
export class HomeComponent{
    constructor(private router: Router, private data: DataService) {
    }

    newGame() {
        this.router.navigate(['/input']);
    }

    showInstructions() {
        this.router.navigate(['/info']);
    }
}
