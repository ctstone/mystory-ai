import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';
import { mapTo } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ConfigGuardGuard implements CanActivate {
  constructor(private config: ConfigService) { }
  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean> | Promise<boolean> | boolean {
    return this.config.load()
      .pipe(
        mapTo(true)
      );
  }
}
