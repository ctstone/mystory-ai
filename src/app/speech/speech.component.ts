import { Component, OnInit } from '@angular/core';
import { SpeechRecorder, Recording } from '../shared/audio/speech-recorder';
import { tap, takeLast, flatMap, filter } from 'rxjs/operators';
import { ConfigService } from '../shared/config.service';
import { TextAnalyticsService } from '../shared/text-analytics.service';
import { SearchService } from '../shared/search.service';
import { FormControl } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-speech',
  templateUrl: './speech.component.html',
  styleUrls: ['./speech.component.css']
})
export class SpeechComponent implements OnInit {

  inputControl = new FormControl();
  keyPhrases: any;
  searchResults: any;

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
  private searching: boolean;

  constructor(
    private config: ConfigService,
    private text: TextAnalyticsService,
    private azsearch: SearchService,
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute,
    private router: Router,
  ) { }

  async ngOnInit() {
    await this.connect();

    this.route.queryParams
      .pipe(
        tap((qp) => this.inputControl.setValue(qp.q)),
        filter((qp) => qp.q),
        flatMap((qp) => this._search(qp.q))
      )
      .subscribe();
  }

  async connect() {
    await this.stt.connect(this.config.speechEndpoint, this.config.speechKey);
  }

  getQueryPlaceholder() {
    switch (this.state) {
      case 'WAIT': return 'WAIT';
      case 'Listening': return 'Listening';
      default: return 'Type or query or use click the mic to use your voice';
    }
  }

  listen() {
    this.inputControl.reset();
    this.startingMic = true;
    this.stt.record(10000)
      .pipe(
        tap((recording) => this.inputControl.setValue(recording.text)),
        takeLast(1),
        flatMap((recording) => this.navigateToQuery(recording.text))
      )
      .subscribe((prediction) => {
        this.startingMic = false;
      });
  }

  search() {
    const text: string = this.inputControl.value;
    return this.navigateToQuery(text);
  }

  private navigateToQuery(query: string) {
    return this.router.navigate([''], { relativeTo: this.route, queryParams: { q: query } });
  }

  private _search(text: string) {
    this.searching = true;
    return this.text.keyPhrases(text)
      .pipe(
        tap((resp) => this.keyPhrases = resp),
        filter((resp) => resp.documents && resp.documents.length),
        flatMap((resp) => this.azsearch.query('artworks7', {
          queryType: 'full',
          search: resp.documents[0].keyPhrases
            .map((x) => `"${x}"`)
            .join(' AND '),
        })),
        tap((resp) => {
          this.searchResults = resp;
          this.searching = false;
          this.searchResults.value.forEach((doc) => {
            doc.$primaryImageUrl = this.sanitizer.bypassSecurityTrustUrl(doc.primaryImageUrl);
          });
        }),
      );
  }
}
