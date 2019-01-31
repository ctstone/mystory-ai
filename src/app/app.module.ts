import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SpeechComponent } from './speech/speech.component';
import { StoryComponent } from './story/story.component';
import { HomeComponent } from './home/home.component';
import { ScrollDirective } from './shared/scroll.directive';

@NgModule({
  declarations: [
    AppComponent,
    SpeechComponent,
    StoryComponent,
    HomeComponent,
    ScrollDirective
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
