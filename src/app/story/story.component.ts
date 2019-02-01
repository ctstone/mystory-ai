import { Component, OnInit, ViewChild } from '@angular/core';
import { Recorder } from '../shared/audio/recorder';
import { SpeechSocket, LanguageDefinition, SpeechEvent } from '../shared/audio/speech-ws';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ConfigService } from '../shared/config.service';
import { FormControl } from '@angular/forms';
import { tap, filter, flatMap, map } from 'rxjs/operators';
import { SearchService } from '../shared/search.service';
import { ScrollDirective } from '../shared/scroll.directive';
import { SharedService } from '../shared/shared.service';

@Component({
  selector: 'app-story',
  templateUrl: './story.component.html',
  styleUrls: ['./story.component.css']
})
export class StoryComponent implements OnInit {

  @ViewChild('imagesElement')
  imagesChild: ScrollDirective;

  @ViewChild('phrasesElement')
  phrasesChild: ScrollDirective;

  get recording() { return this.recordState === 'recording'; }
  get connected() { return this.connectState === 'open'; }
  get connectState() { return this.connection ? this.connection.state : null; }
  get recordState() { return this.recorder ? this.recorder.state : null; }

  connecting: boolean;
  wavUrl: SafeUrl;
  inputControl = new FormControl();
  docs: any[] = [];
  phrases: string[] = [];
  placeholder = '';

  private recorder: Recorder;
  private connection: SpeechSocket;
  private sourceLanguage: LanguageDefinition;
  private targetLanguage: LanguageDefinition;

  constructor(
    private conf: ConfigService,
    private search: SearchService,
    private shared: SharedService,
    private sanitizer: DomSanitizer) { }

  ngOnInit() {
    this.shared.get<LanguageDefinition>('sourceLang')
      .subscribe((language) => {
        this.sourceLanguage = language;
        if (this.connection) {
          this.connection.close();
        }
        this.connect();
      });

    this.shared.get<LanguageDefinition>('targetLang')
      .subscribe((language) => {
        this.targetLanguage = language;
        if (this.connection) {
          this.connection.close();
        }
        this.connect();
      });
  }

  connect() {
    this.connecting = true;
    this.connection = this.getConnection();
    this.connection.events
      .pipe(
        tap((event) => this.onSpeechEvent(event)),
        filter((event) =>
          (event.type === 'speech.hypothesis' && !!event.speechHypothesis.Text)
          || (event.type === 'translation.hypothesis'
            && !!event.translationHypothesis.Translation
            && !!event.translationHypothesis.Translation.Translations.length)),
        map((event) => {
          return event.type === 'speech.hypothesis'
            ? event.speechHypothesis.Text
            : event.translationHypothesis.Translation.Translations[0].Text;
        }),
        tap((text) => this.inputControl.setValue(text)),
        flatMap((text) => this.executeSearch(text)),
        tap((docs) => {
          for (const doc of docs) {
            if (!this.docs.some((d) => d.id === doc.id)) {
              this.docs.push(doc);
            }
          }
          this.imagesChild.scrollToEnd();
        }),
      )
      .subscribe();
  }

  record() {
    if (!this.connected) {
      throw new Error('Not connected');
    }
    const chunks: ArrayBuffer[] = [];
    this.placeholder = 'WAIT (microphone)';
    this.recorder = new Recorder(4096, 16000);
    this.recorder.start()
      .subscribe(
        (chunk) => {
          this.placeholder = 'Listening...';
          this.connection.processAudio(chunk);
          chunks.push(chunk);
        },
        (err) => {
          if (err.message) {
            alert('Cannot connect to your microphone: ' + err.message);
          } else {
            alert('Cannot connect to your microphone');
          }
          this.placeholder = '';
        },
        () => {
          this.connection.processAudio(null);
          const blob = new Blob(chunks, { type: 'audio/wav' });
          const url = URL.createObjectURL(blob);
          this.wavUrl = this.sanitizer.bypassSecurityTrustUrl(url);
          this.docs.length = 0;
          this.phrases.length = 0;
          this.placeholder = '';
        }
      );
  }

  stop() {
    if (this.recorder.state === 'recording') {
      this.recorder.stop();
    }
  }

  private onSpeechEvent(event: SpeechEvent) {

    if (event.type === 'speech.phrase' && event.speechPhrase.DisplayText) {
      this.phrases.push(event.speechPhrase.DisplayText);
      this.phrasesChild.scrollToEnd();
    } else if (
      event.type === 'translation.phrase'
      && event.translationPhrase.Translation
      && event.translationPhrase.Translation.Translations.length) {
      this.phrases.push(event.translationPhrase.Translation.Translations[0].Text);
      this.phrasesChild.scrollToEnd();
    } else if (event.type === 'turn.start') {
      this.inputControl.enable();
      this.inputControl.reset();
    } else if (event.type === 'turn.end') {
      this.inputControl.disable();
    } else if (event.type === 'connected') {
      this.connecting = false;
    }
  }

  private getConnection() {
    console.log(this.sourceLanguage, this.targetLanguage);

    if (this.targetLanguage) {
      return SpeechSocket.s2s(this.conf.speechRegion, this.conf.speechKey, this.sourceLanguage.code, this.targetLanguage.code);
    } else {
      return SpeechSocket.stt(this.conf.speechRegion, this.conf.speechKey, this.sourceLanguage.code);
    }
  }

  private executeSearch(keywords: string) {
    const query = {
      search: keywords,
      filter: 'hasPrimaryImage',
      top: 2,
    };
    return this.search.query('artworks8', query)
      .pipe(
        map((resp) => resp.value as any[]),
        tap((docs) => docs.forEach(setPrimaryUrl)),
      );
  }
}

export function setPrimaryUrl(doc: any) {
  if (doc.primaryImageUrl) {
    doc.$primaryImageUrl = 'https://methackstor.blob.core.windows.net/met-artworks'
      + `/artwork_images/PrimaryImages_LowRes/${doc.id}.jpg`
      + '?st=2018-12-22T01%3A16%3A24Z&se=2019-12-23T01%3A16%3A00Z&sp=rwl&sv=2018-03-28&sr=c'
      + '&sig=xPBaUe2E8oUF2IH6SvZKG4gNQDuCR6KjsPhUb24XKUQ%3D';
  }
}
