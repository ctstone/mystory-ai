import { Component, OnInit } from '@angular/core';
import { SpeechRecorder, Recording } from '../shared/audio/speech-recorder';
import { tap, takeLast } from 'rxjs/operators';

const SPEECH_KEY = '9fc035f617b64eb6b169816d5622d112';
const SPEECH_ENDPOINT = 'https://eastus.stt.speech.microsoft.com/speech/recognition/interactive/cognitiveservices/v1?language=en-US';

@Component({
  selector: 'app-speech',
  templateUrl: './speech.component.html',
  styleUrls: ['./speech.component.css']
})
export class SpeechComponent implements OnInit {

  recording: Recording;

  get connected() { return this.stt.connected; }
  get connecting() { return this.stt.state === 'Connecting'; }
  get listening() { return this.stt.state === 'Listening'; }
  get state() {
    if (this.startingMic && !this.listening) {
      return 'WAIT';
    } else {
      return this.stt.state;
    }
  }

  private context = new AudioContext();
  private stt = new SpeechRecorder(this.context, 16000);
  private startingMic: boolean;

  constructor() { }

  async ngOnInit() {
    await this.connect();
  }

  async connect() {
    await this.stt.connect(SPEECH_ENDPOINT, SPEECH_KEY);
  }

  async listen() {
    this.startingMic = true;
    this.stt.record(10000)
      .pipe(
        tap((recording) => this.recording = recording),
        takeLast(1),
        // flatMap((recording) => {
        //   return this.storage.saveRecording(recording).pipe(mapTo(recording));
        // }),
        // flatMap((recording) => {
        //   return this.luis.predict(recording.text);
        // }),
      )
      .subscribe((prediction) => {
        this.startingMic = false;
      });
  }

}
