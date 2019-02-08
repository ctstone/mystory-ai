import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { from, concat, Observable, of } from 'rxjs';
import { flatMap, tap, mapTo, concatAll, merge, bufferCount, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class MetService {

  private objectCache = new Map<string, any>();

  constructor(private http: HttpClient) { }

  object(id: string) {
    if (this.objectCache.has(id)) {
      return of(this.objectCache.get(id));
    } else {
      return this.http.get<any>(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`)
        .pipe(tap((resp) => this.objectCache.set(id, resp)));
    }
  }

  getSmallImageUrl(objectId: string) {
    return this.object(objectId).pipe(map((resp) => resp.primaryImageSmall));
  }
}
