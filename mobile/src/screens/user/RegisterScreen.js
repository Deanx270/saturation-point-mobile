import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  BackHandler,
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
import SocialAuthSection from '../../components/auth/SocialAuthSection';
import EmailVerificationNotice from '../../components/auth/EmailVerificationNotice';
import { register } from '../../redux/authSlice';
import { useRedirectIfAuthenticated } from '../../utils/authNavigation';
import { useVerificationResend } from '../../utils/useVerificationResend';
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
  const [draftEmail, setDraftEmail] = useState('');
  const [pendingVerification, setPendingVerification] = useState(null);
  const [unverifiedExisting, setUnverifiedExisting] = useState(null);

  const navigateToProfile = useRedirectIfAuthenticated(navigation);
  const activeVerificationEmail =
    pendingVerification?.email || unverifiedExisting?.email || '';
  const { resending, cooldownSeconds, handleResend } =
    useVerificationResend(activeVerificationEmail);

  useEffect(() => {
    if (!pendingVerification || Platform.OS === 'web') {
      return undefined;
    }
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        setPendingVerification(null);
        return true;
      }
    );
    return () => subscription.remove();
  }, [pendingVerification]);

  const handleRegisterSubmit = async (values, formikHelpers) => {
    const cleanEmail = values.email.trim();
    setSubmitError('');
    setUnverifiedExisting(null);

    const result = await dispatch(
      register({
        email: cleanEmail,
        password: values.password,
      })
    );

    if (register.fulfilled.match(result)) {
      const targetEmail = result.payload?.email || cleanEmail;
      formikHelpers.resetForm();
      if (result.payload?.requiresVerification) {
        const emailSent = result.payload.emailSent !== false;
        setDraftEmail(targetEmail);
        setPendingVerification({
          email: targetEmail,
          emailSent,
        });
        return;
      }
      const signedInUser = result.payload?.user;
      const requiresOnboarding = Boolean(
        signedInUser && !signedInUser.username && !signedInUser.profileCompleted
      );
      if (!requiresOnboarding) {
        navigateToProfile();
      }
    } else if (
      result.payload &&
      typeof result.payload === 'object' &&
      result.payload.isEmailVerified === false
    ) {
      setUnverifiedExisting({
        email: result.payload.email || cleanEmail,
        message: 'This email is already registered, but not yet confirmed.',
      });
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

  if (pendingVerification) {
    return (
      <View style={styles.container}>
        <AtelierHeader
          title="Verify Email"
          leftType="back"
          navigation={navigation}
          onLeftPress={() => setPendingVerification(null)}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.verificationScrollContent}
        >
          <EmailVerificationNotice
            mode="screen"
            email={pendingVerification.email}
            emailSent={pendingVerification.emailSent}
            resending={resending}
            cooldownSeconds={cooldownSeconds}
            onResend={() => handleResend(pendingVerification.email)}
            onProceedToSignIn={() =>
              navigation.navigate('Login', {
                prefillEmail: pendingVerification.email,
              })
            }
            onEditEmail={() => setPendingVerification(null)}
          />
        </ScrollView>
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
            email: draftEmail,
            password: '',
            confirmPassword: '',
          }}
          enableReinitialize
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

              {unverifiedExisting ? (
                <EmailVerificationNotice
                  mode="inline"
                  message={unverifiedExisting.message}
                  resending={resending}
                  cooldownSeconds={cooldownSeconds}
                  onResend={() => handleResend(unverifiedExisting.email)}
                  onProceedToSignIn={() =>
                    navigation.navigate('Login', {
                      prefillEmail: unverifiedExisting.email,
                    })
                  }
                  style={styles.errorBanner}
                />
              ) : (
                <AtelierErrorBanner
                  message={submitError}
                  style={styles.errorBanner}
                />
              )}

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
  verificationScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.section,
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
});

export default RegisterScreen;
