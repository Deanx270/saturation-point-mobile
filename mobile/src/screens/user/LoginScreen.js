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
import { login } from '../../redux/authSlice';
import { registerForPushNotificationsAsync } from '../../services/pushNotificationService';
import {
  emailSchemaField,
  passwordSchemaField,
} from '../../utils/validationSchemas';

const LoginSchema = Yup.object().shape({
  email: emailSchemaField,
  password: passwordSchemaField,
});

export const LoginScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.auth);

  const handleLoginSubmit = async (values) => {
    const pushToken = await registerForPushNotificationsAsync();
    const result = await dispatch(
      login({
        email: values.email.trim(),
        password: values.password,
        pushToken,
      })
    );

    if (login.fulfilled.match(result)) {
      navigation.navigate('Profile');
    } else {
      Alert.alert('Sign In Failed', result.payload || 'Invalid email or password.');
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
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <AtelierBrandMark
          variant="auth"
          title="Welcome Back"
          subtitle="Sign in to view your orders, save items, and manage your account."
        />

        <Formik
          initialValues={{ email: '', password: '' }}
          validationSchema={LoginSchema}
          onSubmit={handleLoginSubmit}
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
                label="Email"
                placeholder="name@example.com"
                value={values.email}
                onChangeText={handleChange('email')}
                onBlur={handleBlur('email')}
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
                touched={touched.email}
                style={styles.compactInput}
              />

              <AtelierInput
                label="Password"
                placeholder="Enter your password"
                value={values.password}
                onChangeText={handleChange('password')}
                onBlur={handleBlur('password')}
                secureTextEntry
                error={errors.password}
                touched={touched.password}
                style={styles.compactInput}
              />

              <AtelierButton
                title={loading ? 'Signing In...' : 'Sign In'}
                onPress={handleSubmit}
                loading={loading}
                style={styles.submitButton}
              />

              <SocialAuthSection
                onAuthenticated={() => navigation.navigate('Profile')}
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

export default LoginScreen;
