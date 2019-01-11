import { Component} from "@angular/core";
import { Router } from "@angular/router";
import { Location } from "@angular/common";
import * as application from "tns-core-modules/application";

@Component({
    selector: "ns-app",
    templateUrl: "app.component.html"
})
export class AppComponent{

    backListener;

    constructor(private router: Router, private location: Location) {
        application.android.on(application.AndroidApplication.activityResumedEvent, (args:any)=>{
            this.backListener = application.android.on(application.AndroidApplication.activityBackPressedEvent, (args: any) => {
                if(this.router.url === '/input'){
                    args.cancel = true;
                    this.promptUser('The data taken will be lost. Continue?').then((okay: boolean)=>{
                        if(okay) {
                            this.location.back();
                        }
                    });
                } else if(this.router.url === '/game'){
                    args.cancel = true;
                    this.promptUser('This will terminate this Case. Game cannot be loaded later. Continue?').then((okay: boolean)=>{
                        if(okay) {
                            this.location.back();
                        }
                    });
                } else if(this.router.url === '/exception') {
                    args.cancel = true;
                    this.promptUser('Going back to the case is useless... The Game is corrupted. Continue?').then((okay: boolean)=>{
                        if(okay) {
                            this.location.back();
                        }
                    });
                } else {
                    args.cancel = false;
                }
            });
        });

        application.android.on(application.AndroidApplication.activityStoppedEvent, (args:any)=>{
            application.android.off(application.AndroidApplication.activityBackPressedEvent, this.backListener);
        });
    }
    promptUser(msg: string): Promise<boolean>{
        return new Promise((resolve)=>{
            resolve(confirm(msg));
        });
    }
}
