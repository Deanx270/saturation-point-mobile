import React, { useEffect, useRef } from 'react';
import { Platform, View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider, useDispatch } from 'react-redux';
import * as Notifications from 'expo-notifications';
import { useFonts } from 'expo-font';
import { Lora_600SemiBold, Lora_700Bold } from '@expo-google-fonts/lora';
import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
} from '@expo-google-fonts/montserrat';
import { store } from './src/redux/store';
import AppNavigator, {
  navigateFromNotification,
  navigationRef,
} from './src/navigation/AppNavigator';
import { initDatabase } from './src/services/sqliteService';
import { hydrateCart } from './src/redux/cartSlice';
import { loadStoredAuth } from './src/redux/authSlice';

const AppContent = () => {
  const dispatch = useDispatch();
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    initDatabase();
    dispatch(hydrateCart());
    dispatch(loadStoredAuth());

    if (Platform.OS === 'web') {
      return undefined;
    }

    const handleInitialNotification = async () => {
      try {
        const lastResponse = await Notifications.getLastNotificationResponseAsync();
        const data = lastResponse?.notification?.request?.content?.data;
        if (!data) {
          return;
        }
        let attempts = 0;
        const tryNavigate = () => {
          if (navigationRef.isReady()) {
            navigateFromNotification(data);
          } else if (attempts < 10) {
            attempts += 1;
            setTimeout(tryNavigate, 200);
          }
        };
        tryNavigate();
      } catch (e) {}
    };

    handleInitialNotification();

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Push notification received in foreground:', notification);
      }
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (data) {
          navigateFromNotification(data);
        }
      }
    );

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [dispatch]);

  return (
    <SafeAreaProvider>
      <StatusBar
        style="dark"
        backgroundColor="#FAF9F6"
      />
      <AppNavigator />
    </SafeAreaProvider>
  );
};

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Lora_600SemiBold,
    Lora_700Bold,
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
  });

  if (!fontsLoaded && !fontError) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#FAF9F6',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator
          size="small"
          color="#CA8A04"
        />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <AppContent />
      </Provider>
    </GestureHandlerRootView>
  );
}
