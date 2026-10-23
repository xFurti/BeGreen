// How far the keyboard covers the bottom of a view measured in window coordinates.
// On current Expo Android the window keeps its height when the keyboard opens,
// so a KeyboardAvoidingView with no behavior leaves the composer underneath it.
// A fixed vertical offset is also wrong: it has to match this view's real top
// (stack header, or the top of a sheet), which changes per screen.

// Screen height stays at the display bottom when Android resizes the window for the IME.
// Window and root can both already sit on the keyboard; using only those makes a correct
// screenY look like the unreduced frame and the height gets subtracted twice.
export function keyboardFrameBottom(screenHeight: number, windowHeight: number, rootBottom: number): number {
  const candidates = [screenHeight, windowHeight, rootBottom].filter((n) => Number.isFinite(n) && n > 0);
  return candidates.length ? Math.max(...candidates) : 0;
}

export function resolveKeyboardTop(
  keyboardTop: number,
  keyboardHeight = 0,
  windowBottom = 0,
): number {
  const h = Number.isFinite(keyboardHeight) && keyboardHeight > 0 ? keyboardHeight : 0;
  const bottom = Number.isFinite(windowBottom) && windowBottom > 0 ? windowBottom : 0;
  if (!Number.isFinite(keyboardTop) || keyboardTop <= 0) {
    return h > 0 && bottom > h ? bottom - h : 0;
  }
  // On Android devices/modals where mVisibleViewArea.bottom does not shrink for the IME
  // and softInputMode is not strictly ADJUST_NOTHING, ReactRootView reports the bottom
  // of the display frame as screenY alongside the positive IME height.
  if (h > 0 && bottom > 0 && keyboardTop + h > bottom + 2) {
    return Math.max(0, keyboardTop - h);
  }
  return keyboardTop;
}

export function keyboardCover(
  viewTop: number,
  viewHeight: number,
  keyboardTop: number,
  keyboardHeight = 0,
  windowBottom = 0,
): number {
  if (!Number.isFinite(viewTop) || !Number.isFinite(viewHeight)) return 0;
  if (viewHeight <= 0) return 0;
  const viewBottom = viewTop + viewHeight;
  const top = resolveKeyboardTop(keyboardTop, keyboardHeight, Math.max(viewBottom, windowBottom));
  if (top <= 0) return 0;
  return Math.max(0, viewBottom - top);
}

// Closed keyboard: sit above the system bar. Open keyboard: sit on the keys.
// The safe-area inset is not added again, or a band stays between the field and the keyboard.
export function composerInset(safeBottom: number, cover: number, gap = 10): number {
  return (cover > 0 ? cover : safeBottom) + gap;
}

// Extra bottom padding for a ScrollView so fields near the end of the page can scroll above the keyboard.
export function scrollPaddingBottom(baseBottom: number, cover: number): number {
  const base = Number.isFinite(baseBottom) && baseBottom > 0 ? baseBottom : 0;
  const extra = Number.isFinite(cover) && cover > 0 ? cover : 0;
  return base + extra;
}

export type ScrollTargetInput = {
  scrollY: number;
  scrollTop: number;
  scrollHeight: number;
  inputTop: number;
  inputHeight: number;
  keyboardTop?: number;
  bottomMargin?: number;
  topMargin?: number;
};

// Target vertical scroll offset to bring a focused TextInput into the visible band above the keyboard,
// or null when the field is already comfortably in view.
export function focusedScrollOffset({
  scrollY,
  scrollTop,
  scrollHeight,
  inputTop,
  inputHeight,
  keyboardTop = 0,
  bottomMargin = 28,
  topMargin = 16,
}: ScrollTargetInput): number | null {
  if (
    !Number.isFinite(scrollY) ||
    !Number.isFinite(scrollTop) ||
    !Number.isFinite(scrollHeight) ||
    !Number.isFinite(inputTop) ||
    !Number.isFinite(inputHeight)
  ) {
    return null;
  }
  if (scrollHeight <= 0 || inputHeight <= 0) return null;

  const visibleTop = scrollTop + topMargin;
  const rawBottom =
    Number.isFinite(keyboardTop) && keyboardTop > 0
      ? Math.min(scrollTop + scrollHeight, keyboardTop)
      : scrollTop + scrollHeight;
  const visibleBottom = rawBottom - bottomMargin;
  if (visibleBottom <= visibleTop) return null;

  const inputBottom = inputTop + inputHeight;
  if (inputBottom > visibleBottom) {
    return Math.max(0, Math.round(scrollY + (inputBottom - visibleBottom)));
  }
  if (inputTop < visibleTop) {
    return Math.max(0, Math.round(scrollY + (inputTop - visibleTop)));
  }
  return null;
}
