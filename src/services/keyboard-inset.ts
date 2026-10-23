// How far the keyboard covers the bottom of a view measured in window coordinates.
// On current Expo Android the window keeps its height when the keyboard opens,
// so a KeyboardAvoidingView with no behavior leaves the composer underneath it.
// A fixed vertical offset is also wrong: it has to match this view's real top
// (stack header, or the top of a sheet), which changes per screen.

export function keyboardCover(viewTop: number, viewHeight: number, keyboardTop: number): number {
  if (!Number.isFinite(viewTop) || !Number.isFinite(viewHeight) || !Number.isFinite(keyboardTop)) return 0;
  if (viewHeight <= 0 || keyboardTop <= 0) return 0;
  return Math.max(0, viewTop + viewHeight - keyboardTop);
}

// Closed keyboard: sit above the system bar. Open keyboard: sit on the keys.
// The safe-area inset is not added again, or a band stays between the field and the keyboard.
export function composerInset(safeBottom: number, cover: number, gap = 10): number {
  return (cover > 0 ? cover : safeBottom) + gap;
}
