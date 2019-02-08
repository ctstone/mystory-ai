import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { from, concat, Observable } from 'rxjs';
import { flatMap, tap, mapTo, concatAll, merge, bufferCount } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class MetService {

  constructor(private http: HttpClient) { }

  object(id: string) {
    return this.http.get<any>(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
  }

  assignImageUrls(docs: Array<{objectId: string}>): Observable<Array<{objectId: string, images: any}>> {
    return from(docs)
      .pipe(
        flatMap((doc) => this.object(doc.objectId)
          .pipe(tap((resp) => {
            (doc as any).images = {
              primary: resp.primaryImage,
              primarySm: resp.primaryImageSmall,
              alt: resp.additionalImages,
            };
          })),
        ),
        bufferCount(docs.length),
        mapTo(docs as any),
      );
  }
}
