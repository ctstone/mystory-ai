import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AppInsights } from 'applicationinsights-js';

import { ConfigService } from './config.service';
import { tap, map, flatMap } from 'rxjs/operators';

const API_VERSION = '2017-11-11-Preview';

@Injectable({
  providedIn: 'root'
})
export class SearchService {

  constructor(
    private config: ConfigService,
    private http: HttpClient) { }

  query(index: string, query: any) {
    return this.http.post<any>(`https://${this.config.search.account}.search.windows.net/indexes/${this.config.search.index}/docs/search`,
      query,
      {
        params: { 'api-version': API_VERSION },
        headers: { 'api-key': this.config.search.key },
        observe: 'response',
      })
      .pipe(
        tap((resp) => {
          const searchId = resp.headers.get('request-id');
          AppInsights.trackEvent('Search', {
            SearchServiceName: this.config.search.account,
            SearchId: searchId,
            IndexName: index,
            QueryTerms: query.search,
            ResultCount: resp.body.value.length,
            ScoringProfile: ''
          });
        }),
        map((resp) => {
          resp.body['@search.id'] = resp.headers.get('request-id');
          return resp.body;
        }),
      );
  }
}
