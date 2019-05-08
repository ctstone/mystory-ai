import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SearchComponent } from './search/search.component';
import { ConfigGuardGuard } from './shared/config-guard.guard';
import { StoryComponent } from './story/story.component';
import { AboutComponent } from './about/about.component';

const routes: Routes = [
  {
    path: '', canActivate: [ConfigGuardGuard], children: [
      { path: '', component: StoryComponent, pathMatch: 'full' },
      { path: 'search', component: SearchComponent },
      { path: 'story', redirectTo: 'speech', pathMatch: 'full' },
      { path: 'about', component: AboutComponent },
      { path: '*', redirectTo: '' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
