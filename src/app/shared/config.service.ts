import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { AppInsights } from 'applicationinsights-js';

export interface SearchConfig {
  account: string;
  key: string;
  index: string;
}

export interface CognitiveConfig {
  region: string;
  key: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  search: SearchConfig;
  speech: CognitiveConfig;
  text: CognitiveConfig;

  constructor(
    private http: HttpClient) { }

  load() {
    return this.http.get<any>('assets/conf.json?' + new Date().getTime())
      .pipe(
        tap((resp) => {
          Object.keys(resp).forEach((x) => this[x] = resp[x]);
          AppInsights.downloadAndSetup({ instrumentationKey: resp.telemetry });
        }),
      );
  }
}
