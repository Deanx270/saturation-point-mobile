import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { theme } from '../../theme';
import apiClient from '../../api/client';
import AtelierText from '../../components/common/AtelierText';
import AtelierInput from '../../components/common/AtelierInput';
import AtelierButton from '../../components/common/AtelierButton';
import AtelierHeader from '../../components/common/AtelierHeader';
import AtelierBrandMark from '../../components/common/AtelierBrandMark';
import AtelierPressable from '../../components/common/AtelierPressable';
import AtelierErrorBanner from '../../components/common/AtelierErrorBanner';
import { updateProfile, requestSignOut } from '../../redux/authSlice';
import {
  USERNAME_REGEX,
  displayNameSchemaField,
  usernameSchemaField,
} from '../../utils/validationSchemas';

const CompleteProfileSchema = Yup.object().shape({
  displayName: displayNameSchemaField,
  username: usernameSchemaField,
});

const buildSuggestedUsername = (email) => {
  const local = String(email || '').split('@')[0] || '';
  const sanitized = local
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (sanitized.length >= 3) {
    return sanitized.slice(0, 24);
  }
  return '';
};

export const CompleteProfileScreen = () => {
  const dispatch = useDispatch();
  const { user, loading } = useSelector((state) => state.auth);
  const suggestedUsername = buildSuggestedUsername(user?.email);
  const [availabilityState, setAvailabilityState] = useState({
    status: 'idle',
    message: '',
  });
  const [skipping, setSkipping] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const checkTimerRef = useRef(null);
  const latestQueryRef = useRef('');

  const runUsernameCheck = (rawUsername) => {
    if (checkTimerRef.current) {
      clearTimeout(checkTimerRef.current);
    }
    const normalized = String(rawUsername || '')
      .trim()
      .replace(/^@/, '')
      .toLowerCase();

    if (!normalized || !USERNAME_REGEX.test(normalized)) {
      latestQueryRef.current = '';
      setAvailabilityState({ status: 'idle', message: '' });
      return;
    }

    latestQueryRef.current = normalized;
    setAvailabilityState({
      status: 'checking',
      message: 'Checking availability...',
    });

    checkTimerRef.current = setTimeout(async () => {
      try {
        const res = await apiClient.get('/users/check-username', {
          params: { username: normalized },
        });
        if (latestQueryRef.current !== normalized) {
          return;
        }
        if (res.data?.available) {
          setAvailabilityState({
            status: 'available',
            message: `@${normalized} is available`,
          });
        } else {
          setAvailabilityState({
            status: 'taken',
            message: 'That username is already taken',
          });
        }
      } catch (e) {
        if (latestQueryRef.current === normalized) {
          setAvailabilityState({ status: 'idle', message: '' });
        }
      }
    }, 350);
  };

  useEffect(() => {
    if (suggestedUsername) {
      runUsernameCheck(suggestedUsername);
    }
    return () => {
      if (checkTimerRef.current) {
        clearTimeout(checkTimerRef.current);
      }
    };
  }, [suggestedUsername]);

  const reportError = (title, message) => {
    setSubmitError(message);
    if (Platform.OS !== 'web') {
      Alert.alert(title, message);
    }
  };

  const handleCompleteSubmit = async (values) => {
    setSubmitError('');
    if (availabilityState.status === 'taken') {
      reportError('Username Taken', 'Please choose another username.');
      return;
    }
    const cleanUsername = values.username
      .trim()
      .replace(/^@/, '')
      .toLowerCase();
    const result = await dispatch(
      updateProfile({
        displayName: values.displayName.trim(),
        username: cleanUsername,
      })
    );
    if (!updateProfile.fulfilled.match(result)) {
      reportError(
        'Unable to Save',
        result.payload || 'Could not complete your profile. Please try again.'
      );
    }
  };

  const handleSkipOnboarding = async () => {
    if (skipping || loading) {
      return;
    }
    setSubmitError('');
    setSkipping(true);
    try {
      const result = await dispatch(updateProfile({ skipOnboarding: true }));
      if (!updateProfile.fulfilled.match(result)) {
        reportError(
          'Unable to Continue',
          result.payload || 'Please try again.'
        );
      }
    } finally {
      setSkipping(false);
    }
  };

  return (
    <View style={styles.container}>
      <AtelierHeader
        title="Profile Setup"
        leftType="none"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <AtelierBrandMark
          variant="auth"
          title="Complete Your Profile"
          subtitle="Add your display name and choose a @username so you can sign in with either email or username."
        />

        <Formik
          initialValues={{
            displayName: user?.displayName || '',
            username: suggestedUsername,
          }}
          validationSchema={CompleteProfileSchema}
          onSubmit={handleCompleteSubmit}
        >
          {({
            handleChange,
            handleBlur,
            handleSubmit,
            setFieldValue,
            values,
            errors,
            touched,
          }) => {
            const usernameHelper =
              availabilityState.status === 'available' ||
              availabilityState.status === 'checking'
                ? availabilityState.message
                : 'Letters, numbers, and underscores only (3–30 characters)';
            const usernameError =
              errors.username ||
              (availabilityState.status === 'taken'
                ? availabilityState.message
                : undefined);

            return (
              <View style={styles.formContainer}>
                <AtelierInput
                  label="Display Name"
                  placeholder="Enter your display name"
                  value={values.displayName}
                  onChangeText={handleChange('displayName')}
                  onBlur={handleBlur('displayName')}
                  autoCapitalize="words"
                  autoComplete="name"
                  textContentType="name"
                  error={errors.displayName}
                  touched={touched.displayName}
                />

                <AtelierInput
                  label="Username"
                  prefix="@"
                  placeholder="e.g. alex_santos"
                  helperText={usernameHelper}
                  value={values.username}
                  onChangeText={(text) => {
                    const sanitized = text.replace(/^@/, '').replace(/\s+/g, '');
                    setFieldValue('username', sanitized);
                    runUsernameCheck(sanitized);
                  }}
                  onBlur={handleBlur('username')}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                  textContentType="username"
                  error={usernameError}
                  touched={touched.username || availabilityState.status === 'taken'}
                />

                <AtelierErrorBanner
                  message={submitError}
                  style={styles.errorBanner}
                />

                <AtelierButton
                  title={loading && !skipping ? 'Saving...' : 'Continue'}
                  onPress={handleSubmit}
                  loading={loading && !skipping}
                  disabled={
                    skipping ||
                    availabilityState.status === 'checking' ||
                    availabilityState.status === 'taken'
                  }
                  style={styles.continueButton}
                />

                <AtelierButton
                  title={skipping ? 'Continuing...' : 'Skip for Now'}
                  variant="outline"
                  loading={skipping}
                  disabled={loading && !skipping}
                  onPress={handleSkipOnboarding}
                />

                <AtelierPressable
                  tone="subtle"
                  hitSlop={8}
                  disabled={loading || skipping}
                  onPress={() => dispatch(requestSignOut())}
                  style={styles.signOutLink}
                >
                  <AtelierText
                    variant="caption"
                    color={theme.colors.inkMuted}
                  >
                    Sign Out
                  </AtelierText>
                </AtelierPressable>
              </View>
            );
          }}
        </Formik>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.hero,
  },
  formContainer: {
    marginTop: theme.spacing.sm,
  },
  continueButton: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  errorBanner: {
    marginHorizontal: 0,
    marginBottom: theme.spacing.md,
  },
  signOutLink: {
    alignSelf: 'center',
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
});

export default CompleteProfileScreen;
