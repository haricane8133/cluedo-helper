import { NgModule, NgModuleFactoryLoader, NO_ERRORS_SCHEMA } from "@angular/core";
import { NativeScriptModule } from "nativescript-angular/nativescript.module";

import { AppRoutingModule } from "~/app/app-routing.module";
import { AppComponent } from "~/app/app.component";
import { HomeComponent } from "~/app/components/1-home/home.component";
import { InputComponent } from "~/app/components/2-input/input.component";
import { GameComponent } from "~/app/components/3-game/game.component";
import { InfoComponent } from "~/app/components/4-info/info.component";
import { ImgComponent } from "~/app/components/5-img/img.component";
import { ExceptionComponent } from "~/app/components/6-exception/exception.component";
import { DataService } from "~/app/services/data.service";

import { NativeScriptFormsModule } from "nativescript-angular/forms";

import { registerElement } from "nativescript-angular/element-registry";

registerElement("FAB", () => require("nativescript-floatingactionbutton").Fab);

@NgModule({
    bootstrap: [
        AppComponent
    ],
    imports: [
        NativeScriptModule,
        AppRoutingModule,
        NativeScriptFormsModule
    ],
    declarations: [
        AppComponent,
        HomeComponent,
        InputComponent,
        GameComponent,
        InfoComponent,
        ImgComponent,
        ExceptionComponent
    ],
    schemas: [
        NO_ERRORS_SCHEMA
    ],
    providers: [
        DataService
    ]
})
export class AppModule { }
