import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { AppInsights } from 'applicationinsights-js';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  speechKey: string;
  speechEndpoint: string;
  searchService: string;
  searchKey: string;
  textKey: string;
  textEndpoint: string;

  constructor(
    private http: HttpClient) { }

  load() {
    return this.http.get<any>('https://methackstor.blob.core.windows.net/web/config.json')
      .pipe(
        tap((resp) => {
          Object.keys(resp).forEach((x) => this[x] = resp[x]);
          AppInsights.downloadAndSetup({ instrumentationKey: resp.telemetryKey });
        }),
      );
  }
}
