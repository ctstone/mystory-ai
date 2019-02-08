import { Component, OnInit, ViewChild } from '@angular/core';
import { Recorder } from '../shared/audio/recorder';
import { SpeechSocket, LanguageDefinition, SpeechEvent } from '../shared/audio/speech-ws';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ConfigService } from '../shared/config.service';
import { FormControl } from '@angular/forms';
import { tap, filter, flatMap, map, distinctUntilChanged, debounceTime, catchError, mapTo } from 'rxjs/operators';
import { SearchService } from '../shared/search.service';
import { ScrollDirective } from '../shared/scroll.directive';
import { SharedService } from '../shared/shared.service';
import { of, from } from 'rxjs';
import { MetService } from '../shared/met.service';

const SEARCH_FIELDS = 'department, title, culture, period, dynasty, reign, portfolio, artistDisplayName'
  + ', artistDisplayBio, artistNationality, medium, city, state, county, country, region, subregion, locale'
  + ', locus, excavation, river, classification, tags';

export const INDEX_NAME = 'artworks9';
const MAX_DOCS_PER_REQUEST = 2;

interface Highlight {
  id: string;
  field: string;
  text: string;
  search: string;
}

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
  highlights: Highlight[] = [];
  placeholder = '';
  explain = false;

  private recorder: Recorder;
  private connection: SpeechSocket;
  private sourceLanguage: LanguageDefinition;
  private targetLanguage: LanguageDefinition;

  constructor(
    private conf: ConfigService,
    private search: SearchService,
    private shared: SharedService,
    private met: MetService,
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

    this.inputControl.disable();
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
        distinctUntilChanged(),
        debounceTime(250),
        tap((text) => this.inputControl.setValue(text)),
        flatMap((text) => this.executeSearch(text)),
        tap(([query, docs]: [any, any[]]) => {
          if (!docs) { return; }
          let numDocs = 0;
          for (const doc of docs) {
            const id: string = doc.objectId;
            if (!this.docs.some((d) => d.objectId === id)) {
              this.docs.push(doc);
              numDocs += 1;
              const highlights = doc['@search.highlights'];
              const search = query.search;
              for (const field in highlights) {
                if (highlights.hasOwnProperty(field)) {
                  const text = highlights[field][0];
                  this.highlights.unshift({ field, text, id, search });
                }
              }
            }

            if (numDocs >= MAX_DOCS_PER_REQUEST) {
              break;
            }
          }
          this.imagesChild.scrollToEnd();
        }),
      )
      .subscribe(
        () => void 0,
        (err) => alert((err.message || 'Unknown Error') + '. Try refreshing the page.'));
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
      return SpeechSocket.s2s(this.conf.speech.region, this.conf.speech.key, this.sourceLanguage.code, this.targetLanguage.code);
    } else {
      return SpeechSocket.stt(this.conf.speech.region, this.conf.speech.key, this.sourceLanguage.code);
    }
  }

  private executeSearch(keywords: string) {
    const query = {
      search: keywords,
      filter: 'isPublicDomain',
      top: 2,
      searchFields: SEARCH_FIELDS,
      select: 'objectId',
      highlight: SEARCH_FIELDS,
      highlightPreTag: '<mark>',
      highlightPostTag: '</mark>'
    };
    return this.search.query(INDEX_NAME, query)
      .pipe(
        flatMap((resp) => this.met.assignImageUrls(resp.value).pipe(mapTo(resp))),
        map((resp) => [query, resp.value as any[]]),
        catchError((err) => of([])),
      );
  }
}
