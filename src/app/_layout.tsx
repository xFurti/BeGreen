import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold } from "@expo-google-fonts/geist";
import { GeistMono_400Regular, GeistMono_500Medium } from "@expo-google-fonts/geist-mono";
import { useFonts } from "expo-font";
import { DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { C, F } from "@/theme/tokens";

SplashScreen.preventAutoHideAsync();

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: C.bg, card: C.bg, text: C.ink, primary: C.ink, border: C.line },
};

const sheet = {
  presentation: "formSheet",
  sheetGrabberVisible: true,
  sheetCornerRadius: 32,
  headerShown: false,
} as const;

export default function RootLayout() {
  const [loaded, error] = useFonts({ Geist_400Regular, Geist_500Medium, Geist_600SemiBold, GeistMono_400Regular, GeistMono_500Medium });

  useEffect(() => {
    if (loaded || error) SplashScreen.hide();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <ThemeProvider value={theme}>
      <StatusBar style="dark" />
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
