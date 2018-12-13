import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { tap, takeLast, flatMap, filter } from 'rxjs/operators';

import { SpeechRecorder } from '../shared/audio/speech-recorder';
import { ConfigService } from '../shared/config.service';
import { TextAnalyticsService } from '../shared/text-analytics.service';
import { SearchService } from '../shared/search.service';
import { AppInsights } from 'applicationinsights-js';
import { of } from 'rxjs';

const IMAGE_TYPE = 'LowResolutionImages2'; // PrimaryImage

@Component({
  selector: 'app-speech',
  templateUrl: './story.component.html',
  styleUrls: ['./story.component.css']
})
export class StoryComponent implements OnInit {

  inputControl = new FormControl();
  useKeyPhraseControl = new FormControl(false);
  keyPhrases: any;
  searchResults: any;
  searching: boolean;
  tag: string;

  get connected() { return this.stt.connected; }
  get connecting() { return this.stt.state === 'Connecting'; }
  get listening() { return this.stt.state === 'Listening'; }
  get state() {
    if (this.startingMic && !this.listening) {
      return 'WAIT';
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

  constructor(
    private config: ConfigService,
    private text: TextAnalyticsService,
    private azsearch: SearchService,
  ) { }

  async ngOnInit() {
    await this.connect();
  }

  async connect() {
    await this.stt.connect(this.config.speechEndpoint, this.config.speechKey);
  }

  getQueryPlaceholder() {
    switch (this.state) {
      case 'WAIT': return 'WAIT';
      case 'Listening': return 'Listening';
      default: return 'Type your query, or click the mic to use your voice';
    }
  }

  listen() {
    this.stopped = false;
    this.inputControl.reset();
    this.startingMic = true;
    this._listen()
      .subscribe(() => {
        this.startingMic = false;
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
    console.log('LISTEN', this.startingMic);
    this.inputControl.reset();
    return this.stt.record(10000)
      .pipe(
        tap((recording) => this.inputControl.setValue(recording.text)),
        takeLast(1),
        // filter((recording) => !!recording.text),
        tap(() => {
          this.applyQuery(this.inputControl.value).subscribe();
        }),
        flatMap(() => !this.stopped ? this._listen() : of(null))
      );
  }

  private applyQuery(query: string) {
    if (!this.useKeyPhraseControl.value) {
      this.keyPhrases = null;
    }
    return this.useKeyPhraseControl.value
      ? this.keyPhraseSearch(query)
      : this._search({ search: query, filter: 'hasPrimaryImage' });
  }

  private keyPhraseSearch(text: string) {
    this.searching = true;
    this.keyPhrases = null;
    this.searchResults = null;
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
        })),
      );
  }

  private _search(query: any) {
    this.searching = true;
    this.searchResults = null;
    return this.azsearch.query('artworks8', query)
      .pipe(
        tap((resp) => {
          this.searchResults = resp;
          this.searching = false;
          this.searchResults.value.forEach((doc: any) => {
            if (doc.primaryImageUrl) {
              doc.$primaryImageUrl = 'https://airotationstore.blob.core.windows.net/met-artworks/'
                + `artwork_images/${IMAGE_TYPE}/${doc.id}.jpg`
                + '?st=2018-12-13T04%3A23%3A44Z&se=2118-12-14T04%3A23%3A00Z&sp=rl&sv=2018-03-28&sr=c'
                + '&sig=wKy6JcE%2FD0j2H%2BXByasn2YK5fstVReHeurgN12OKV3c%3D';
            }
          });
        }),
      );
  }
}
