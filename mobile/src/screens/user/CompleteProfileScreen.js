import React, { useState, useRef } from 'react';
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
import AtelierText from '../../components/common/AtelierText';
import AtelierInput from '../../components/common/AtelierInput';
import AtelierButton from '../../components/common/AtelierButton';
import AtelierHeader from '../../components/common/AtelierHeader';
import AtelierBrandMark from '../../components/common/AtelierBrandMark';
import AtelierPressable from '../../components/common/AtelierPressable';
import AtelierErrorBanner from '../../components/common/AtelierErrorBanner';
import { updateProfile, requestSignOut } from '../../redux/authSlice';
import {
  displayNameSchemaField,
  usernameSchemaField,
} from '../../utils/validationSchemas';
import {
  buildSuggestedUsername,
  getUsernameFeedback,
  sanitizeUsernameInput,
  useUsernameAvailability,
} from '../../utils/useUsernameAvailability';
import { submitFormWithScroll } from '../../utils/formScroll';

const CompleteProfileSchema = Yup.object().shape({
  displayName: displayNameSchemaField,
  username: usernameSchemaField,
});

export const CompleteProfileScreen = () => {
  const dispatch = useDispatch();
  const scrollViewRef = useRef(null);
  const formTopRef = useRef(0);
  const fieldYRef = useRef({});
  const { user, loading } = useSelector((state) => state.auth);
  const suggestedUsername = buildSuggestedUsername(user?.email);
  const { availabilityState, runUsernameCheck } = useUsernameAvailability(suggestedUsername);
  const [skipping, setSkipping] = useState(false);
  const [submitError, setSubmitError] = useState('');

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
        ref={scrollViewRef}
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
            validateForm,
            setTouched,
            values,
            errors,
            touched,
          }) => {
            const usernameFeedback = getUsernameFeedback(
              errors.username,
              availabilityState
            );

            return (
              <View
                style={styles.formContainer}
                onLayout={(e) => {
                  formTopRef.current = e.nativeEvent.layout.y;
                }}
              >
                <View
                  onLayout={(e) => {
                    fieldYRef.current.displayName =
                      formTopRef.current + e.nativeEvent.layout.y;
                  }}
                >
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
                </View>

                <View
                  onLayout={(e) => {
                    fieldYRef.current.username =
                      formTopRef.current + e.nativeEvent.layout.y;
                  }}
                >
                  <AtelierInput
                    label="Username"
                    prefix="@"
                    placeholder="e.g. alex_santos"
                    helperText={usernameFeedback.helperText}
                    value={values.username}
                    onChangeText={(text) => {
                      const sanitized = sanitizeUsernameInput(text);
                      setFieldValue('username', sanitized);
                      runUsernameCheck(sanitized);
                    }}
                    onBlur={handleBlur('username')}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="username"
                    textContentType="username"
                    error={usernameFeedback.error}
                    touched={touched.username || usernameFeedback.isTaken}
                  />
                </View>

                <AtelierErrorBanner
                  message={submitError}
                  style={styles.errorBanner}
                />

                <AtelierButton
                  title={loading && !skipping ? 'Saving...' : 'Continue'}
                  onPress={() =>
                    submitFormWithScroll({
                      validateForm,
                      setTouched,
                      handleSubmit,
                      scrollViewRef,
                      yPositions: fieldYRef.current,
                      fieldOrder: ['displayName', 'username'],
                    })
                  }
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
