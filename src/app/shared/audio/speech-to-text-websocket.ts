import { Observable, Subject } from 'rxjs';
import { TextEncoder } from 'text-encoding';
import { v4 as uuid } from 'uuid';

import { DataViewWriter } from './data-view-writer';

const CRLF = '\r\n';
const SEPARATOR = CRLF + CRLF;
const TEXT_ENCODER = new TextEncoder();

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value?: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
}

interface KeyValues<T> {
  [key: string]: T;
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

export class SpeechToTextWebsocket {

  get speechStart() { return this.mSpeechStart as Observable<SpeechBoundary>; }
  get speechEnd() { return this.mSpeechEnd as Observable<SpeechBoundary>; }
  get speechPhrase() { return this.mSpeechPhrase as Observable<SpeechPhrase>; }
  get speechHypothesis() { return this.mSpeechHypothesis as Observable<SpeechHypothesis>; }
  get isOpen() { return this.ws && this.ws.readyState === WebSocket.OPEN; }

  private ws: WebSocket;
  private audioRequestId: string;
  private connectionId: string;
  private mSpeechStart = new Subject<SpeechBoundary>();
  private mSpeechEnd = new Subject<SpeechBoundary>();
  private mSpeechPhrase = new Subject<SpeechPhrase>();
  private mSpeechHypothesis = new Subject<SpeechHypothesis>();

  constructor() { }

  connect(endpoint: string, key: string) {
    const sentConfig = deferred<void>();

    this.connectionId = createUUID();
    const temp = endpoint.includes('?') ? '&' : '?';
    const url = endpoint.replace('https:', 'wss:')
      + temp
      + `Ocp-Apim-Subscription-Key=${key}`
      + `&X-ConnectionId=${this.connectionId}`;
    this.ws = new WebSocket(url);
    this.ws.addEventListener('open', () => {
      console.log('OPENED');
      try {
        this.sendSpeechConfig();
        sentConfig.resolve();
      } catch (err) {
        sentConfig.reject(err);
      }
    });

    this.ws.addEventListener('error', (event) => {
      console.error('WebSocket error', event);
    });

    this.ws.addEventListener('message', (event) => {
      const message = decodeMessage(event.data);
      console.log(message.headers.Path, message.body);

      switch (message.headers.Path) {
        case 'speech.startDetected':
          this.mSpeechStart.next(message.body);
          break;

        case 'speech.hypothesis':
          this.mSpeechHypothesis.next(message.body);
          break;

        case 'speech.phrase':
          this.mSpeechPhrase.next(message.body);
          break;

        case 'speech.endDetected':
          this.mSpeechEnd.next(message.body);
          break;
      }
    });

    this.ws.addEventListener('close', (event) => {
      console.log('WebSocket closed', event);
    });

    return sentConfig.promise;
  }

  disconnect() {
    this.ws.close();
  }

  beginAudio(speech: ArrayBuffer, contentType: string) {
    const headers = { 'Content-Type': contentType };
    this.audioRequestId = this.send('audio', headers, speech);
    return this.audioRequestId;
  }

  audio(speech: ArrayBuffer) {
    this.throwIfNoAudioRequestId();
    const headers = { 'X-RequestId': this.audioRequestId, 'Content-Type': 'audio/x-wav' };
    return this.send('audio', headers, speech);
  }

  endAudio() {
    this.throwIfNoAudioRequestId();
    const headers = { 'X-RequestId': this.audioRequestId, 'Content-Type': 'audio/x-wav' };
    return this.send('audio', headers, new ArrayBuffer(0));
  }

  close() {
    this.ws.close();
  }

  private throwIfNoAudioRequestId() {
    if (!this.audioRequestId) {
      throw new Error('Must call beginAudio first');
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
      this.ws.send(headersText + SEPARATOR + body);

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
      this.ws.send(data);
    }

    return requestId;
  }
}

function encodeKeyValues(values: KeyValues<string>) {
  return Object.keys(values)
    .filter((key) => values[key] !== undefined)
    // .map((key) => `${key}:${encodeURIComponent(values[key])}`)
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

function deferred<T = any>(): Deferred<T> {
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
