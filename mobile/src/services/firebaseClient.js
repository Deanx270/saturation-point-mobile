import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithCredential,
  signInWithPopup,
} from 'firebase/auth';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

export const isFirebaseConfigured = () =>
  Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId
  );

export const getSocialAuthConfig = () => ({
  googleConfigured: Boolean(
    isFirebaseConfigured() &&
      (Platform.OS === 'web' ||
        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
        process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
        process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID)
  ),
  facebookConfigured: Boolean(
    isFirebaseConfigured() &&
      (Platform.OS === 'web' || process.env.EXPO_PUBLIC_FACEBOOK_APP_ID)
  ),
  googleClientIds: {
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  },
  facebookAppId: process.env.EXPO_PUBLIC_FACEBOOK_APP_ID,
});

const getFirebaseAuth = () => {
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase configuration is missing. Add EXPO_PUBLIC_FIREBASE_* keys to mobile/.env.'
    );
  }
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  return getAuth(app);
};

export const signInWithGoogleWebPopup = async () => {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user.getIdToken();
};

export const signInWithFacebookWebPopup = async () => {
  const auth = getFirebaseAuth();
  const provider = new FacebookAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user.getIdToken();
};

export const exchangeGoogleIdTokenForFirebaseIdToken = async (googleIdToken) => {
  const auth = getFirebaseAuth();
  const credential = GoogleAuthProvider.credential(googleIdToken);
  const result = await signInWithCredential(auth, credential);
  return result.user.getIdToken();
};

export const exchangeFacebookTokenForFirebaseIdToken = async (facebookAccessToken) => {
  const auth = getFirebaseAuth();
  const credential = FacebookAuthProvider.credential(facebookAccessToken);
  const result = await signInWithCredential(auth, credential);
  return result.user.getIdToken();
};
