import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SearchComponent } from './search/search.component';
import { ConfigGuardGuard } from './shared/config-guard.guard';
import { StoryComponent } from './story/story.component';
import { AboutComponent } from './about/about.component';

const routes: Routes = [
  { path: '', canActivate: [ConfigGuardGuard], children: [
    { path: '', redirectTo: 'speach', pathMatch: 'full' },
    { path: 'search', component: SearchComponent },
    { path: 'story',  redirectTo: 'speach', pathMatch: 'full' },
    { path: 'speach',  component: StoryComponent },
    { path: 'about', component: AboutComponent },
  ] }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
