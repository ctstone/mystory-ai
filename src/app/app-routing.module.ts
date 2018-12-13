import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SpeechComponent } from './speech/speech.component';
import { ConfigGuardGuard } from './shared/config-guard.guard';
import { StoryComponent } from './story/story.component';
import { HomeComponent } from './home/home.component';

const routes: Routes = [
  { path: '', canActivate: [ConfigGuardGuard], children: [
    { path: '', pathMatch: 'full', component: HomeComponent },
    { path: 'speech', component: SpeechComponent },
    { path: 'story', component: StoryComponent },
  ] }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
