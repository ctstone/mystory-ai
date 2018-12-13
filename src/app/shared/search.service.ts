import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ConfigService } from './config.service';

const API_VERSION = '2017-11-11-Preview';

@Injectable({
  providedIn: 'root'
})
export class SearchService {

  constructor(
    private config: ConfigService,
    private http: HttpClient) { }

  query(index: string, query: any) {
    return this.http.post(`https://${this.config.searchService}.search.windows.net/indexes/${index}/docs/search`,
      query,
      {
        params: { 'api-version': API_VERSION },
        headers: { 'api-key': this.config.searchKey },
      });
  }
}
