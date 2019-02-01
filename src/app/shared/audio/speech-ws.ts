import { Subject, Observable } from 'rxjs';
import { TextEncoder } from 'text-encoding';
import { v4 as uuid } from 'uuid';
import { DataViewWriter } from './data-view-writer';

const CRLF = '\r\n';
const SEPARATOR = CRLF + CRLF;
const TEXT_ENCODER = new TextEncoder();

export interface LanguageDefinition {
  name: string;
  code: string;
}

export const TRANSLATION_SOURCE_LANGUAGES: LanguageDefinition[] = [
  { code: 'ar-EG', name: 'Arabic (Egypt)' },
  { code: 'ca-ES', name: 'Catalan (Spain)' },
  { code: 'da-DK', name: 'Danish (Denmark)' },
  { code: 'de-DE', name: 'German (Germany)' },
  { code: 'en-AU', name: 'English (Australia)' },
  { code: 'en-CA', name: 'English (Canada)' },
  { code: 'en-GB', name: 'English (United Kingdom)' },
  { code: 'en-IN', name: 'English (India)' },
  { code: 'en-NZ', name: 'English (New Zealand)' },
  { code: 'en-US', name: 'English (United States)' },
  { code: 'es-ES', name: 'Spanish (Spain)' },
  { code: 'es-MX', name: 'Spanish (Mexico)' },
  { code: 'fi-FI', name: 'Finnish (Finland)' },
  { code: 'fr-CA', name: 'French (Canada)' },
  { code: 'fr-FR', name: 'French (France)' },
  { code: 'hi-IN', name: 'Hindi (India)' },
  { code: 'it-IT', name: 'Italian (Italy)' },
  { code: 'ja-JP', name: 'Japanese (Japan)' },
  { code: 'ko-KR', name: 'Korean (Korea)' },
  { code: 'nb-NO', name: 'Norwegian (Bokmål)' },
  { code: 'nl-NL', name: 'Dutch (Netherlands)' },
  { code: 'pl-PL', name: 'Polish (Poland)' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)' },
  { code: 'pt-PT', name: 'Portuguese (Portugal)' },
  { code: 'ru-RU', name: 'Russian (Russia)' },
  { code: 'sv-SE', name: 'Swedish (Sweden)' },
  { code: 'zh-CN', name: 'Chinese (Mandarin, simplified)' },
  { code: 'zh-HK', name: 'Chinese (Mandarin, Traditional)' },
  { code: 'zh-TW', name: 'Chinese (Taiwanese Mandarin)' },
  { code: 'th-TH', name: 'Thai (Thailand)' },
];

export const TRANSLATION_TARGET_LANGUAGES: LanguageDefinition[] = [
  { name: 'Arabic', code: 'ar-EG' },
  { name: 'Catalan', code: 'ca-ES' },
  { name: 'Chinese Simplified', code: 'zh-Hans' },
  { name: 'Chinese Traditional', code: 'zh-Hant' },
  { name: 'Croatian', code: 'hr' },
  { name: 'Czech', code: 'cs' },
  { name: 'Danish', code: 'da' },
  { name: 'Dutch', code: 'nl' },
  { name: 'English', code: 'en' },
  { name: 'Estonian', code: 'et' },
  { name: 'Fijian', code: 'fj' },
  { name: 'Filipino', code: 'fil' },
  { name: 'Finnish', code: 'fi' },
  { name: 'French', code: 'fr' },
  { name: 'German', code: 'de' },
  { name: 'Greek', code: 'el' },
  { name: 'Haitian Creole', code: 'ht' },
  { name: 'Hebrew', code: 'he' },
  { name: 'Hindi', code: 'hi' },
  { name: 'Hmong Daw', code: 'mww' },
  { name: 'Hungarian', code: 'hu' },
  { name: 'Indonesian', code: 'id' },
  { name: 'Italian', code: 'it' },
  { name: 'Japanese', code: 'ja' },
  { name: 'Kiswahili', code: 'sw' },
  { name: 'Klingon', code: 'tlh' },
  { name: 'Klingon (plqaD)', code: 'tlh-Qaak' },
  { name: 'Korean', code: 'ko' },
  { name: 'Latvian', code: 'lv' },
  { name: 'Lithuanian', code: 'lt' },
  { name: 'Malagasy', code: 'mg' },
  { name: 'Malay', code: 'ms' },
  { name: 'Maltese', code: 'mt' },
  { name: 'Norwegian', code: 'nb' },
  { name: 'Persian', code: 'fa' },
  { name: 'Polish', code: 'pl' },
  { name: 'Portuguese', code: 'pt' },
  { name: 'Queretaro Otomi', code: 'otq' },
  { name: 'Romanian', code: 'ro' },
  { name: 'Russian', code: 'ru' },
  { name: 'Samoan', code: 'sm' },
  { name: 'Serbian (Cyrillic)', code: 'sr-Cyrl' },
  { name: 'Serbian (Latin)', code: 'sr-Latn' },
  { name: 'Slovak', code: 'sk' },
  { name: 'Slovenian', code: 'sl' },
  { name: 'Spanish', code: 'es' },
  { name: 'Swedish', code: 'sv' },
  { name: 'Tahitian', code: 'ty' },
  { name: 'Tamil', code: 'ta' },
  { name: 'Thai', code: 'th' },
  { name: 'Tongan', code: 'to' },
  { name: 'Turkish', code: 'tr' },
  { name: 'Ukrainian', code: 'uk' },
  { name: 'Urdu', code: 'ur' },
  { name: 'Vietnamese', code: 'vi' },
  { name: 'Welsh', code: 'cy' },
  { name: 'Yucatec Maya', code: 'yua' },
];

interface KeyValues<T> {
  [key: string]: T;
}

export type SpeechType = 'speech.hypothesis'
  | 'speech.phrase'
  | 'speech.startDetected'
  | 'speech.endDetected'
  | 'translation.hypothesis'
  | 'translation.phrase'
  | 'turn.start'
  | 'turn.end'
  | 'connected'
  | 'disconnected';

export interface SpeechEvent {
  type: SpeechType;
  speechHypothesis?: SpeechHypothesis;
  speechPhrase?: SpeechPhrase;
  speechStart?: SpeechBoundary;
  speechEnd?: SpeechBoundary;
  translationHypothesis?: TranslationHypothesis;
  translationPhrase?: TranslationPhrase;
  turnStart?: any;
  turnEnd?: any;
}

export interface SpeechHypothesis {
  Text: string;
  Offset: number;
  Duration: number;
}

export interface SpeechPhrase {
  RecognitionStatus: string;
  DisplayText: string;
  Offset: number;
  Duration: number;
}

export interface SpeechBoundary {
  Offset: number;
}

export interface TranslationHypothesis extends SpeechHypothesis {
  Translation: TranslationInfo;
}

export interface TranslationInfo {
  TranslationStatus: string;
  Translations: Translation[];
}

export interface Translation {
  Language: string;
  Text: string;
}

export interface TranslationPhrase {
  RecognitionStatus: string;
  Offset: number;
  Duration: number;
  Text: string;
  Translation: TranslationInfo;
}

function stringifyQuery(parameters: KeyValues<string>) {
  const params: string[] = [];
  for (const k in parameters) {
    if (parameters.hasOwnProperty(k)) {
      params.push(`${k}=${parameters[k]}`);
    }
  }
  return params.join('&');
}

export interface SpeechOptions {
  host: string;
  path: string;
  key: string;
  contentType?: string;
  parameters?: KeyValues<string>;
}

// other options: features, voice, format, ProfanityMarker, ProfanityAction

export class SpeechSocket {
  get state() {
    if (!this.socket) {
      return 'closed';
    }
    switch (this.socket.readyState) {
      case WebSocket.CLOSED: return 'closed';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.OPEN: return 'open';
      default: return 'closed';
    }
  }

  readonly events: Observable<SpeechEvent>;

  private readonly socket: WebSocket;
  private readonly connectionId = createUUID();
  private readonly subject = new Subject<SpeechEvent>();
  private readonly contentType: string;
  private audioRequestId: string;
  private readyStart: Deferred<void>;

  static stt(region: string, key: string, language: string) {
    const host = `${region}.stt.speech.microsoft.com`;
    const path = '/speech/recognition/interactive/cognitiveservices/v1';
    const parameters = { language };
    return new SpeechSocket({ host, path, key, parameters });
  }

  static s2s(region: string, key: string, from: string, to: string) {
    const host = `${region}.s2s.speech.microsoft.com`;
    const path = '/speech/translation/cognitiveservices/v1';
    const parameters = { from, to };
    return new SpeechSocket({ host, path, key, parameters });
  }

  constructor(options: SpeechOptions) {
    const params = Object.assign(options.parameters || { }, {
      'Ocp-Apim-Subscription-Key': options.key,
      'X-ConnectionId': this.connectionId,
    });
    const querystring = stringifyQuery(params);
    const url = `wss://${options.host}${options.path}?${querystring}`;

    this.contentType = options.contentType || 'audio/x-wav';
    this.socket = new WebSocket(url);
    this.events = this.subject.asObservable();
    this.socket.addEventListener('open', (event) => this.onOpen(event));
    this.socket.addEventListener('error', (event) => this.onError(event));
    this.socket.addEventListener('close', (event) => this.onClose(event));
    this.socket.addEventListener('message', (event) => this.onMessage(event));

    this.readyStart = defer();
  }

  async processAudio(audio?: ArrayBuffer) {

    await this.readyStart.promise;

    const headers: KeyValues<string> = { 'Content-Type': this.contentType };

    // on continue and end
    if (this.audioRequestId) {
      headers['X-RequestId'] = this.audioRequestId;
    }

    // on end
    if (!audio) {
      audio = new ArrayBuffer(0);
    }

    const requestId = this.send('audio', headers, audio);

    // on first
    if (!this.audioRequestId) {
      this.audioRequestId = requestId;
    }
  }

  close() {
    this.socket.close();
  }

  private onMessage(event: MessageEvent) {
    const message = decodeMessage(event.data);
    const type = message.headers.Path as SpeechType;

    switch (message.headers.Path) {
      case 'turn.start':
        this.subject.next({ type, turnStart: message.body });
        break;

      case 'turn.end':
        this.subject.next({ type, turnEnd: message.body });
        this.audioRequestId = null;
        break;

      case 'speech.startDetected':
        this.subject.next({ type, speechStart: message.body });
        break;

      case 'speech.hypothesis':
        this.subject.next({ type, speechHypothesis: message.body });
        break;

      case 'speech.phrase':
        this.subject.next({ type, speechPhrase: message.body });
        break;

      case 'speech.endDetected':
        this.subject.next({ type, speechEnd: message.body });
        break;

      case 'translation.hypothesis':
        this.subject.next({ type, translationHypothesis: message.body });
        break;

      case 'translation.phrase':
        this.subject.next({ type, translationPhrase: message.body });
        break;

      default:
        console.log('Unkown speech event', message.headers.Path, message.body);
        break;
    }
  }

  private sendSpeechConfig() {
    const config = {
      context: {
        system: { version: 'chstone 0.0.1' },
        os: {
          platform: 'navigator.userAgent',
          name: 'Browser',
          version: null as string,
        },
        device: {
          manufacturer: 'Microsoft',
          model: 'SpeechSDK',
          version: '1.0.0',
        }
      }
    };
    return this.sendJson('speech.config', config);
  }

  private sendJson(path: string, content: any, extraHeaders?: KeyValues<string>) {
    return this.sendText(path, 'application/json', JSON.stringify(content), extraHeaders);
  }

  private sendText(path: string, contentType: string, text: string, extraHeaders?: KeyValues<string>) {
    const headers = Object.assign({}, {
      'Content-Type': contentType,
    }, extraHeaders);

    return this.send(path, headers, text);
  }

  private send(path: string, extraHeaders: KeyValues<string>, body: string | ArrayBuffer) {
    const requestId = createUUID();
    const headers = Object.assign({}, {
      'Path': path,
      'X-Timestamp': new Date().toISOString(),
      'X-RequestId': requestId,
    }, extraHeaders);
    const headersText = encodeKeyValues(headers);


    // string message
    if (typeof body === 'string') {
      this.socket.send(headersText + SEPARATOR + body);

    // binary message
    } else {
      const prefixSize = 2;
      const headerBytes = TEXT_ENCODER.encode(headersText);
      if (headerBytes.byteLength > 0x2000) {
        throw new Error('Headers too large');
      }
      const size = prefixSize
        + headerBytes.byteLength
        + body.byteLength;
      const data = new DataViewWriter(new DataView(new ArrayBuffer(size)))
        .writeInt16(headerBytes.byteLength)
        .writeBytes(headerBytes)
        .writeBytes(new Uint8Array(body))
        .buffer;
      this.socket.send(data);
    }

    return requestId;
  }

  private onOpen(event: Event) {
    console.log('Speech WebSocket is open');
    this.sendSpeechConfig();
    this.readyStart.resolve();
    this.subject.next({ type: 'connected' });
  }

  private onError(event: Event) {
    console.log('Speech WebSocket error', event);
    this.subject.error(event);
  }

  private onClose(event: Event) {
    console.log('Speech WebSocket is closed');
    this.subject.next({ type: 'disconnected' });
  }
}

function encodeKeyValues(values: KeyValues<string>) {
  return Object.keys(values)
    .filter((key) => values[key] !== undefined)
    .map((key) => `${key}:${values[key]}`)
    .join(CRLF);
}

function decodeKeyValues(values: string): KeyValues<string> {
  const keyValues: KeyValues<string> = { };
  values.split(CRLF)
    .map((pair) => pair.split(':').map((x) => x.trim()))
    .forEach(([key, value]) => keyValues[key] = value);
  return keyValues;
}

function createUUID() {
  return uuid().replace(/-/g, '');
}

function decodeMessage(message: string) {
  const [headersRaw, bodyRaw] = message.split(SEPARATOR);
  const headers = decodeKeyValues(headersRaw);
  const body = decodeText(bodyRaw, headers['Content-Type']);
  return { headers, body };
}

function decodeText(text: string, contentType: string) {
  if (contentType.startsWith('application/json')) {
    contentType = 'application/json';
  }
  switch (contentType) {
    case 'application/json': return JSON.parse(text);
    default: return text;
  }
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value?: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
}

function defer<T = any>(): Deferred<T> {
  const deferred: Deferred<T> = {
    resolve: null,
    reject: null,
    promise: null,
  };
  deferred.promise = new Promise<T>((resolve, reject) => {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
  return deferred;
}
