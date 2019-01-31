import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { tap, takeLast, flatMap, filter, debounce, debounceTime, distinctUntilChanged, delay } from 'rxjs/operators';
import { Subject, empty } from 'rxjs';

import { SpeechRecorder, Recording } from '../shared/audio/speech-recorder';
import { ConfigService } from '../shared/config.service';
import { TextAnalyticsService } from '../shared/text-analytics.service';
import { SearchService } from '../shared/search.service';
import { of } from 'rxjs';

const AudioContext = window['AudioContext'] || window['webkitAudioContext'];

@Component({
  selector: 'app-speech',
  templateUrl: './story.component.html',
  styleUrls: ['./story.component.css']
})
export class StoryComponent implements OnInit, OnDestroy {

  @ViewChild('imageViewer')
  imageViewer: ElementRef<HTMLElement>;

  @ViewChild('phraseViewer')
  phraseViewer: ElementRef<HTMLElement>;

  inputControl = new FormControl();
  useKeyPhraseControl = new FormControl(false);
  keyPhrases: any;
  searchResults: any[] = [];
  searching: boolean;
  tag: string;
  recording: Recording;
  phrases: string[] = [];
  hypothesis: string;
  continuousListen = false;

  get connected() { return this.stt.connected; }
  get connecting() { return this.stt.state === 'Connecting'; }
  get listening() { return this.stt.state === 'Listening'; }
  get state() {
    if (this.startingMic && !this.listening) {
      return 'WAIT';
    } else if (this.continuousListen) {
      return 'Listening';
    } else if (this.searching) {
      return 'Searching';
    } else {
      return this.stt.state;
    }
  }

  private context = new AudioContext();
  private stt = new SpeechRecorder(this.context, 16000);
  private startingMic: boolean;
  private stopped: boolean;
  private recognizedPhrases = new Subject<string>();

  constructor(
    private config: ConfigService,
    private text: TextAnalyticsService,
    private azsearch: SearchService,
  ) { }

  async ngOnInit() {
    await this.connect();

    this.recognizedPhrases
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        filter((x) => !!x),
        flatMap((text) => this.applyQuery(text))
      )
      .subscribe();
  }

  async ngOnDestroy() {
    this.stt.disconnect();
  }

  async connect() {
    await this.stt.connect(this.config.speechEndpoint, this.config.speechKey);
  }

  getQueryPlaceholder() {
    switch (this.state) {
      case 'WAIT': return 'WAIT';
      case 'Listening': return 'Listening';
      default: return 'Record your story; click the mic to use your voice.';
    }
  }

  listen() {
    this.continuousListen = true;
    this.stopped = false;
    this.inputControl.reset();
    this.startingMic = true;
    this._listen()
      .subscribe(() => {
        console.log('DONE');
        this.startingMic = false;
        this.continuousListen = false;
      });
  }

  search() {
    const text: string = this.inputControl.value;
    return this.applyQuery(text).subscribe();
  }

  stop() {
    this.stopped = true;
    this.stt.stop();
    this.startingMic = false;
  }

  private _listen() {
    this.inputControl.reset();
    return this.stt.record(10000, false)
      .pipe(
        tap((recording) => {
          this.startingMic = false;
          this.recording = recording;
          this.inputControl.setValue(recording.text);
          this.hypothesis = recording.text;
          this.recognizedPhrases.next(recording.text);
        }),
        takeLast(1),
        tap((recording) => {
          this.hypothesis = null;
          if (recording.text) {
            this.phrases.push(recording.text);
          }
        }),
        // delay(100),
        flatMap(() => this.stopped ? of(true) : this._listen()),
      );
  }

  private applyQuery(query: string) {
    console.log('QUERY', query);
    if (!this.useKeyPhraseControl.value) {
      this.keyPhrases = null;
    }
    return this.useKeyPhraseControl.value
      ? this.keyPhraseSearch(query)
      : this._search({ search: query, filter: 'hasPrimaryImage', top: 2 });
  }

  private keyPhraseSearch(text: string) {
    this.searching = true;
    this.keyPhrases = null;
    return this.text.keyPhrases(text)
      .pipe(
        tap((resp) => this.keyPhrases = resp),
        filter((resp) => resp.documents && resp.documents.length),
        flatMap((resp) => this._search({
          queryType: 'full',
          search: resp.documents[0].keyPhrases
            .map((x: any) => `"${x}"`)
            .join(' AND '),
          filter: 'hasPrimaryImage',
          top: 4,
        })),
      );
  }

  private _search(query: any) {
    this.searching = true;
    return this.azsearch.query('artworks8', query)
      .pipe(
        tap((resp) => {
          this.searching = false;
          resp.value.forEach((doc: any) => {
            if (doc.primaryImageUrl) {
              doc.$primaryImageUrl = 'https://methackstor.blob.core.windows.net/met-artworks'
                 + `/artwork_images/PrimaryImages_LowRes/${doc.id}.jpg`
                 + '?st=2018-12-22T01%3A16%3A24Z&se=2019-12-23T01%3A16%3A00Z&sp=rwl&sv=2018-03-28&sr=c'
                 + '&sig=xPBaUe2E8oUF2IH6SvZKG4gNQDuCR6KjsPhUb24XKUQ%3D';
            }
          });
          // this.searchResults.splice(0, 0, ...resp.value);
          this.searchResults = this.searchResults.concat(resp.value);
          setTimeout(() => {
            if (this.imageViewer.nativeElement.scrollBy) {
              this.imageViewer.nativeElement.scrollBy({
                left: this.imageViewer.nativeElement.scrollWidth,
                behavior: 'smooth',
              });

              this.phraseViewer.nativeElement.scrollBy({
                left: this.phraseViewer.nativeElement.scrollWidth,
                behavior: 'smooth',
              });
            } else if (this.imageViewer.nativeElement.scrollIntoView) {
              this.imageViewer.nativeElement.lastElementChild.scrollIntoView(false);
              this.phraseViewer.nativeElement.lastElementChild.scrollIntoView(false);
            }
          }, 300);
        }),
      );
  }
}
