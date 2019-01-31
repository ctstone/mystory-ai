import { Directive, OnChanges, ElementRef } from '@angular/core';

@Directive({
  selector: '[appScroll]',
  exportAs: 'appScroll'
})
export class ScrollDirective {

  constructor(private el: ElementRef<HTMLElement>) { }

  scrollToEnd() {
    const el = this.el.nativeElement;
    if (el.scrollBy) {
      el.scrollBy({
        left: el.scrollWidth,
        behavior: 'smooth',
      });
    } else if (el.lastElementChild && el.lastElementChild.scrollIntoView) {
      el.lastElementChild.scrollIntoView(false);
    }
  }

}
