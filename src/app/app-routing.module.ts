import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SpeechComponent } from './search/search.component';
import { ConfigGuardGuard } from './shared/config-guard.guard';
import { StoryComponent } from './story/story.component';
import { AboutComponent } from './about/about.component';

const routes: Routes = [
  { path: '', canActivate: [ConfigGuardGuard], children: [
    { path: '', pathMatch: 'full', redirectTo: 'story' },
    { path: 'search', component: SpeechComponent },
    { path: 'story', component: StoryComponent },
    { path: 'about', component: AboutComponent },
  ] }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
