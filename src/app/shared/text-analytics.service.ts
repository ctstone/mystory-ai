import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class TextAnalyticsService {

  constructor(
    private config: ConfigService,
    private http: HttpClient) { }

  entities(text: string) {
    return this.http.post<any>(`https://${this.config.text.region}.api.cognitive.microsoft.com/text/analytics/v2.1-preview/entities`, {
      documents: [
        { language: 'en', id: '1', text }
      ]
    }, {
      headers: { 'Ocp-Apim-Subscription-Key': this.config.text.key },
    });
  }

  keyPhrases(text: string) {
    return this.http.post<any>(`https://${this.config.text.region}.api.cognitive.microsoft.com/text/analytics/v2.1-preview/keyPhrases`, {
      documents: [
        { language: 'en', id: '1', text }
      ]
    }, {
        headers: { 'Ocp-Apim-Subscription-Key': this.config.text.key },
      });
  }
}
