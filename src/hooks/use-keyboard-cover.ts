import { useCallback, useEffect, useRef, useState, type ComponentRef } from "react";
import { Keyboard, View, type KeyboardEvent } from "react-native";

import { keyboardCover } from "@/services/keyboard-inset.mjs";

export function useKeyboardCover() {
  const root = useRef<ComponentRef<typeof View>>(null);
  const [cover, setCover] = useState(0);
  const ref = useCallback((node: ComponentRef<typeof View> | null) => {
    root.current = node;
    if (!node) setCover(0);
  }, []);

  useEffect(() => {
    let alive = true;
    const showName = process.env.EXPO_OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideName = process.env.EXPO_OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const measure = (event: KeyboardEvent) => {
      const keyboardTop = event.endCoordinates.screenY;
      root.current?.measureInWindow((_x, y, _width, height) => {
        if (!alive || !(height > 0)) return;
        if (process.env.EXPO_OS === "ios") Keyboard.scheduleLayoutAnimation(event);
        setCover(keyboardCover(y, height, keyboardTop));
      });
    };

    const show = Keyboard.addListener(showName, measure);
    const hide = Keyboard.addListener(hideName, (event) => {
      if (process.env.EXPO_OS === "ios") Keyboard.scheduleLayoutAnimation(event);
      setCover(0);
    });

    return () => {
      alive = false;
      show.remove();
      hide.remove();
    };
  }, []);

  return { ref, cover };
}
