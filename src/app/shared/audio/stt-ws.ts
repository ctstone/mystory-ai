import { Subject, Observable } from 'rxjs';
import { TextEncoder } from 'text-encoding';
import { v4 as uuid } from 'uuid';
import { DataViewWriter } from './data-view-writer';

const CRLF = '\r\n';
const SEPARATOR = CRLF + CRLF;
const TEXT_ENCODER = new TextEncoder();

interface KeyValues<T> {
  [key: string]: T;
}

export interface SpeechEvent {
  type: 'hypothesis' | 'phrase' | 'start' | 'end' | 'turnStart' | 'turnEnd' | 'connected' | 'disconnected';
  hypothesis?: SpeechHypothesis;
  phrase?: SpeechPhrase;
  start?: SpeechBoundary;
  end?: SpeechBoundary;
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

export class SpeechToTextSocket {
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
  private audioRequestId: string;
  private readyStart: Deferred<void>;

  constructor(endpoint: string, key: string, private contentType = 'audio/x-wav') {
    const url = endpoint.replace('https:', 'wss:')
      + (endpoint.includes('?') ? '&' : '?')
      + `Ocp-Apim-Subscription-Key=${key}`
      + `&X-ConnectionId=${this.connectionId}`;
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

    switch (message.headers.Path) {
      case 'speech.startDetected':
        this.subject.next({ type: 'start', start: message.body });
        break;

      case 'speech.hypothesis':
        this.subject.next({ type: 'hypothesis', hypothesis: message.body });
        break;

      case 'speech.phrase':
        this.subject.next({ type: 'phrase', phrase: message.body });
        break;

      case 'speech.endDetected':
        this.subject.next({ type: 'end', end: message.body });
        break;

      case 'turn.start':
      this.subject.next({ type: 'turnStart', turnStart: message.body });
      break;

      case 'turn.end':
        this.subject.next({ type: 'turnEnd', turnEnd: message.body });
        this.audioRequestId = null;
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
  const d: Deferred<T> = {
    resolve: null,
    reject: null,
    promise: null,
  };
  d.promise = new Promise<T>((resolve, reject) => {
    d.resolve = resolve;
    d.reject = reject;
  });
  return d;
}
