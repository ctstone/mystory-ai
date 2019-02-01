import { Observable, Subject } from 'rxjs';
import { AudioConverter } from './audio-converter';

export class Recorder {

  timedOut = false;
  state: 'starting' | 'stopped' | 'recording' = 'stopped';

  private context: AudioContext;
  private subject: Subject<ArrayBuffer>;
  private source: MediaStreamAudioSourceNode;
  private audioHandler: (event: AudioProcessingEvent) => void;
  private processor: ScriptProcessorNode;
  private timeoutTimer: any;
  private converter: AudioConverter;
  private firstChunk: boolean;

  constructor(private bufferSize: number, private outputSampleRate: number) {
  }

  start(timeout?: number): Observable<ArrayBuffer> {
    this.context = new AudioContext();
    this.converter = new AudioConverter(1, this.context.sampleRate, this.outputSampleRate);
    this.subject = new Subject<ArrayBuffer>();
    this.state = 'starting';

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((mediaStream) => this.onMediaStream(mediaStream))
      .catch((err) => this.onError(err));

    if (timeout) {
      this.timeoutTimer = setTimeout(() => this.onTimeout(), timeout);
    }

    return this.subject.asObservable();
  }

  stop() {
    this.state = 'stopped';
    if (this.processor) {
      this.processor.removeEventListener('audioprocess', this.audioHandler);
      this.processor.disconnect();
    }

    if (this.source) {
      if (this.source.mediaStream) {
        this.stopTracks(this.source.mediaStream);
      }
      this.source.disconnect();
    }

    if (this.context) {
      this.context.suspend();
      this.context.close();
    }

    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
    }

    this.subject.complete();
  }

  private stopTracks(media: MediaStream) {
    media.getAudioTracks().forEach((x) => x.stop());
  }

  private onTimeout() {
    this.timedOut = true;
    this.stop();
  }

  private onError(err: Error) {
    this.state = 'stopped';
    this.subject.error(err);
  }

  private onMediaStream(mediaStream: MediaStream) {
    this.source = this.context.createMediaStreamSource(mediaStream);
    this.processor = this.context.createScriptProcessor(this.bufferSize, 1, 1);
    this.processor.connect(this.context.destination);
    this.source.connect(this.processor);
    this.firstChunk = true;

    this.audioHandler = (event) => this.onAudio(event.inputBuffer);
    this.processor.addEventListener('audioprocess', this.audioHandler);
  }

  private onAudio(audio: AudioBuffer) {
    this.state = 'recording';
    const raw = audio.getChannelData(0);
    const encoded = this.firstChunk
      ? this.converter.toWav(raw, true)
      : this.converter.toWavChunk(raw);

    this.subject.next(encoded);
    this.firstChunk = false;
  }
}
