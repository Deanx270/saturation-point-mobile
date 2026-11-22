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
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import AtelierText from '../../components/common/AtelierText';
import AtelierInput from '../../components/common/AtelierInput';
import AtelierButton from '../../components/common/AtelierButton';
import AtelierHeader from '../../components/common/AtelierHeader';
import AtelierBrandMark from '../../components/common/AtelierBrandMark';
import AtelierPressable from '../../components/common/AtelierPressable';
import AtelierErrorBanner from '../../components/common/AtelierErrorBanner';
import AtelierCard from '../../components/common/AtelierCard';
import AtelierToast from '../../components/common/AtelierToast';
import SocialAuthSection from '../../components/auth/SocialAuthSection';
import { register, resendVerification } from '../../redux/authSlice';
import { registerForPushNotificationsAsync } from '../../services/pushNotificationService';
import { useRedirectIfAuthenticated } from '../../utils/authNavigation';
import {
  emailSchemaField,
  passwordSchemaField,
} from '../../utils/validationSchemas';
import { submitFormWithScroll } from '../../utils/formScroll';

const RegisterSchema = Yup.object().shape({
  email: emailSchemaField,
  password: passwordSchemaField,
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Please confirm your password'),
});

export const RegisterScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const scrollViewRef = useRef(null);
  const formTopRef = useRef(0);
  const fieldYRef = useRef({});
  const { loading } = useSelector((state) => state.auth);
  const [submitError, setSubmitError] = useState('');
  const [verificationPendingEmail, setVerificationPendingEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [toastState, setToastState] = useState({
    visible: false,
    message: '',
    key: 0,
  });

  const navigateToProfile = useRedirectIfAuthenticated(navigation);

  const showToast = (message) => {
    setToastState({
      visible: true,
      message,
      key: Date.now(),
    });
  };

  const handleResend = async () => {
    if (!verificationPendingEmail || resending) {
      return;
    }
    setResending(true);
    try {
      const result = await dispatch(
        resendVerification({ email: verificationPendingEmail })
      );
      if (resendVerification.fulfilled.match(result)) {
        showToast('Verification email resent. Please check your inbox.');
      } else {
        showToast(
          typeof result.payload === 'string'
            ? result.payload
            : result.payload?.message || 'Failed to resend confirmation email.'
        );
      }
    } finally {
      setResending(false);
    }
  };

  const handleRegisterSubmit = async (values, formikHelpers) => {
    setSubmitError('');
    const pushToken = await registerForPushNotificationsAsync();
    const result = await dispatch(
      register({
        email: values.email.trim(),
        password: values.password,
        pushToken,
      })
    );

    if (register.fulfilled.match(result)) {
      formikHelpers.resetForm();
      if (result.payload?.requiresVerification) {
        setVerificationPendingEmail(result.payload.email || values.email.trim());
        setSubmitError('');
        return;
      }
      const signedInUser = result.payload?.user;
      const requiresOnboarding = Boolean(
        signedInUser && !signedInUser.username && !signedInUser.profileCompleted
      );
      if (!requiresOnboarding) {
        navigateToProfile();
      }
    } else {
      const errorMsg =
        typeof result.payload === 'string'
          ? result.payload
          : result.payload?.message || 'Unable to create account.';
      setSubmitError(errorMsg);
      if (Platform.OS !== 'web') {
        Alert.alert('Registration Failed', errorMsg);
      }
    }
  };

  if (verificationPendingEmail) {
    return (
      <View style={styles.container}>
        <AtelierHeader
          title="Verify Email"
          leftType="back"
          navigation={navigation}
          onBackPress={() => setVerificationPendingEmail('')}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <AtelierCard style={styles.verificationCard}>
            <View style={styles.mailIconCircle}>
              <Ionicons
                name="mail-unread-outline"
                size={36}
                color={theme.colors.gold}
              />
            </View>

            <AtelierText
              variant="h3"
              style={styles.verificationTitle}
            >
              Check Your Inbox
            </AtelierText>

            <AtelierText
              variant="bodyMedium"
              color={theme.colors.inkMuted}
              style={styles.verificationBody}
            >
              We have dispatched a confirmation link to
            </AtelierText>

            <View style={styles.emailPill}>
              <AtelierText
                variant="bodyMedium"
                color={theme.colors.inkPrimary}
                style={styles.emailPillText}
              >
                {verificationPendingEmail}
              </AtelierText>
            </View>

            <AtelierText
              variant="caption"
              color={theme.colors.inkMuted}
              style={styles.verificationNote}
            >
              Please open the link within 24 hours to confirm your email and activate your account.
            </AtelierText>

            <AtelierButton
              title="Proceed to Sign In"
              onPress={() => {
                navigation.navigate('Login', { prefillEmail: verificationPendingEmail });
              }}
              style={styles.verificationActionBtn}
            />

            <AtelierButton
              title={resending ? 'Resending Link...' : 'Resend Confirmation Email'}
              variant="secondary"
              loading={resending}
              onPress={handleResend}
              style={styles.verificationActionBtn}
            />

            <AtelierPressable
              tone="subtle"
              hitSlop={8}
              onPress={() => setVerificationPendingEmail('')}
              style={styles.useDifferentEmailButton}
            >
              <AtelierText
                variant="button"
                color={theme.colors.goldText}
              >
                Use a different email
              </AtelierText>
            </AtelierPressable>
          </AtelierCard>
        </ScrollView>

        <AtelierToast
          visible={toastState.visible}
          toastKey={toastState.key}
          message={toastState.message}
          onDismiss={() => setToastState((prev) => ({ ...prev, visible: false }))}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AtelierHeader
        title="Create Account"
        leftType="back"
        navigation={navigation}
      />

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <AtelierBrandMark
          variant="auth"
          title="Create Your Account"
          subtitle="Create an account to save your details, track orders, and write product reviews."
        />

        <Formik
          initialValues={{
            email: '',
            password: '',
            confirmPassword: '',
          }}
          validationSchema={RegisterSchema}
          onSubmit={handleRegisterSubmit}
        >
          {({
            handleChange,
            handleBlur,
            handleSubmit,
            validateForm,
            setTouched,
            values,
            errors,
            touched,
          }) => (
            <View
              style={styles.formContainer}
              onLayout={(e) => {
                formTopRef.current = e.nativeEvent.layout.y;
              }}
            >
              <View
                onLayout={(e) => {
                  fieldYRef.current.email =
                    formTopRef.current + e.nativeEvent.layout.y;
                }}
              >
                <AtelierInput
                  label="Email"
                  placeholder="Enter your email address"
                  value={values.email}
                  onChangeText={handleChange('email')}
                  onBlur={handleBlur('email')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  error={errors.email}
                  touched={touched.email}
                />
              </View>

              <View
                onLayout={(e) => {
                  fieldYRef.current.password =
                    formTopRef.current + e.nativeEvent.layout.y;
                }}
              >
                <AtelierInput
                  label="Password"
                  placeholder="Enter your password"
                  helperText="Must be at least 6 characters"
                  value={values.password}
                  onChangeText={handleChange('password')}
                  onBlur={handleBlur('password')}
                  secureTextEntry
                  autoComplete="new-password"
                  textContentType="newPassword"
                  error={errors.password}
                  touched={touched.password}
                />
              </View>

              <View
                onLayout={(e) => {
                  fieldYRef.current.confirmPassword =
                    formTopRef.current + e.nativeEvent.layout.y;
                }}
              >
                <AtelierInput
                  label="Confirm Password"
                  placeholder="Re-enter your password"
                  value={values.confirmPassword}
                  onChangeText={handleChange('confirmPassword')}
                  onBlur={handleBlur('confirmPassword')}
                  secureTextEntry
                  autoComplete="new-password"
                  textContentType="newPassword"
                  error={errors.confirmPassword}
                  touched={touched.confirmPassword}
                />
              </View>

              <AtelierErrorBanner
                message={submitError}
                style={styles.errorBanner}
              />

              <AtelierButton
                title={loading ? 'Creating Account...' : 'Create Account'}
                onPress={() =>
                  submitFormWithScroll({
                    validateForm,
                    setTouched,
                    handleSubmit,
                    scrollViewRef,
                    yPositions: fieldYRef.current,
                    fieldOrder: ['email', 'password', 'confirmPassword'],
                  })
                }
                loading={loading}
                style={styles.submitButton}
              />

              <SocialAuthSection
                onAuthenticated={navigateToProfile}
              />

              <View style={styles.switchRow}>
                <AtelierText
                  variant="bodyMedium"
                  color={theme.colors.inkMuted}
                >
                  Already have an account?
                </AtelierText>
                <AtelierPressable
                  tone="subtle"
                  hitSlop={8}
                  onPress={() => navigation.navigate('Login')}
                  style={styles.switchLink}
                >
                  <AtelierText
                    variant="button"
                    color={theme.colors.goldText}
                  >
                    Sign In
                  </AtelierText>
                </AtelierPressable>
              </View>
            </View>
          )}
        </Formik>
      </ScrollView>

      <AtelierToast
        visible={toastState.visible}
        toastKey={toastState.key}
        message={toastState.message}
        onDismiss={() => setToastState((prev) => ({ ...prev, visible: false }))}
      />
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
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  formContainer: {
    marginTop: theme.spacing.xs,
  },
  submitButton: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  errorBanner: {
    marginHorizontal: 0,
    marginBottom: theme.spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchLink: {
    marginLeft: theme.spacing.xs,
    padding: theme.spacing.xs,
  },
  verificationCard: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  mailIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.goldBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  verificationTitle: {
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  verificationBody: {
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  emailPill: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  emailPillText: {
    textAlign: 'center',
    fontWeight: '600',
  },
  verificationNote: {
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.sm,
  },
  verificationActionBtn: {
    width: '100%',
    marginBottom: theme.spacing.sm,
  },
  useDifferentEmailButton: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.xs,
  },
});

export default RegisterScreen;