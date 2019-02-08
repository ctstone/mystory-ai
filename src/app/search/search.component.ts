import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { tap, flatMap, filter, mapTo } from 'rxjs/operators';
import { AppInsights } from 'applicationinsights-js';

import { ConfigService } from '../shared/config.service';
import { TextAnalyticsService } from '../shared/text-analytics.service';
import { SearchService } from '../shared/search.service';
import { MetService } from '../shared/met.service';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})
export class SearchComponent implements OnInit {

  inputControl = new FormControl();
  useKeyPhraseControl = new FormControl(false);
  keyPhrases: any;
  searchResults: any;
  searching: boolean;
  tag: string;

  get state() {
    if (this.searching) {
      return 'Searching';
    }
  }

  constructor(
    private config: ConfigService,
    private text: TextAnalyticsService,
    private azsearch: SearchService,
    private route: ActivatedRoute,
    private router: Router,
    private met: MetService,
  ) { }

  async ngOnInit() {
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

  search() {
    const text: string = this.inputControl.value;
    return text === this.route.snapshot.queryParams.q
      ? this.applyQuery(text).subscribe()
      : this.navigateToQuery(text);
  }

  onDocumentClick(rank: number, document: any, event: MouseEvent) {
    AppInsights.trackEvent('Click', {
      SearchServiceName: this.config.search.account,
      SearchId: this.searchResults['@search.id'],
      ClickedDocId: document.id,
      Rank: rank.toString(),
    });
  }

  private applyQuery(keywords: string) {
    if (!this.useKeyPhraseControl.value) {
      this.keyPhrases = null;
    }
    const query = {
      search: keywords,
      filter: 'isPublicDomain',
    };
    return this.useKeyPhraseControl.value
      ? this.keyPhraseSearch(keywords)
      : this._search(query);
  }

  private navigateToQuery(query: string) {
    return this.router.navigate(
      ['.'],
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
          filter: 'isPublicDomain',
          search: resp.documents[0].keyPhrases
            .map((x: any) => `"${x}"`)
            .join(' AND '),
        })),
      );
  }

  private _search(query: any) {
    this.searching = true;
    this.searchResults = null;
    return this.azsearch.query(this.config.search.index, query)
      .pipe(
        // flatMap((resp) => this.met.assignImageUrls(resp.value).pipe(mapTo(resp))),
        tap((resp) => {
          this.searchResults = resp;
          this.searching = false;
        }),
      );
  }
}
