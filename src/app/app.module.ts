import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SearchComponent } from './search/search.component';
import { StoryComponent } from './story/story.component';
import { ScrollDirective } from './shared/scroll.directive';
import { AboutComponent } from './about/about.component';
import { MetImageDirective } from './shared/met-image.directive';

@NgModule({
  declarations: [
    AppComponent,
    SearchComponent,
    StoryComponent,
    ScrollDirective,
    AboutComponent,
    MetImageDirective,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    ReactiveFormsModule,
    FormsModule,
    NgbModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
