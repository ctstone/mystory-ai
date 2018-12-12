import { TextEncoder } from 'text-encoding';

export class DataViewWriter {

  get buffer() { return this.view.buffer; }
  private offset: number;
  private textEncoder = new TextEncoder();

  constructor(public view: DataView, offset?: number) {
    this.offset = offset || 0;
  }

  writeString(value: string): DataViewWriter {
    const bytes = this.textEncoder.encode(value);
    return this.writeBytes(bytes);
  }

  writeUint32(value: number, littleEndian?: boolean): DataViewWriter {
    this.view.setUint32(this.offset, value, littleEndian);
    this.offset += 4;
    return this;
  }

  writeUint16(value: number, littleEndian?: boolean): DataViewWriter {
    this.view.setUint16(this.offset, value, littleEndian);
    this.offset += 2;
    return this;
  }

  writeInt16(value: number, littleEndian?: boolean): DataViewWriter {
    this.view.setInt16(this.offset, value, littleEndian);
    this.offset += 2;
    return this;
  }

  writeBytes(bytes: Uint8Array): DataViewWriter {
    for (let i = 0; i < bytes.byteLength; i += 1) {
      this.view.setUint8(this.offset, bytes[i]);
      this.offset += 1;
    }
    return this;
  }
}
