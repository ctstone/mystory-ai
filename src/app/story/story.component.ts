import { Component, OnInit, ViewChild } from '@angular/core';
import { Recorder } from '../shared/audio/recorder2';
import { SpeechToTextSocket } from '../shared/audio/stt-ws';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ConfigService } from '../shared/config.service';
import { FormControl } from '@angular/forms';
import { tap, filter, flatMap, map } from 'rxjs/operators';
import { SearchService } from '../shared/search.service';
import { ScrollDirective } from '../shared/scroll.directive';

@Component({
  selector: 'app-story',
  templateUrl: './story.component.html',
  styleUrls: ['./story.component.css']
})
export class StoryComponent implements OnInit {

  @ViewChild('imagesElement')
  imagesChild: ScrollDirective;

  @ViewChild('phrasesElement')
  phrasesChild: ScrollDirective;

  get recording() { return this.recordState === 'recording'; }
  get connected() { return this.connectState === 'open'; }
  get connectState() { return this.connection ? this.connection.state : null; }
  get recordState() { return this.recorder ? this.recorder.state : null; }

  connecting: boolean;
  wavUrl: SafeUrl;
  inputControl = new FormControl();
  docs: any[] = [];
  phrases: string[] = [];
  placeholder = '';

  private recorder: Recorder;
  private connection: SpeechToTextSocket;

  constructor(
    private conf: ConfigService,
    private search: SearchService,
    private sanitizer: DomSanitizer) { }

  ngOnInit() {
    this.connect();
  }

  connect() {
    this.connecting = true;
    this.connection = new SpeechToTextSocket(this.conf.speechEndpoint, this.conf.speechKey);
    this.connection.events
      .pipe(
        tap((event) => {
          if (event.type === 'phrase' && event.phrase.DisplayText) {
            this.phrases.push(event.phrase.DisplayText);
            this.phrasesChild.scrollToEnd();
          } else if (event.type === 'turnStart') {
            this.inputControl.enable();
            this.inputControl.reset();
          } else if (event.type === 'turnEnd') {
            this.inputControl.disable();
          } else if (event.type === 'connected') {
            this.connecting = false;
          }
        }),
        filter((event) => event.type === 'hypothesis' && !!event.hypothesis.Text),
        tap((event) => this.inputControl.setValue(event.hypothesis.Text)),
        flatMap((event) => this.executeSearch(event.hypothesis.Text)),
        tap((docs) => {
          for (const doc of docs) {
            if (!this.docs.some((d) => d.id === doc.id)) {
              this.docs.push(doc);
            }
          }
          this.imagesChild.scrollToEnd();
        }),
      )
      .subscribe();
  }

  record() {
    if (!this.connected) {
      throw new Error('Not connected');
    }
    const chunks: ArrayBuffer[] = [];
    this.placeholder = 'WAIT (mic)';
    this.recorder = new Recorder(4096, 16000);
    this.recorder.start()
      .subscribe(
        (chunk) => {
          this.placeholder = 'Listening...';
          this.connection.processAudio(chunk);
          chunks.push(chunk);
        },
        (err) => console.error(err),
        () => {
          this.connection.processAudio(null);
          const blob = new Blob(chunks, { type: 'audio/wav' });
          const url = URL.createObjectURL(blob);
          this.wavUrl = this.sanitizer.bypassSecurityTrustUrl(url);
          this.docs.length = 0;
          this.phrases.length = 0;
          this.placeholder = '';
        }
      );
  }

  stop() {
    if (this.recorder.state === 'recording') {
      this.recorder.stop();
    }
  }

  private executeSearch(keywords: string) {
    const query = {
      search: keywords,
      filter: 'hasPrimaryImage',
      top: 2,
    };
    return this.search.query('artworks8', query)
      .pipe(
        map((resp) => resp.value as any[]),
        tap((docs) => docs.forEach(setPrimaryUrl)),
      );
  }
}

function setPrimaryUrl(doc: any) {
  if (doc.primaryImageUrl) {
    doc.$primaryImageUrl = 'https://methackstor.blob.core.windows.net/met-artworks'
      + `/artwork_images/PrimaryImages_LowRes/${doc.id}.jpg`
      + '?st=2018-12-22T01%3A16%3A24Z&se=2019-12-23T01%3A16%3A00Z&sp=rwl&sv=2018-03-28&sr=c'
      + '&sig=xPBaUe2E8oUF2IH6SvZKG4gNQDuCR6KjsPhUb24XKUQ%3D';
}
}
