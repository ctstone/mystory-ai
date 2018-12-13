import { Subject } from 'rxjs';

import { tap } from 'rxjs/operators';
import { AudioConverter } from './audio-converter';
import { Listener } from './listener';
import { SpeechHypothesis, SpeechPhrase, SpeechToTextWebsocket } from './speech-to-text-websocket';

const NUM_CHANNELS = 1;
const DEFAULT_BUFFER_SIZE = 2048;
const DEFAULT_OUTPUT_SAMPLE_RATE = 16000;
const AUDIO_BLOB_TYPE = 'audio/wav';
const AUDIO_STT_TYPE = 'audio/x-wav';

export interface Recording {
  text: string;
  wav?: Blob;
  status?: string;
}

export class SpeechRecorder {

  get connected() {
    return this.speechWs.isOpen;
  }
  get state() {
    if (this.connecting) {
      return 'Connecting';
    } else if (this.listener.listening) {
      return 'Listening';
    }
  }

  private connecting: boolean;
  private listener: Listener;
  private converter: AudioConverter;
  private speechWs = new SpeechToTextWebsocket();
  private stopped: boolean;

  constructor(context?: AudioContext, outputSampleRate = DEFAULT_OUTPUT_SAMPLE_RATE, bufferSize = DEFAULT_BUFFER_SIZE) {
    context = context || new AudioContext;
    this.listener = new Listener(context, bufferSize, NUM_CHANNELS);
    this.converter = new AudioConverter(NUM_CHANNELS, context.sampleRate, outputSampleRate);
  }

  async connect(endpoint: string, key: string) {
    this.connecting = true;
    await this.speechWs.connect(endpoint, key);
    this.connecting = false;
  }

  disconnect() {
    this.speechWs.disconnect();
  }

  stop() {
    this.listener.stop();
    this.speechWs.endAudio();
    this.stopped = true;
  }

  record(maxLength: number, closeStream = true) {
    if (!this.stopped) {
      console.log('NOT STOPPED');
    }
    const recording: Recording = { text: '' };
    const recordingChunks: ArrayBuffer[] = [];
    const parts: { [key: string]: SpeechHypothesis | SpeechPhrase } = {};
    const subject = new Subject<Recording>();
    this.stopped = false;

    /** call to signal end of recording */
    const stop = () => {
      if (!this.stopped) {
        this.stopped = true;
        this.listener.stop(closeStream);
        this.speechWs.endAudio();
      }
    };

    /** call to collect partial text */
    const onSpeechChunk = (data: SpeechHypothesis | SpeechPhrase) => {
      parts[data.Offset] = data;
      recording.text = Object.keys(parts)
        .map((k) => getSpeechText(parts[k]))
        .join(' ');
      if (data.hasOwnProperty('RecognitionStatus')) {
        recording.status = (data as any).RecognitionStatus;
      }
      subject.next(recording);
    };

    /** speech events */
    const s1 = this.speechWs.speechStart
      .subscribe(() => Object.keys(parts).forEach((k) => delete parts[k]));
    const s2 = this.speechWs.speechPhrase
      .pipe(
        tap((part) => {
          if (this.stopped) {
            recording.wav = new Blob(recordingChunks, { type: AUDIO_BLOB_TYPE });
          }
          onSpeechChunk(part);
        })
      )
      .subscribe(onSpeechChunk);
    const s3 = this.speechWs.speechHypothesis
      .subscribe(onSpeechChunk);
    const s4 = this.speechWs.turnEnd
      .subscribe(() => {
        subject.complete();
        [s1, s3, s4, s5, s2].forEach((x) => x.unsubscribe());
      });
    const s5 = this.speechWs.speechEnd
      .subscribe(() => {
        stop();
      });

    /** open the microphone */
    this.listener.listen((buffer) => {
      const audio = buffer.getChannelData(0).slice();
      if (recordingChunks.length === 0) {
        const headChunk = this.converter.toWav(audio, true);
        recordingChunks.push(headChunk);
        this.speechWs.beginAudio(headChunk, AUDIO_STT_TYPE);
      } else {
        const chunk = this.converter.toWavChunk(audio);
        recordingChunks.push(chunk);
        this.speechWs.audio(chunk);
      }
    });

    /** stop listening after some time */
    if (maxLength) {
      setTimeout(stop, maxLength);
    }

    return subject.asObservable();
  }
}

function getSpeechText(data: SpeechHypothesis | SpeechPhrase) {
  const x = data as any;
  if (x.hasOwnProperty('Text')) {
    return x.Text;
  } else if (x.hasOwnProperty('DisplayText')) {
    return x.DisplayText;
  } else {
    return '';
  }
}
