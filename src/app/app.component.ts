import { Component, OnInit } from '@angular/core';
import { TRANSLATION_SOURCE_LANGUAGES, TRANSLATION_TARGET_LANGUAGES } from './shared/audio/speech-ws';
import { FormControl } from '@angular/forms';
import { SharedService } from './shared/shared.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  TRANSLATION_SOURCE_LANGUAGES = TRANSLATION_SOURCE_LANGUAGES;
  TRANSLATION_TARGET_LANGUAGES = TRANSLATION_TARGET_LANGUAGES;

  languageSourceControl = new FormControl();
  languageTargetControl = new FormControl();
  showInfo = true;

  constructor(private shared: SharedService) { }

  ngOnInit() {
    this.languageSourceControl.valueChanges
      .subscribe((val) => this.shared.set('sourceLang', val));
    this.languageTargetControl.valueChanges
      .subscribe((val) => this.shared.set('targetLang', val));
    this.languageSourceControl.setValue(TRANSLATION_SOURCE_LANGUAGES.find((x) => x.code === 'en-US'));
  }

  toggleInfo() {
    this.showInfo = this.showInfo ? false : true;
  }
}
