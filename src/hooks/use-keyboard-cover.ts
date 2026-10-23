import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import {
  Dimensions,
  Keyboard,
  TextInput,
  View,
  type FocusEvent,
  type GestureResponderEvent,
  type KeyboardEvent,
  type KeyboardMetrics,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from "react-native";

import { focusedScrollOffset, keyboardCover, resolveKeyboardTop } from "@/services/keyboard-inset";

type Measurable = {
  measureInWindow?: (cb: (x: number, y: number, width: number, height: number) => void) => void;
  getBoundingClientRect?: () => { top: number; height: number };
};

function measureNode(node: unknown, cb: (y: number, height: number) => void) {
  if (!node || typeof node !== "object") return;
  const m = node as Measurable;
  if (typeof m.measureInWindow === "function") {
    m.measureInWindow((_x, y, _w, height) => {
      if (height > 0) cb(y, height);
    });
    return;
  }
  if (typeof m.getBoundingClientRect === "function") {
    const r = m.getBoundingClientRect();
    if (r.height > 0) cb(r.top, r.height);
  }
}

function isMeasurableInput(node: unknown): boolean {
  if (!node || typeof node !== "object") return false;
  if (process.env.EXPO_OS === "web" && typeof HTMLElement !== "undefined" && node instanceof HTMLElement) {
    return node.tagName === "INPUT" || node.tagName === "TEXTAREA";
  }
  const m = node as Measurable;
  return typeof m.measureInWindow === "function" || typeof m.getBoundingClientRect === "function";
}

function activeInputNode(fallback: unknown): unknown {
  const fromState = TextInput.State?.currentlyFocusedInput?.();
  if (isMeasurableInput(fromState)) return fromState;
  if (process.env.EXPO_OS === "web" && typeof document !== "undefined") {
    const el = document.activeElement;
    if (isMeasurableInput(el)) return el;
  }
  return isMeasurableInput(fallback) ? fallback : null;
}

export function useKeyboardCover() {
  const root = useRef<ComponentRef<typeof View>>(null);
  const scrollerRef = useRef<ScrollViewInstance>(null);
  const [cover, setCover] = useState(0);
  const [keyboardTop, setKeyboardTop] = useState(0);
  const keyboardTopRef = useRef(0);
  const scrollYRef = useRef(0);
  const focusedRef = useRef<unknown>(null);
  const draggingRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    for (const id of timersRef.current) clearTimeout(id);
    timersRef.current = [];
  }, []);

  const ensureVisible = useCallback(() => {
    if (draggingRef.current) return;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const input = activeInputNode(focusedRef.current);
    if (!input) return;

    const scrollHost =
      (scroller as unknown as { getNativeScrollRef?: () => unknown }).getNativeScrollRef?.() ??
      (scroller as unknown as { getScrollableNode?: () => unknown }).getScrollableNode?.() ??
      root.current;
    if (!scrollHost) return;

    measureNode(scrollHost, (scrollTop, scrollHeight) => {
      measureNode(input, (inputTop, inputHeight) => {
        const domScrollY = (scrollHost as { scrollTop?: unknown }).scrollTop;
        const currentScrollY = typeof domScrollY === "number" ? domScrollY : scrollYRef.current;
        const nextY = focusedScrollOffset({
          scrollY: currentScrollY,
          scrollTop,
          scrollHeight,
          inputTop,
          inputHeight,
          keyboardTop: keyboardTopRef.current,
        });
        if (nextY != null && Math.abs(nextY - currentScrollY) > 2) {
          scrollYRef.current = nextY;
          scroller.scrollTo({ x: 0, y: nextY, animated: true });
        }
      });
    });
  }, []);

  const scheduleEnsureVisible = useCallback(
    (delays: number[] = [32, 140]) => {
      for (const ms of delays) {
        const id = setTimeout(ensureVisible, ms);
        timersRef.current.push(id);
      }
    },
    [ensureVisible],
  );

  const ref = useCallback((node: ComponentRef<typeof View> | null) => {
    root.current = node;
    if (!node) {
      keyboardTopRef.current = 0;
      setKeyboardTop(0);
      setCover(0);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const isIOS = process.env.EXPO_OS === "ios";
    const showName = isIOS ? "keyboardWillShow" : "keyboardDidShow";
    const hideName = isIOS ? "keyboardWillHide" : "keyboardDidHide";

    const applyMetrics = (metrics: KeyboardMetrics, event?: KeyboardEvent) => {
      const winHeight = Dimensions.get("window").height;
      root.current?.measureInWindow((_x, y, _width, height) => {
        if (!alive || !(height > 0)) return;
        const top = resolveKeyboardTop(metrics.screenY, metrics.height, Math.max(winHeight, y + height));
        const nextCover = keyboardCover(y, height, top);
        keyboardTopRef.current = top;
        setKeyboardTop((prev) => (Math.abs(prev - top) < 1 ? prev : top));
        setCover((prev) => {
          if (Math.abs(prev - nextCover) < 1) return prev;
          if (isIOS && event) Keyboard.scheduleLayoutAnimation(event);
          return nextCover;
        });
        scheduleEnsureVisible([24, 120, 260]);
      });
    };

    const measure = (event: KeyboardEvent) => {
      applyMetrics(event.endCoordinates, event);
      const t1 = setTimeout(() => alive && applyMetrics(event.endCoordinates), 90);
      const t2 = setTimeout(() => alive && applyMetrics(event.endCoordinates), 240);
      timersRef.current.push(t1, t2);
    };

    const show = Keyboard.addListener(showName, measure);
    const frame = isIOS ? Keyboard.addListener("keyboardWillChangeFrame", measure) : null;
    const hide = Keyboard.addListener(hideName, (event) => {
      clearTimers();
      if (isIOS) Keyboard.scheduleLayoutAnimation(event);
      keyboardTopRef.current = 0;
      setKeyboardTop(0);
      setCover(0);
    });

    if (Keyboard.isVisible?.()) {
      const current = Keyboard.metrics?.();
      if (current) applyMetrics(current);
    }

    let cleanupWeb: (() => void) | undefined;
    if (process.env.EXPO_OS === "web" && typeof window !== "undefined") {
      const vv = window.visualViewport;
      const getVk = () =>
        (
          navigator as unknown as {
            virtualKeyboard?: {
              boundingRect?: { height?: number };
              addEventListener?: (type: string, fn: () => void) => void;
              removeEventListener?: (type: string, fn: () => void) => void;
            };
          }
        ).virtualKeyboard;
      const onViewport = () => {
        if (!alive) return;
        const winHeight = window.innerHeight;
        const vvBottom = vv ? vv.offsetTop + vv.height : winHeight;
        const vkHeight = getVk()?.boundingRect?.height ?? 0;
        const kbHeight = Math.max(0, winHeight - vvBottom, vkHeight);
        const top = winHeight - kbHeight;
        if (kbHeight > 40) {
          applyMetrics({ screenX: 0, screenY: top, width: vv?.width ?? window.innerWidth, height: kbHeight });
        } else if (keyboardTopRef.current > 0) {
          keyboardTopRef.current = 0;
          setKeyboardTop(0);
          setCover(0);
        }
      };
      const vk = getVk();
      window.addEventListener("resize", onViewport);
      vv?.addEventListener("resize", onViewport);
      vv?.addEventListener("scroll", onViewport);
      vk?.addEventListener?.("geometrychange", onViewport);
      cleanupWeb = () => {
        window.removeEventListener("resize", onViewport);
        vv?.removeEventListener("resize", onViewport);
        vv?.removeEventListener("scroll", onViewport);
        vk?.removeEventListener?.("geometrychange", onViewport);
      };
    }

    return () => {
      alive = false;
      clearTimers();
      show.remove();
      frame?.remove();
      hide.remove();
      cleanupWeb?.();
    };
  }, [clearTimers, scheduleEnsureVisible]);

  useEffect(() => {
    if (cover > 0) scheduleEnsureVisible([16, 110]);
  }, [cover, scheduleEnsureVisible]);

  const scrollProps = useMemo(
    () => ({
      scrollEventThrottle: 16,
      onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        scrollYRef.current = e.nativeEvent.contentOffset.y;
      },
      onScrollBeginDrag: () => {
        draggingRef.current = true;
      },
      onScrollEndDrag: () => {
        const id = setTimeout(() => {
          draggingRef.current = false;
        }, 120);
        timersRef.current.push(id);
      },
      onMomentumScrollEnd: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        scrollYRef.current = e.nativeEvent.contentOffset.y;
        draggingRef.current = false;
      },
      onContentSizeChange: () => {
        if (keyboardTopRef.current > 0 || activeInputNode(focusedRef.current)) {
          scheduleEnsureVisible([16, 90]);
        }
      },
      onFocusCapture: (e: FocusEvent) => {
        const candidate = (e as unknown as { target?: unknown }).target;
        const active = activeInputNode(candidate);
        if (active) focusedRef.current = active;
        draggingRef.current = false;
        scheduleEnsureVisible([32, 160, 300]);
      },
      onTouchEndCapture: (e: GestureResponderEvent) => {
        if (draggingRef.current) return;
        const candidate = (e as unknown as { target?: unknown }).target;
        if (isMeasurableInput(candidate)) focusedRef.current = candidate;
        scheduleEnsureVisible([60, 200]);
      },
    }),
    [scheduleEnsureVisible],
  );

  return { ref, cover, keyboardTop, scrollerRef, scrollProps, ensureVisible };
}
