import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SpeechComponent } from './speech/speech.component';
import { ConfigGuardGuard } from './shared/config-guard.guard';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'speech' },
  { path: 'speech', component: SpeechComponent, canActivate: [ ConfigGuardGuard] },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
