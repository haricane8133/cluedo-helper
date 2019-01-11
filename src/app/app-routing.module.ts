import { NgModule } from "@angular/core";
import { Routes } from "@angular/router";
import { NativeScriptRouterModule } from "nativescript-angular/router";
import { HomeComponent } from "~/app/components/1-home/home.component";
import { InputComponent } from "~/app/components/2-input/input.component";
import { GameComponent } from "~/app/components/3-game/game.component";
import { ImgComponent } from "~/app/components/5-img/img.component";
import { ExceptionComponent } from "~/app/components/6-exception/exception.component";
import { InfoComponent } from "~/app/components/4-info/info.component";

const routes: Routes = [
    { path: "", redirectTo: '/home', pathMatch: 'full' },
    { path: "home", component: HomeComponent },
    { path: "input", component: InputComponent },
    { path: "game", component: GameComponent },
    { path: "info", component: InfoComponent },
    { path: "img", component: ImgComponent },
    { path: "exception", component: ExceptionComponent }
];

@NgModule({
    imports: [NativeScriptRouterModule.forRoot(routes)],
    exports: [NativeScriptRouterModule]
})
export class AppRoutingModule { }
