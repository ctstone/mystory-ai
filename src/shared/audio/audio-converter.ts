import { DataViewWriter } from './data-view-writer';

const PREFIX_LENGTH = 44;
const PREFIX_RIFF_LENGTH = 36;
const PREFIX_FMT_LENGTH = 16;
const BYTES_PER_SAMPLE = 2;
const BITS_PER_SAMPLE = BYTES_PER_SAMPLE * 8;

export class AudioConverter {
  constructor(
    private numChannels: number,
    private sampleRate: number,
    private desiredSampleRate: number) {
  }

  toWavChunk(audio: Float32Array) {
    audio = this.downsample(audio);
    const audioLength = this.calculateAudioByteLength(audio);
    const buffer = new ArrayBuffer(audioLength);
    const writer = new DataViewWriter(new DataView(buffer));
    this.writeAudioPCM(audio, writer);
    return buffer;
  }

  toWav(audio: Float32Array, streaming = false): ArrayBuffer {
    audio = this.downsample(audio);
    const audioLength = this.calculateAudioByteLength(audio);
    const chunkSize = streaming ? 0 : audioLength; // + PREFIX_RIFF_LENGTH ?
    const blockAlign = this.numChannels * BYTES_PER_SAMPLE;
    const byteRate = this.desiredSampleRate * blockAlign;
    const buffer = new ArrayBuffer(PREFIX_LENGTH + audioLength);
    const writer = new DataViewWriter(new DataView(buffer));

    writer
      .writeString('RIFF') // RIFF identifier
      .writeUint32(chunkSize) // RIFF chunk length
      .writeString('WAVE') // RIFF type
      .writeString('fmt ') // format chunk identifier
      .writeUint32(PREFIX_FMT_LENGTH, true) // format chunk length
      .writeUint16(1, true) // sample format (raw)
      .writeUint16(this.numChannels, true) // channel count
      .writeUint32(this.desiredSampleRate, true) // desired sample rate
      .writeUint32(byteRate, true) // byte rate
      .writeUint16(blockAlign, true) // block align
      .writeUint16(BITS_PER_SAMPLE, true) // bits per sample
      .writeString('data') // data chunk identifier
      .writeUint32(chunkSize, true); // data chunk length

    this.writeAudioPCM(audio, writer);
    return buffer;
  }

  toWavBlob(audio: Float32Array): Blob {
    const buffer = this.toWav(audio);
    return new Blob([buffer], { type: 'audio/wav' });
  }

  calculateAudioByteLength(audio: Float32Array) {
    return audio.length * BYTES_PER_SAMPLE;
  }

  downsample(audio: Float32Array) {
    if (this.desiredSampleRate === this.sampleRate || this.desiredSampleRate > this.sampleRate) {
      return audio;
    }

    const ratio = this.sampleRate / this.desiredSampleRate;
    const outLength = Math.round(audio.length / ratio);
    const audioOut = new Float32Array(outLength);
    let inOffset = 0;
    let outOffset = 0;
    while (outOffset < outLength) {
      const nextInOffset = Math.round((outOffset + 1) * ratio);
      let accum = 0;
      let count = 0;
      while (inOffset < nextInOffset && inOffset < audio.length) {
        accum += audio[inOffset++];
        count += 1;
      }
      audioOut[outOffset++] = accum / count;
    }
    return audioOut;
  }

  private writeAudioPCM(audio: Float32Array, writer: DataViewWriter) {
    for (let i = 0; i < audio.length; i += 1) {
      const sample = Math.max(-1, Math.min(1, audio[i]));
      writer.writeInt16(sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    }
  }
}

// function downsample(srcFrame: Float32Array, srcRate: number, dstRate: number) {
//   if (dstRate === srcRate || dstRate > srcRate) {
//     return srcFrame;
//   }
//   var ratio = srcRate / dstRate;
//   var dstLength = Math.round(srcFrame.length / ratio);

//   var dstFrame = new Float32Array(dstLength);
//   var srcOffset = 0;
//   var dstOffset = 0;
//   while (dstOffset < dstLength) {
//     var nextSrcOffset = Math.round((dstOffset + 1) * ratio);
//     var accum = 0;
//     var count = 0;
//     while (srcOffset < nextSrcOffset && srcOffset < srcFrame.length) {
//       accum += srcFrame[srcOffset++];
//       count++;
//     }
//     dstFrame[dstOffset++] = accum / count;
//   }
//   return dstFrame;
// }
