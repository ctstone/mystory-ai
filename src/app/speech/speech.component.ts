import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { tap, takeLast, flatMap, filter } from 'rxjs/operators';

import { SpeechRecorder } from '../shared/audio/speech-recorder';
import { ConfigService } from '../shared/config.service';
import { TextAnalyticsService } from '../shared/text-analytics.service';
import { SearchService } from '../shared/search.service';
import { AppInsights } from 'applicationinsights-js';

const IMAGE_TYPE = 'LowResolutionImages2'; // PrimaryImage

@Component({
  selector: 'app-speech',
  templateUrl: './speech.component.html',
  styleUrls: ['./speech.component.css']
})
export class SpeechComponent implements OnInit {

  inputControl = new FormControl();
  useKeyPhraseControl = new FormControl(true);
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

  constructor(
    private config: ConfigService,
    private text: TextAnalyticsService,
    private azsearch: SearchService,
    private route: ActivatedRoute,
    private router: Router,
  ) { }

  async ngOnInit() {
    await this.connect();

    this.route.queryParams
      .pipe(
        tap((qp) => this.inputControl.setValue(qp.q)),
        filter((qp) => qp.q),
        flatMap((qp) => this.applyQuery(qp.q)),
      )
      .subscribe();

    this.route.queryParams
      .pipe(
        filter((qp) => this.tag = qp.tag),
        filter((qp) => qp.tag),
        flatMap((qp) => this.searchTag(qp.tag))
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
      default: return 'Type your query, or click the mic to use your voice';
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
    return text === this.route.snapshot.queryParams.q
      ? this.applyQuery(text).subscribe()
      : this.navigateToQuery(text);
  }

  onDocumentClick(rank: number, document: any, event: MouseEvent) {
    AppInsights.trackEvent('Click', {
      SearchServiceName: this.config.searchService,
      SearchId: this.searchResults['@search.id'],
      ClickedDocId: document.id,
      Rank: rank.toString(),
    });
  }

  private applyQuery(query: string) {
    if (!this.useKeyPhraseControl.value) {
      this.keyPhrases = null;
    }
    return this.useKeyPhraseControl.value
      ? this.keyPhraseSearch(query)
      : this._search({ search: query });
  }

  private navigateToQuery(query: string) {
    return this.router.navigate(
      [''],
      {
        relativeTo: this.route,
        queryParams: { q: query },
      });
  }

  private searchTag(tag: string) {
    this.keyPhrases = null;
    this.searchResults = null;
    return this._search({
      filter: `tags/any(x: x eq '${tag}')`,
    });
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
          this.searchResults.value.forEach((doc) => {
            if (doc.primaryImageUrl) {
              // doc.$primaryImageUrl = this.sanitizer.bypassSecurityTrustUrl(doc.primaryImageUrl);
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
