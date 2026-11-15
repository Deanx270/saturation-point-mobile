import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import AtelierText from '../../components/common/AtelierText';
import AtelierInput from '../../components/common/AtelierInput';
import AtelierButton from '../../components/common/AtelierButton';
import { register } from '../../redux/authSlice';
import { registerForPushNotificationsAsync } from '../../services/pushNotificationService';

const RegisterSchema = Yup.object().shape({
  displayName: Yup.string().required('Full name is required'),
  email: Yup.string().email('Invalid email address').required('Email is required'),
  password: Yup.string().min(6, 'Minimum 6 characters').required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Please confirm your password'),
});

export const RegisterScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.auth);

  const handleRegisterSubmit = async (values) => {
    const pushToken = await registerForPushNotificationsAsync();
    const result = await dispatch(
      register({
        displayName: values.displayName,
        email: values.email,
        password: values.password,
        pushToken,
      })
    );

    if (register.fulfilled.match(result)) {
      navigation.navigate('Profile');
    } else {
      Alert.alert('Registration Failed', result.payload || 'Unable to create account.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.colors.inkPrimary}
          />
        </TouchableOpacity>
        <AtelierText
          variant="title1"
          style={styles.headerTitle}
        >
          Create Account
        </AtelierText>
        <View style={styles.headerIconButton} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.bannerSection}>
          <AtelierText
            variant="caption"
            color={theme.colors.goldText}
            style={styles.brandLabel}
          >
            THE SATURATION POINT
          </AtelierText>
          <AtelierText
            variant="display"
            style={styles.welcomeHeading}
          >
            Create Your Account
          </AtelierText>
          <AtelierText
            variant="bodyLarge"
            color={theme.colors.inkSecondary}
            style={styles.welcomeSub}
          >
            Create an account to save your details, track orders, and write product reviews.
          </AtelierText>
        </View>

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
                placeholder="e.g. Alex Santos"
                value={values.displayName}
                onChangeText={handleChange('displayName')}
                onBlur={handleBlur('displayName')}
                error={errors.displayName}
                touched={touched.displayName}
              />

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
              />

              <AtelierInput
                label="Password"
                placeholder="Minimum 6 characters"
                value={values.password}
                onChangeText={handleChange('password')}
                onBlur={handleBlur('password')}
                secureTextEntry
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
                error={errors.confirmPassword}
                touched={touched.confirmPassword}
              />

              <AtelierButton
                title={loading ? 'Creating Account...' : 'Create Account'}
                onPress={handleSubmit}
                loading={loading}
                style={styles.submitButton}
              />

              <View style={styles.switchRow}>
                <AtelierText
                  variant="bodyMedium"
                  color={theme.colors.inkMuted}
                >
                  Already have an account?
                </AtelierText>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Login')}
                  style={styles.switchLink}
                >
                  <AtelierText
                    variant="button"
                    color={theme.colors.goldText}
                  >
                    Sign In
                  </AtelierText>
                </TouchableOpacity>
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
  header: {
    paddingTop: theme.spacing.hero + 16,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.canvas,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerIconButton: {
    width: theme.touchTarget.minWidth,
    height: theme.touchTarget.minHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    textAlign: 'center',
  },
  scrollContent: {
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.hero,
  },
  bannerSection: {
    marginVertical: theme.spacing.lg,
  },
  brandLabel: {
    letterSpacing: 1.5,
    marginBottom: theme.spacing.xs,
  },
  welcomeHeading: {
    marginBottom: theme.spacing.sm,
  },
  welcomeSub: {
    lineHeight: 22,
  },
  formContainer: {
    marginTop: theme.spacing.md,
  },
  submitButton: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xl,
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
