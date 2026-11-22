import React, { useEffect, useRef, useCallback } from 'react';
import { Platform, View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider, useDispatch, useSelector } from 'react-redux';
import * as Notifications from 'expo-notifications';
import { useFonts } from 'expo-font';
import { Lora_600SemiBold, Lora_700Bold } from '@expo-google-fonts/lora';
import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
} from '@expo-google-fonts/montserrat';
import { store } from './src/redux/store';
import { theme } from './src/theme';
import AppNavigator, {
  navigateFromNotification,
  navigationRef,
} from './src/navigation/AppNavigator';
import { initDatabase } from './src/services/sqliteService';
import { hydrateCart, syncCartOwner } from './src/redux/cartSlice';
import {
  loadStoredAuth,
  syncPushToken,
  logout,
  cancelSignOut,
  clearAuthNotice,
} from './src/redux/authSlice';
import AtelierBottomSheet, {
  AtelierSheetProvider,
} from './src/components/common/AtelierBottomSheet';
import AtelierToast from './src/components/common/AtelierToast';
import CompleteProfileScreen from './src/screens/user/CompleteProfileScreen';

const GlobalAuthFeedback = () => {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { signOutPromptVisible, signingOut, authNotice } = useSelector(
    (state) => state.auth
  );

  return (
    <>
      <AtelierBottomSheet
        visible={signOutPromptVisible}
        onClose={() => {
          if (!signingOut) {
            dispatch(cancelSignOut());
          }
        }}
        title="Sign Out"
        subtitle="Are you sure you want to sign out of your account?"
        showCloseButton={false}
        options={[
          {
            key: 'confirm-sign-out',
            label: signingOut ? 'Signing Out...' : 'Sign Out',
            icon: 'log-out-outline',
            destructive: true,
            disabled: signingOut,
            immediate: true,
            onPress: () => dispatch(logout()),
          },
          {
            key: 'cancel-sign-out',
            label: 'Cancel',
            icon: 'close-outline',
            disabled: signingOut,
            onPress: () => dispatch(cancelSignOut()),
          },
        ]}
      />
      <AtelierToast
        visible={Boolean(authNotice?.message)}
        toastKey={authNotice?.key}
        message={authNotice?.message}
        iconName={authNotice?.tone === 'error' ? 'alert-circle' : 'checkmark-circle'}
        iconColor={authNotice?.tone === 'error' ? theme.colors.errorBorder : theme.colors.gold}
        onDismiss={() => dispatch(clearAuthNotice())}
        style={{ bottom: Math.max(insets.bottom, theme.spacing.md) + 74 }}
      />
    </>
  );
};

const AppContent = () => {
  const dispatch = useDispatch();
  const { user, token, initialLoading } = useSelector((state) => state.auth);
  const notificationListener = useRef();
  const responseListener = useRef();
  const pendingNotificationRef = useRef(null);
  const hydrationReadyRef = useRef(false);

  const needsProfileSetup = Boolean(
    user && !user.username && !user.profileCompleted
  );

  hydrationReadyRef.current = !initialLoading && !needsProfileSetup;

  const flushPendingNotification = useCallback(() => {
    const data = pendingNotificationRef.current;
    if (!data || !hydrationReadyRef.current) {
      return;
    }

    let attempts = 0;
    const tryNavigate = () => {
      if (!hydrationReadyRef.current) {
        return;
      }
      if (navigationRef.isReady()) {
        pendingNotificationRef.current = null;
        navigateFromNotification(data);
      } else if (attempts < 15) {
        attempts += 1;
        setTimeout(tryNavigate, 200);
      }
    };
    tryNavigate();
  }, []);

  useEffect(() => {
    if (initialLoading) {
      return;
    }
    const nextOwner = user?._id ? String(user._id) : 'guest';
    dispatch(syncCartOwner(nextOwner));
  }, [dispatch, initialLoading, user?._id]);

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
        pendingNotificationRef.current = data;
        flushPendingNotification();
      } catch (e) {}
    };

    handleInitialNotification();

    notificationListener.current = Notifications.addNotificationReceivedListener(
      () => {}
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (data) {
          pendingNotificationRef.current = data;
          flushPendingNotification();
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
  }, [dispatch, flushPendingNotification]);

  useEffect(() => {
    if (!initialLoading && !needsProfileSetup && pendingNotificationRef.current) {
      flushPendingNotification();
    }
  }, [initialLoading, needsProfileSetup, flushPendingNotification]);

  useEffect(() => {
    if (user?._id && token && Platform.OS !== 'web') {
      dispatch(syncPushToken({ requestPermission: false }));
    }
  }, [dispatch, user?._id, token]);

  return (
    <SafeAreaProvider>
      <AtelierSheetProvider>
        <StatusBar
          style="dark"
          backgroundColor="#FAF9F6"
        />
        {needsProfileSetup ? <CompleteProfileScreen /> : <AppNavigator />}
        <GlobalAuthFeedback />
      </AtelierSheetProvider>
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
