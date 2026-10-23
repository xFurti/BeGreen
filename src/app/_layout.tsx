import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold } from "@expo-google-fonts/geist";
import { GeistMono_400Regular, GeistMono_500Medium } from "@expo-google-fonts/geist-mono";
import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect, useMemo } from "react";
import { Appearance } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useApp } from "@/store/app-store";
import { F } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

SplashScreen.preventAutoHideAsync();

const sheet = {
  presentation: "formSheet",
  sheetGrabberVisible: true,
  sheetCornerRadius: 32,
  headerShown: false,
} as const;

export default function RootLayout() {
  const [loaded, error] = useFonts({ Geist_400Regular, Geist_500Medium, Geist_600SemiBold, GeistMono_400Regular, GeistMono_500Medium });
  const { C, scheme } = useTheme();
  const themePref = useApp((s) => s.theme);
  const theme = useMemo(() => {
    const base = scheme === "dark" ? DarkTheme : DefaultTheme;
    return { ...base, colors: { ...base.colors, background: C.bg, card: C.bg, text: C.ink, primary: C.ink, border: C.line } };
  }, [C, scheme]);

  useEffect(() => {
    if (loaded || error) SplashScreen.hide();
  }, [loaded, error]);

  // The root view shows behind sheets and during transitions; keep it on the page colour.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(C.bg);
  }, [C.bg]);

  // Light and Dark override the app windows, so sheets, the grabber and the keyboard follow.
  // System clears the override and the phone's changes keep arriving through useColorScheme.
  // Web's Appearance has no setter; matchMedia covers it there.
  useEffect(() => {
    if (typeof Appearance.setColorScheme !== "function") return;
    Appearance.setColorScheme(themePref === "system" ? "auto" : themePref);
  }, [themePref]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={theme}>
        <StatusBar style={scheme === "dark" ? "light" : "dark"} />
        <Stack
          screenOptions={{
            headerShadowVisible: false,
            headerBackButtonDisplayMode: "minimal",
            headerTintColor: C.ink,
            headerTitleStyle: { fontFamily: F.medium, fontSize: 17 },
            contentStyle: { backgroundColor: C.bg },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false, animation: "fade" }} />
          <Stack.Screen
            name="capture"
            options={{ presentation: "fullScreenModal", headerShown: false, contentStyle: { backgroundColor: C.black } }}
          />
          <Stack.Screen name="post/[id]" options={{ title: "" }} />
          <Stack.Screen name="squad/[id]" options={{ title: "" }} />
          <Stack.Screen name="drop" options={{ ...sheet, sheetAllowedDetents: [0.92] }} />
          <Stack.Screen name="leaf" options={{ ...sheet, sheetAllowedDetents: [0.92] }} />
          <Stack.Screen name="guide" options={{ ...sheet, sheetAllowedDetents: [0.92] }} />
          <Stack.Screen name="sources" options={{ ...sheet, sheetAllowedDetents: [0.8, 1] }} />
          <Stack.Screen name="new-squad" options={{ ...sheet, sheetAllowedDetents: [0.6] }} />
          <Stack.Screen name="comune" options={{ ...sheet, sheetAllowedDetents: [0.92] }} />
          <Stack.Screen name="league" options={{ title: "" }} />
          <Stack.Screen name="community/[id]" options={{ title: "" }} />
          <Stack.Screen name="spot/[id]" options={{ title: "" }} />
          <Stack.Screen name="member/[id]" options={{ title: "" }} />
          <Stack.Screen name="saved" options={{ title: "" }} />
          <Stack.Screen name="map/[id]" options={{ headerShown: false, animation: "fade" }} />
          <Stack.Screen name="add-spot" options={{ presentation: "fullScreenModal", headerShown: false }} />
          <Stack.Screen name="communities" options={{ ...sheet, sheetAllowedDetents: [0.92] }} />
          <Stack.Screen name="new-community" options={{ ...sheet, sheetAllowedDetents: [0.92] }} />
          <Stack.Screen name="join" options={{ ...sheet, sheetAllowedDetents: [0.7] }} />
          <Stack.Screen name="new-challenge" options={{ ...sheet, sheetAllowedDetents: [0.92] }} />
          <Stack.Screen name="flag-spot" options={{ ...sheet, sheetAllowedDetents: [0.7] }} />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
