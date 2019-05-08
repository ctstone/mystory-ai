import { Directive, ElementRef, Input, OnInit } from '@angular/core';
import { MetService } from './met.service';

@Directive({
  selector: 'img[appMetObjectId]'
})
export class MetImageDirective implements OnInit {

  @Input()
  appMetObjectId: string;

  constructor(
    private el: ElementRef<HTMLImageElement>,
    private met: MetService
    ) { }

  ngOnInit() {
    this.met.getSmallImageUrl(this.appMetObjectId)
      .subscribe((resp) => this.el.nativeElement.src = resp);
  }

}
