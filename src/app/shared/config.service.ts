import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  speechKey = '9fc035f617b64eb6b169816d5622d112';
  speechEndpoint = 'https://eastus.stt.speech.microsoft.com/speech/recognition/interactive/cognitiveservices/v1?language=en-US';
  searchService = 'methack-search';
  searchKey = '658F85956E5A33AED69A9C306547B05C';
  textKey = '35644ed793cd472f9b5521f7cecd9975';
  textEndpoint = 'https://eastus.api.cognitive.microsoft.com/text/analytics';

  constructor() { }
}
