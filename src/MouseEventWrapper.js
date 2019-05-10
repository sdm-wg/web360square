export class MouseEventWrapper {
  static CLICK = 'click';
  static START = /iPhone|iPad|iPod|Android/.test(navigator.userAgent) ? 'touchstart' : 'mousedown';
  static MOVE  = /iPhone|iPad|iPod|Android/.test(navigator.userAgent) ? 'touchmove'  : 'mousemove';
  static END   = /iPhone|iPad|iPod|Android/.test(navigator.userAgent) ? 'touchend'   : 'mouseup';
}
