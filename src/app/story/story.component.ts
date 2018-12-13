import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
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

  @ViewChild('imageViewer')
  imageViewer: ElementRef<HTMLElement>;

  inputControl = new FormControl();
  useKeyPhraseControl = new FormControl(false);
  keyPhrases: any;
  searchResults: any[] = [];
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
    return this.stt.record(4500)
      .pipe(
        tap((recording) => this.inputControl.setValue(recording.text)),
        takeLast(1),
        flatMap((recording) => {
          if (recording.text) {
            this.applyQuery(this.inputControl.value).subscribe();
          }

          return this.stopped ? of(null) : this._listen();
        }),
      );
  }

  private applyQuery(query: string) {
    if (!this.useKeyPhraseControl.value) {
      this.keyPhrases = null;
    }
    return this.useKeyPhraseControl.value
      ? this.keyPhraseSearch(query)
      : this._search({ search: query, filter: 'hasPrimaryImage', top: 4 });
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
              doc.$primaryImageUrl = 'https://airotationstore.blob.core.windows.net/met-artworks/'
                + `artwork_images/${IMAGE_TYPE}/${doc.id}.jpg`
                + '?st=2018-12-13T04%3A23%3A44Z&se=2118-12-14T04%3A23%3A00Z&sp=rl&sv=2018-03-28&sr=c'
                + '&sig=wKy6JcE%2FD0j2H%2BXByasn2YK5fstVReHeurgN12OKV3c%3D';
            }
          });
          // this.searchResults.splice(0, 0, ...resp.value);
          this.searchResults = this.searchResults.concat(resp.value);
          setTimeout(() => {
            const images = this.imageViewer.nativeElement
              .querySelectorAll('img');
            const lastImage = images.item(images.length - 1);
            this.imageViewer.nativeElement.scrollBy({
              left: this.imageViewer.nativeElement.scrollWidth,
              behavior: 'smooth',
            });
            // lastImage.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // // console.log(lastImage);
            window['temp'] = lastImage;
          }, 300);
        }),
      );
  }
}
