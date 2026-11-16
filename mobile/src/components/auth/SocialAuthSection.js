import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform, Alert, Image } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as Facebook from 'expo-auth-session/providers/facebook';
import { theme } from '../../theme';
import AtelierText from '../common/AtelierText';
import AtelierButton from '../common/AtelierButton';
import AtelierErrorBanner from '../common/AtelierErrorBanner';
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

const GOOGLE_LOGO = require('../../../assets/brand/google-g.png');
const FACEBOOK_LOGO = require('../../../assets/brand/facebook-f.png');

const GoogleMark = () => (
  <Image
    source={GOOGLE_LOGO}
    style={styles.socialBrandIcon}
    resizeMode="contain"
  />
);

const FacebookMark = () => (
  <Image
    source={FACEBOOK_LOGO}
    style={styles.socialBrandIcon}
    resizeMode="contain"
  />
);

const getNativeGoogleClientId = (clientIds) => {
  if (Platform.OS === 'ios') {
    return clientIds.iosClientId || '';
  }
  if (Platform.OS === 'android') {
    return clientIds.androidClientId || '';
  }
  return clientIds.webClientId || '';
};

const getMissingGoogleEnvKey = () => {
  if (Platform.OS === 'android') {
    return 'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID';
  }
  if (Platform.OS === 'ios') {
    return 'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID';
  }
  return 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID';
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
      iconAlign="left"
      disabled={!request || busy}
      onPress={() => promptAsync()}
      style={styles.socialButton}
      icon={<GoogleMark />}
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
      iconAlign="left"
      disabled={!request || busy}
      onPress={() => promptAsync()}
      style={styles.socialButton}
      icon={<FacebookMark />}
    />
  );
};

export const SocialAuthSection = ({ onAuthenticated }) => {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.auth);
  const [socialBusy, setSocialBusy] = useState(false);
  const [activeProvider, setActiveProvider] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

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

  const reportError = (title, message) => {
    setErrorMessage(message);
    if (Platform.OS !== 'web') {
      Alert.alert(title, message);
    }
  };

  const submitFirebaseIdToken = async (idToken) => {
    setSocialBusy(true);
    setErrorMessage('');
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
        reportError('Sign In Failed', result.payload || 'Social login failed.');
      }
    } finally {
      setSocialBusy(false);
      setActiveProvider(null);
    }
  };

  const handleUnconfiguredPress = (providerName, requiredVar) => {
    reportError(
      `${providerName} Sign-In Not Configured`,
      `Set EXPO_PUBLIC_FIREBASE_* and ${requiredVar} in mobile/.env to enable ${providerName} sign-in.`
    );
  };

  const handleWebPopup = async (provider) => {
    setSocialBusy(true);
    setActiveProvider(provider);
    setErrorMessage('');
    try {
      const idToken =
        provider === 'google'
          ? await signInWithGoogleWebPopup()
          : await signInWithFacebookWebPopup();
      await submitFirebaseIdToken(idToken);
    } catch (err) {
      setSocialBusy(false);
      setActiveProvider(null);
      reportError('Sign In Failed', err.message || 'Unable to sign in.');
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
          Or continue with
        </AtelierText>
        <View style={styles.dividerLine} />
      </View>

      <AtelierErrorBanner
        message={errorMessage}
        style={styles.errorBanner}
      />

      <View style={styles.socialButtonsStack}>
        {nativeGoogleReady ? (
          <GoogleNativeAuthButton
            clientIds={authConfig.googleClientIds}
            busy={busy}
            onToken={submitFirebaseIdToken}
            onError={(msg) => reportError('Google Sign-In Failed', msg)}
          />
        ) : (
          <AtelierButton
            title="Continue with Google"
            variant="outline"
            iconAlign="left"
            loading={socialBusy && activeProvider === 'google'}
            disabled={busy}
            onPress={() =>
              webReady
                ? handleWebPopup('google')
                : handleUnconfiguredPress(
                  'Google',
                  getMissingGoogleEnvKey()
                )
            }
            style={styles.socialButton}
            icon={<GoogleMark />}
          />
        )}

        {nativeFacebookReady ? (
          <FacebookNativeAuthButton
            appId={authConfig.facebookAppId}
            busy={busy}
            onToken={submitFirebaseIdToken}
            onError={(msg) => reportError('Facebook Sign-In Failed', msg)}
          />
        ) : (
          <AtelierButton
            title="Continue with Facebook"
            variant="outline"
            iconAlign="left"
            loading={socialBusy && activeProvider === 'facebook'}
            disabled={busy}
            onPress={() =>
              webReady
                ? handleWebPopup('facebook')
                : handleUnconfiguredPress(
                  'Facebook',
                  'EXPO_PUBLIC_FACEBOOK_APP_ID'
                )
            }
            style={styles.socialButton}
            icon={<FacebookMark />}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 0,
    marginBottom: theme.spacing.lg,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerLabel: {
    marginHorizontal: theme.spacing.md,
  },
  socialButtonsStack: {
    gap: theme.spacing.md,
  },
  socialButton: {
    backgroundColor: '#FFFFFF',
    borderColor: theme.colors.borderMedium,
    paddingHorizontal: theme.spacing.lg,
  },
  socialBrandIcon: {
    width: 20,
    height: 20,
  },
  errorBanner: {
    marginHorizontal: 0,
    marginBottom: theme.spacing.md,
  },
});

export default SocialAuthSection;
