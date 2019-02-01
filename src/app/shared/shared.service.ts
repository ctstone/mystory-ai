import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';

export type Key = string | symbol;

const EMPTY = {};

@Injectable({
  providedIn: 'root',
})
export class SharedService {

  private shared: Map<Key, BehaviorSubject<any>> = new Map();

  constructor() { }

  set<T>(key: Key, value: T) {
    this.createSharedKeyIfNotExists(key);
    this.shared.get(key).next(value);
  }

  unset(key: Key) {
    this.set(key, EMPTY);
  }

  get<T = any>(key: Key) {
    this.createSharedKeyIfNotExists(key);
    return (this.shared.get(key) as Observable<T>)
      .pipe(filter((x) => x !== EMPTY));
  }

  private createSharedKeyIfNotExists(key: Key) {
    if (!this.shared.has(key)) {
      this.shared.set(key, new BehaviorSubject(EMPTY));
    }
  }
}
