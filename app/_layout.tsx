import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { AppState, View, Text, Button } from 'react-native';
import { Stack, router, useRootNavigationState, type ErrorBoundaryProps } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { getSharedPayloads, clearSharedPayloads } from 'expo-sharing';
import { AppProvider, report } from '../src/state/app';
import { useTheme } from '../src/ui/theme';
import { readLocal } from '../src/services/files';
import { receiveSharedText } from '../src/state/incoming';
function Navigation() {
  const t = useTheme(),
    navigation = useRootNavigationState();
  useEffect(() => {
    if (!navigation?.key) return;
    let busy = false;
    const incoming = async () => {
      if (busy) return;
      const payload = getSharedPayloads()[0];
      if (!payload) return;
      busy = true;
      try {
        let text: string;
        if (payload.shareType === 'text') text = payload.value;
        else if (payload.shareType === 'file') text = await readLocal(payload.value);
        else throw new Error('Share a local JSON file or JSON text. Web links are not imported.');
        if (text.length > 2_000_000) throw new Error('Plan is too large (2 MB maximum).');
        receiveSharedText(text);
        router.push({ pathname: '/import', params: { incoming: String(Date.now()) } });
      } catch (e) {
        report(e);
      } finally {
        clearSharedPayloads();
        busy = false;
      }
    };
    void incoming();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void incoming();
    });
    return () => sub.remove();
  }, [navigation?.key]);
  return (
    <>
      <StatusBar style={t.isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.bg },
          animation: 'default',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="activity"
          options={{ presentation: 'transparentModal', animation: 'none' }}
        />
      </Stack>
    </>
  );
}
export default function Root() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <Navigation />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View
      style={{
        flex: 1,
        padding: 32,
        justifyContent: 'center',
        gap: 18,
        backgroundColor: '#F5F3EB',
      }}
    >
      <Text style={{ fontSize: 25, color: '#203C31' }}>Something needs attention</Text>
      <Text>{error.message}</Text>
      <Text>Your locally saved records are retained. Try reopening the screen.</Text>
      <Button title="Try again" onPress={retry} />
    </View>
  );
}
