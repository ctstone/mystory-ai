export type ListenCallback = (buffer: AudioBuffer) => void;

export class Listener {

  private processor: ScriptProcessorNode;
  private source: MediaStreamAudioSourceNode;
  private audioHandler: (event: AudioProcessingEvent) => void;

  listening = false;

  constructor(
    private context: AudioContext,
    private bufferSize = 1024,
    private numChannels = 1) { }

  async listen(callback: ListenCallback): Promise<MediaStreamAudioSourceNode> {
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
    const media = await window.navigator.mediaDevices.getUserMedia({ audio: true });
    this.source = this.context.createMediaStreamSource(media);
    this.processor = this.context.createScriptProcessor(this.bufferSize, this.numChannels, this.numChannels);
    this.source
      .connect(this.processor)
      .connect(this.context.destination);

    this.audioHandler = (event) => {
      if (this.listening) {
        callback(event.inputBuffer);
      }
    };
    this.processor.addEventListener('audioprocess', this.audioHandler);
    this.listening = true;
    return this.source;
  }

  stop(closeStream = true) {
    this.listening = false;
    this.processor.removeEventListener('audioprocess', this.audioHandler);
    if (closeStream) {
      this.source.mediaStream.getAudioTracks()
        .forEach(track => track.stop());
      this.context.suspend();
    }
  }
}

export function calculateDecibels(sample: Float32Array) {
  const amplitude = rootMeanSquare(sample);
  return 20 * Math.log10(amplitude);
}

function rootMeanSquare(items: Float32Array) {
  const sum = items.reduce((m, x) => m + (x * x), 0);
  return Math.sqrt(sum / items.length);
}
