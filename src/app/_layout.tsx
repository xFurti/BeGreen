import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold } from "@expo-google-fonts/geist";
import { GeistMono_400Regular, GeistMono_500Medium } from "@expo-google-fonts/geist-mono";
import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect, useMemo } from "react";

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

  if (!loaded && !error) return null;

  return (
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
      </Stack>
    </ThemeProvider>
  );
}
