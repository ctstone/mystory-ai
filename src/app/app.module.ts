import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SpeechComponent } from './search/search.component';
import { StoryComponent } from './story/story.component';
import { ScrollDirective } from './shared/scroll.directive';
import { AboutComponent } from './about/about.component';

@NgModule({
  declarations: [
    AppComponent,
    SpeechComponent,
    StoryComponent,
    ScrollDirective,
    AboutComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    ReactiveFormsModule,
    FormsModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
