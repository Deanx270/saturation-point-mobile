import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as Facebook from 'expo-auth-session/providers/facebook';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import AtelierText from '../common/AtelierText';
import AtelierButton from '../common/AtelierButton';
import { socialLogin } from '../../redux/authSlice';
import { registerForPushNotificationsAsync } from '../../services/pushNotificationService';
import {
  getSocialAuthConfig,
  isFirebaseConfigured,
  signInWithGoogleWebPopup,
  signInWithFacebookWebPopup,
  exchangeGoogleIdTokenForFirebaseIdToken,
  exchangeFacebookTokenForFirebaseIdToken,
} from '../../services/firebaseClient';

WebBrowser.maybeCompleteAuthSession();

const getNativeGoogleClientId = (clientIds) => {
  if (Platform.OS === 'ios') {
    return clientIds.iosClientId || clientIds.webClientId || '';
  }
  if (Platform.OS === 'android') {
    return clientIds.androidClientId || clientIds.webClientId || '';
  }
  return clientIds.webClientId || '';
};

const GoogleNativeAuthButton = ({ clientIds, busy, onToken, onError }) => {
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: clientIds.iosClientId,
    androidClientId: clientIds.androidClientId,
    webClientId: clientIds.webClientId,
  });

  useEffect(() => {
    const completeGoogle = async () => {
      if (response?.type === 'success') {
        const googleIdToken =
          response.authentication?.idToken || response.params?.id_token;
        if (!googleIdToken) {
          onError('Google sign-in did not return an ID token.');
          return;
        }
        try {
          const firebaseIdToken = await exchangeGoogleIdTokenForFirebaseIdToken(
            googleIdToken
          );
          await onToken(firebaseIdToken);
        } catch (err) {
          onError(err.message || 'Unable to sign in with Google.');
        }
      } else if (response?.type === 'error') {
        onError(response.error?.message || 'Google sign-in failed.');
      }
    };
    completeGoogle();
  }, [response]);

  return (
    <AtelierButton
      title="Continue with Google"
      variant="outline"
      disabled={!request || busy}
      onPress={() => promptAsync()}
      icon={
        <Ionicons
          name="logo-google"
          size={18}
          color={theme.colors.inkPrimary}
        />
      }
      style={styles.socialButton}
    />
  );
};

const FacebookNativeAuthButton = ({ appId, busy, onToken, onError }) => {
  const [request, response, promptAsync] = Facebook.useAuthRequest({
    clientId: appId,
  });

  useEffect(() => {
    const completeFacebook = async () => {
      if (response?.type === 'success') {
        const accessToken =
          response.authentication?.accessToken || response.params?.access_token;
        if (!accessToken) {
          onError('Facebook sign-in did not return an access token.');
          return;
        }
        try {
          const firebaseIdToken = await exchangeFacebookTokenForFirebaseIdToken(
            accessToken
          );
          await onToken(firebaseIdToken);
        } catch (err) {
          onError(err.message || 'Unable to sign in with Facebook.');
        }
      } else if (response?.type === 'error') {
        onError(response.error?.message || 'Facebook sign-in failed.');
      }
    };
    completeFacebook();
  }, [response]);

  return (
    <AtelierButton
      title="Continue with Facebook"
      variant="outline"
      disabled={!request || busy}
      onPress={() => promptAsync()}
      icon={
        <Ionicons
          name="logo-facebook"
          size={18}
          color={theme.colors.inkPrimary}
        />
      }
      style={styles.socialButton}
    />
  );
};

export const SocialAuthSection = ({ onAuthenticated }) => {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.auth);
  const [socialBusy, setSocialBusy] = useState(false);

  const authConfig = getSocialAuthConfig();
  const nativeGoogleReady =
    Platform.OS !== 'web' &&
    isFirebaseConfigured() &&
    Boolean(getNativeGoogleClientId(authConfig.googleClientIds));
  const nativeFacebookReady =
    Platform.OS !== 'web' &&
    isFirebaseConfigured() &&
    Boolean(authConfig.facebookAppId);
  const webReady = Platform.OS === 'web' && isFirebaseConfigured();

  const submitFirebaseIdToken = async (idToken) => {
    setSocialBusy(true);
    try {
      const pushToken = await registerForPushNotificationsAsync();
      const result = await dispatch(
        socialLogin({
          idToken,
          pushToken,
          device: Platform.OS,
        })
      );
      if (socialLogin.fulfilled.match(result)) {
        if (onAuthenticated) {
          onAuthenticated();
        }
      } else {
        Alert.alert('Sign In Failed', result.payload || 'Social login failed.');
      }
    } finally {
      setSocialBusy(false);
    }
  };

  const handleUnconfiguredPress = (providerName, requiredVar) => {
    Alert.alert(
      `${providerName} Sign-In Not Configured`,
      `Set EXPO_PUBLIC_FIREBASE_* and ${requiredVar} in mobile/.env to enable ${providerName} sign-in.`
    );
  };

  const handleWebPopup = async (provider) => {
    setSocialBusy(true);
    try {
      const idToken =
        provider === 'google'
          ? await signInWithGoogleWebPopup()
          : await signInWithFacebookWebPopup();
      await submitFirebaseIdToken(idToken);
    } catch (err) {
      setSocialBusy(false);
      Alert.alert('Sign In Failed', err.message || 'Unable to sign in.');
    }
  };

  const busy = loading || socialBusy;

  return (
    <View style={styles.container}>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <AtelierText
          variant="caption"
          color={theme.colors.inkMuted}
          style={styles.dividerLabel}
        >
          OR CONTINUE WITH
        </AtelierText>
        <View style={styles.dividerLine} />
      </View>

      {nativeGoogleReady ? (
        <GoogleNativeAuthButton
          clientIds={authConfig.googleClientIds}
          busy={busy}
          onToken={submitFirebaseIdToken}
          onError={(msg) => Alert.alert('Google Sign-In Failed', msg)}
        />
      ) : (
        <AtelierButton
          title="Continue with Google"
          variant="outline"
          loading={socialBusy && Platform.OS === 'web'}
          disabled={busy}
          onPress={() =>
            webReady
              ? handleWebPopup('google')
              : handleUnconfiguredPress(
                  'Google',
                  'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'
                )
          }
          icon={
            <Ionicons
              name="logo-google"
              size={18}
              color={theme.colors.inkPrimary}
            />
          }
          style={styles.socialButton}
        />
      )}

      {nativeFacebookReady ? (
        <FacebookNativeAuthButton
          appId={authConfig.facebookAppId}
          busy={busy}
          onToken={submitFirebaseIdToken}
          onError={(msg) => Alert.alert('Facebook Sign-In Failed', msg)}
        />
      ) : (
        <AtelierButton
          title="Continue with Facebook"
          variant="outline"
          loading={socialBusy && Platform.OS === 'web'}
          disabled={busy}
          onPress={() =>
            webReady
              ? handleWebPopup('facebook')
              : handleUnconfiguredPress(
                  'Facebook',
                  'EXPO_PUBLIC_FACEBOOK_APP_ID'
                )
          }
          icon={
            <Ionicons
              name="logo-facebook"
              size={18}
              color={theme.colors.inkPrimary}
            />
          }
          style={styles.socialButton}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerLabel: {
    marginHorizontal: theme.spacing.md,
  },
  socialButton: {
    marginBottom: theme.spacing.md,
  },
});

export default SocialAuthSection;
