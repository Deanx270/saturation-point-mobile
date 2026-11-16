import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
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
import SocialAuthSection from '../../components/auth/SocialAuthSection';
import { register } from '../../redux/authSlice';
import { registerForPushNotificationsAsync } from '../../services/pushNotificationService';
import {
  emailSchemaField,
  passwordSchemaField,
} from '../../utils/validationSchemas';

const RegisterSchema = Yup.object().shape({
  displayName: Yup.string().trim().required('Full name is required'),
  email: emailSchemaField,
  password: passwordSchemaField,
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Please confirm your password'),
});

export const RegisterScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.auth);

  const handleRegisterSubmit = async (values, formikHelpers) => {
    const pushToken = await registerForPushNotificationsAsync();
    const result = await dispatch(
      register({
        displayName: values.displayName.trim(),
        email: values.email.trim(),
        password: values.password,
        pushToken,
      })
    );

    if (register.fulfilled.match(result)) {
      formikHelpers.resetForm();
      if (navigation.canGoBack()) {
        navigation.popToTop();
      } else {
        navigation.navigate('Profile');
      }
    } else {
      Alert.alert('Registration Failed', result.payload || 'Unable to create account.');
    }
  };

  return (
    <View style={styles.container}>
      <AtelierHeader
        title="Create Account"
        leftType="back"
        navigation={navigation}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <AtelierBrandMark
          variant="auth"
          title="Create Your Account"
          subtitle="Create an account to save your details, track orders, and write product reviews."
        />

        <Formik
          initialValues={{
            displayName: '',
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
            values,
            errors,
            touched,
          }) => (
            <View style={styles.formContainer}>
              <AtelierInput
                label="Full Name"
                placeholder="Enter your full name"
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

              <AtelierButton
                title={loading ? 'Creating Account...' : 'Create Account'}
                onPress={handleSubmit}
                loading={loading}
                style={styles.submitButton}
              />

              <SocialAuthSection
                onAuthenticated={() =>
                  navigation.canGoBack()
                    ? navigation.popToTop()
                    : navigation.navigate('Profile')
                }
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
  formContainer: {
    marginTop: theme.spacing.xs,
  },
  submitButton: {
    marginTop: theme.spacing.xs,
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
