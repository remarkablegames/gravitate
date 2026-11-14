export const hasTouch = (): boolean =>
  'maxTouchPoints' in navigator
    ? navigator.maxTouchPoints > 0
    : 'ontouchstart' in window;
