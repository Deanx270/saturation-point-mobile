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
import SocialAuthSection from '../../components/auth/SocialAuthSection';
import { login } from '../../redux/authSlice';
import { registerForPushNotificationsAsync } from '../../services/pushNotificationService';
import { useRedirectIfAuthenticated } from '../../utils/authNavigation';
import {
  identifierSchemaField,
  loginPasswordSchemaField,
} from '../../utils/validationSchemas';
import { submitFormWithScroll } from '../../utils/formScroll';

const LoginSchema = Yup.object().shape({
  identifier: identifierSchemaField,
  password: loginPasswordSchemaField,
});

export const LoginScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const scrollViewRef = useRef(null);
  const formTopRef = useRef(0);
  const fieldYRef = useRef({});
  const { loading } = useSelector((state) => state.auth);
  const [submitError, setSubmitError] = useState('');

  const navigateToProfile = useRedirectIfAuthenticated(navigation);

  const handleLoginSubmit = async (values, formikHelpers) => {
    setSubmitError('');
    const cleanIdentifier = values.identifier.trim();
    const pushToken = await registerForPushNotificationsAsync();
    const result = await dispatch(
      login({
        identifier: cleanIdentifier,
        email: cleanIdentifier,
        password: values.password,
        pushToken,
      })
    );

    if (login.fulfilled.match(result)) {
      formikHelpers.resetForm();
      const signedInUser = result.payload?.user;
      const requiresOnboarding = Boolean(
        signedInUser && !signedInUser.username && !signedInUser.profileCompleted
      );
      if (!requiresOnboarding) {
        navigateToProfile();
      }
    } else {
      const errorMsg = result.payload || 'Invalid email or password.';
      setSubmitError(errorMsg);
      if (Platform.OS !== 'web') {
        Alert.alert('Sign In Failed', errorMsg);
      }
    }
  };

  return (
    <View style={styles.container}>
      <AtelierHeader
        title="Sign In"
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
          title="Welcome Back"
          subtitle="Sign in to view your orders, save items, and manage your account."
        />

        <Formik
          initialValues={{ identifier: '', password: '' }}
          validationSchema={LoginSchema}
          onSubmit={handleLoginSubmit}
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
                  fieldYRef.current.identifier =
                    formTopRef.current + e.nativeEvent.layout.y;
                }}
              >
                <AtelierInput
                  label="Email or Username"
                  placeholder="Enter your email or username"
                  value={values.identifier}
                  onChangeText={handleChange('identifier')}
                  onBlur={handleBlur('identifier')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                  textContentType="username"
                  importantForAutofill="yes"
                  error={errors.identifier}
                  touched={touched.identifier}
                  style={styles.compactInput}
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
                  value={values.password}
                  onChangeText={handleChange('password')}
                  onBlur={handleBlur('password')}
                  secureTextEntry
                  autoComplete="current-password"
                  textContentType="password"
                  importantForAutofill="yes"
                  error={errors.password}
                  touched={touched.password}
                  style={styles.compactInput}
                />
              </View>

              <AtelierErrorBanner
                message={submitError}
                style={styles.errorBanner}
              />

              <AtelierButton
                title={loading ? 'Signing In...' : 'Sign In'}
                onPress={() =>
                  submitFormWithScroll({
                    validateForm,
                    setTouched,
                    handleSubmit,
                    scrollViewRef,
                    yPositions: fieldYRef.current,
                    fieldOrder: ['identifier', 'password'],
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
                  New customer?
                </AtelierText>
                <AtelierPressable
                  tone="subtle"
                  hitSlop={8}
                  onPress={() => navigation.navigate('Register')}
                  style={styles.switchLink}
                >
                  <AtelierText
                    variant="button"
                    color={theme.colors.goldText}
                  >
                    Create Account
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
  formContainer: {
    marginTop: theme.spacing.xs,
  },
  compactInput: {
    marginBottom: theme.spacing.md,
  },
  submitButton: {
    marginTop: 0,
    marginBottom: theme.spacing.lg,
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

export default LoginScreen;
