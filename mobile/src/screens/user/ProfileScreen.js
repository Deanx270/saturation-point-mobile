import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { theme } from '../../theme';
import AtelierText from '../../components/common/AtelierText';
import AtelierInput from '../../components/common/AtelierInput';
import AtelierButton from '../../components/common/AtelierButton';
import AtelierCard from '../../components/common/AtelierCard';
import AtelierBottomSheet from '../../components/common/AtelierBottomSheet';
import AtelierHeader from '../../components/common/AtelierHeader';
import AtelierEmptyState from '../../components/common/AtelierEmptyState';
import AtelierPressable from '../../components/common/AtelierPressable';
import AtelierToast from '../../components/common/AtelierToast';
import AtelierErrorBanner from '../../components/common/AtelierErrorBanner';
import AtelierAvatar from '../../components/common/AtelierAvatar';
import { updateProfile, requestSignOut, syncPushToken } from '../../redux/authSlice';
import { getNotificationPermissionGranted } from '../../services/pushNotificationService';
import { runAfterFrame } from '../../utils/afterFrame';
import { appendImageToFormData } from '../../utils/formDataHelper';
import {
  pickImagesFromGallery,
  captureImageWithCamera,
} from '../../utils/imagePickerHelper';
import {
  displayNameSchemaField,
  passwordSchemaField,
  usernameSchemaField,
} from '../../utils/validationSchemas';
import {
  buildSuggestedUsername,
  getUsernameFeedback,
  sanitizeUsernameInput,
  useUsernameAvailability,
} from '../../utils/useUsernameAvailability';
import { submitFormWithScroll } from '../../utils/formScroll';

const ProfileSchema = Yup.object().shape({
  displayName: displayNameSchemaField,
});

const SetUsernameSchema = Yup.object().shape({
  username: usernameSchemaField,
});

const buildPasswordSchema = (requiresCurrentPassword) =>
  Yup.object().shape({
    ...(requiresCurrentPassword
      ? {
          currentPassword: Yup.string().required('Current password is required'),
        }
      : {}),
    newPassword: passwordSchemaField.test(
      'different-from-current',
      'New password must be different from your current password',
      function validateDifferent(value) {
        const current = this.parent.currentPassword;
        return !requiresCurrentPassword || !current || !value || value !== current;
      }
    ),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('newPassword')], 'Passwords do not match')
      .required('Please confirm your new password'),
  });

export const ProfileScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { height: windowHeight } = useWindowDimensions();
  const scrollViewRef = useRef(null);
  const editSectionTopRef = useRef(0);
  const { user } = useSelector((state) => state.auth);
  const hasExistingPassword = user?.hasPassword !== false;
  const passwordSchema = useMemo(
    () => buildPasswordSchema(hasExistingPassword),
    [hasExistingPassword]
  );
  const [avatarUri, setAvatarUri] = useState(user?.photoURL || null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [syncingPush, setSyncingPush] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [avatarSheetVisible, setAvatarSheetVisible] = useState(false);
  const [usernameSheetVisible, setUsernameSheetVisible] = useState(false);
  const [passwordSheetVisible, setPasswordSheetVisible] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [usernameErrorMsg, setUsernameErrorMsg] = useState('');
  const [passwordErrorMsg, setPasswordErrorMsg] = useState('');
  const [toastState, setToastState] = useState({
    visible: false,
    message: '',
    key: 0,
  });
  const suggestedUsername = buildSuggestedUsername(user?.email);
  const {
    availabilityState,
    runUsernameCheck,
    resetAvailability,
  } = useUsernameAvailability(usernameSheetVisible ? suggestedUsername : '');

  const refreshPushPermission = useCallback(async () => {
    const granted = await getNotificationPermissionGranted();
    setPushEnabled(granted);
  }, []);

  useEffect(() => {
    setAvatarUri(user?.photoURL || null);
  }, [user?.photoURL]);

  useFocusEffect(
    useCallback(() => {
      return runAfterFrame(() => {
        refreshPushPermission();
      });
    }, [refreshPushPermission, user])
  );

  if (!user) {
    return (
      <View style={styles.container}>
        <AtelierHeader
          title="Profile"
          leftType="drawer"
          navigation={navigation}
        />

        <AtelierEmptyState
          iconName="person-outline"
          iconShape="circle"
          title="Guest"
          description="Sign in to view your orders, save your details, and manage your account."
          actionTitle="Sign In"
          actionVariant="primary"
          fullWidthActions
          onActionPress={() => navigation.navigate('Login')}
          secondaryActionTitle="Create Account"
          onSecondaryActionPress={() => navigation.navigate('Register')}
        />
      </View>
    );
  }

  const uploadSelectedAvatar = async (uri) => {
    if (uploadingPhoto) {
      return;
    }
    setAvatarUri(uri);
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      await appendImageToFormData(formData, 'photo', uri, 0, 'avatar');
      const result = await dispatch(updateProfile(formData));
      if (updateProfile.fulfilled.match(result)) {
        setToastState((prev) => ({
          visible: true,
          message: 'Profile photo updated',
          key: prev.key + 1,
        }));
      } else {
        setAvatarUri(user?.photoURL || null);
        Alert.alert('Upload Failed', result.payload || 'Unable to upload photo.');
      }
    } catch (error) {
      setAvatarUri(user?.photoURL || null);
      Alert.alert('Upload Failed', error.message || 'Unable to upload photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePickFromGallery = async () => {
    const selected = await pickImagesFromGallery({
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (selected.length > 0) {
      await uploadSelectedAvatar(selected[0]);
    }
  };

  const handleCaptureCamera = async () => {
    const captured = await captureImageWithCamera({
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (captured) {
      await uploadSelectedAvatar(captured);
    }
  };

  const showAvatarPickerOptions = () => {
    setAvatarSheetVisible(true);
  };

  const handleProfileSubmit = async (values) => {
    if (savingProfile) {
      return;
    }
    setProfileError('');
    setSavingProfile(true);
    try {
      const result = await dispatch(
        updateProfile({
          displayName: values.displayName.trim(),
        })
      );
      if (updateProfile.fulfilled.match(result)) {
        setToastState((prev) => ({
          visible: true,
          message: 'Profile details updated',
          key: prev.key + 1,
        }));
      } else {
        const errorMsg = result.payload || 'Unable to update profile.';
        setProfileError(errorMsg);
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const handleOpenUsernameSheet = () => {
    setUsernameErrorMsg('');
    setUsernameSheetVisible(true);
  };

  const handleCloseUsernameSheet = () => {
    if (savingUsername) {
      return;
    }
    setUsernameSheetVisible(false);
    setUsernameErrorMsg('');
    resetAvailability();
  };

  const handleSetUsernameSubmit = async (values) => {
    if (savingUsername) {
      return;
    }
    setUsernameErrorMsg('');
    if (availabilityState.status === 'taken') {
      setUsernameErrorMsg('That username is already taken.');
      return;
    }
    setSavingUsername(true);
    try {
      const cleanUsername = values.username.trim().replace(/^@/, '').toLowerCase();
      const result = await dispatch(
        updateProfile({
          username: cleanUsername,
        })
      );
      if (updateProfile.fulfilled.match(result)) {
        setUsernameSheetVisible(false);
        resetAvailability();
        setToastState((prev) => ({
          visible: true,
          message: 'Username saved',
          key: prev.key + 1,
        }));
      } else {
        const errorMsg = result.payload || 'Unable to save username.';
        setUsernameErrorMsg(errorMsg);
      }
    } finally {
      setSavingUsername(false);
    }
  };

  const handleOpenPasswordSheet = () => {
    setPasswordErrorMsg('');
    setPasswordSheetVisible(true);
  };

  const handleClosePasswordSheet = () => {
    if (savingPassword) {
      return;
    }
    setPasswordSheetVisible(false);
    setPasswordErrorMsg('');
  };

  const handlePasswordSubmit = async (values, { resetForm }) => {
    if (savingPassword) {
      return;
    }
    setPasswordErrorMsg('');
    setSavingPassword(true);
    try {
      const payload = {
        newPassword: values.newPassword,
      };
      if (hasExistingPassword) {
        payload.currentPassword = values.currentPassword;
      }
      const result = await dispatch(updateProfile(payload));
      if (updateProfile.fulfilled.match(result)) {
        resetForm();
        setPasswordSheetVisible(false);
        setToastState((prev) => ({
          visible: true,
          message: hasExistingPassword ? 'Password updated' : 'Password set',
          key: prev.key + 1,
        }));
      } else {
        setPasswordErrorMsg(result.payload || 'Unable to update password.');
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = () => {
    dispatch(requestSignOut());
  };

  const handleTogglePushSync = async () => {
    if (syncingPush) {
      return;
    }
    setSyncingPush(true);
    try {
      const result = await dispatch(syncPushToken({ requestPermission: true }));
      const granted = await getNotificationPermissionGranted();
      setPushEnabled(granted);
      if (result.payload) {
        Alert.alert(
          'Notifications Active',
          'Your device is registered for order and promotional updates.'
        );
      } else if (granted) {
        Alert.alert(
          'Permission Granted',
          'Notifications are enabled. Remote push token delivery requires a development or standalone build on Android.'
        );
      } else {
        Alert.alert(
          'Permission Disabled',
          'Enable notifications in your device settings to receive order and promotional updates.'
        );
      }
    } finally {
      setSyncingPush(false);
    }
  };

  const resolvedAvatar = avatarUri || user.photoURL;

  return (
    <View style={styles.container}>
      <AtelierHeader
        title="Profile"
        leftType="drawer"
        navigation={navigation}
      />

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.avatarSection}>
          <View style={styles.avatarOuter}>
            <AtelierPressable
              tone="none"
              disableRipple
              disabled={uploadingPhoto}
              haptic="light"
              hitSlop={8}
              onPress={showAvatarPickerOptions}
              pressedStyle={styles.avatarPressed}
              style={styles.avatarWrapper}
              accessibilityLabel="Update profile photo"
            >
              <AtelierAvatar
                uri={resolvedAvatar}
                name={user.displayName}
                size={74}
              />
              {uploadingPhoto ? (
                <View style={styles.avatarUploadingOverlay}>
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />
                </View>
              ) : null}
            </AtelierPressable>
            <View
              pointerEvents="none"
              style={styles.cameraIconBadge}
            >
              <Ionicons
                name="camera"
                size={16}
                color="#FFFFFF"
              />
            </View>
          </View>

          <AtelierText
            variant="title1"
            style={styles.profileDisplayName}
          >
            {user.displayName}
          </AtelierText>
          <AtelierText
            variant="bodySmall"
            color={theme.colors.inkMuted}
            style={styles.profileEmail}
          >
            {user.email}
          </AtelierText>
        </View>

        <AtelierCard style={styles.infoCard}>
          {user.username ? (
            <View style={styles.infoRow}>
              <AtelierText
                variant="bodySmall"
                color={theme.colors.inkMuted}
                style={styles.infoLabelText}
              >
                Username
              </AtelierText>
              <AtelierText
                variant="bodySmall"
                color={theme.colors.inkPrimary}
                style={styles.infoValueText}
              >
                {`@${user.username}`}
              </AtelierText>
            </View>
          ) : (
            <AtelierPressable
              tone="surface"
              hitSlop={6}
              style={styles.infoActionRow}
              onPress={handleOpenUsernameSheet}
              accessibilityLabel="Set username"
            >
              <AtelierText
                variant="bodySmall"
                color={theme.colors.inkMuted}
                style={styles.infoLabelText}
              >
                Username
              </AtelierText>
              <View style={styles.inlineActionLink}>
                <AtelierText
                  variant="bodySmall"
                  color={theme.colors.goldText}
                  style={styles.inlineActionText}
                >
                  Set username
                </AtelierText>
                <Ionicons
                  name="chevron-forward"
                  size={15}
                  color={theme.colors.goldText}
                />
              </View>
            </AtelierPressable>
          )}

          <View style={styles.infoDivider} />

          <AtelierPressable
            tone="surface"
            hitSlop={6}
            style={styles.infoActionRow}
            onPress={handleOpenPasswordSheet}
            accessibilityLabel={
              hasExistingPassword ? 'Change password' : 'Set password'
            }
          >
            <AtelierText
              variant="bodySmall"
              color={theme.colors.inkMuted}
              style={styles.infoLabelText}
            >
              Password
            </AtelierText>
            <View style={styles.inlineActionLink}>
              <AtelierText
                variant="bodySmall"
                color={theme.colors.goldText}
                style={styles.inlineActionText}
              >
                {hasExistingPassword ? 'Change password' : 'Set password'}
              </AtelierText>
              <Ionicons
                name="chevron-forward"
                size={15}
                color={theme.colors.goldText}
              />
            </View>
          </AtelierPressable>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <AtelierText
              variant="bodySmall"
              color={theme.colors.inkMuted}
              style={styles.infoLabelText}
            >
              Account Role
            </AtelierText>
            <AtelierText
              variant="bodySmall"
              color={theme.colors.inkPrimary}
              style={styles.infoValueText}
            >
              {user.role === 'admin' ? 'Administrator' : 'Customer'}
            </AtelierText>
          </View>

          <View style={styles.infoDivider} />

          <AtelierPressable
            tone="surface"
            hitSlop={6}
            style={styles.infoActionRow}
            onPress={handleTogglePushSync}
            accessibilityLabel="Sync push notifications"
          >
            <AtelierText
              variant="bodySmall"
              color={theme.colors.inkMuted}
              style={styles.infoLabelText}
            >
              Push Notifications
            </AtelierText>
            {pushEnabled && !syncingPush ? (
              <View style={styles.inlineStatusRow}>
                <Ionicons
                  name="checkmark-circle"
                  size={15}
                  color={theme.colors.success}
                />
                <AtelierText
                  variant="bodySmall"
                  color={theme.colors.success}
                  style={styles.inlineStatusText}
                >
                  Enabled
                </AtelierText>
              </View>
            ) : (
              <View style={styles.inlineActionLink}>
                <AtelierText
                  variant="bodySmall"
                  color={theme.colors.goldText}
                  style={styles.inlineActionText}
                >
                  {syncingPush ? 'Syncing...' : 'Enable'}
                </AtelierText>
                {!syncingPush ? (
                  <Ionicons
                    name="chevron-forward"
                    size={15}
                    color={theme.colors.goldText}
                  />
                ) : null}
              </View>
            )}
          </AtelierPressable>
        </AtelierCard>

        <AtelierText
          variant="title2"
          style={styles.sectionHeader}
        >
          Edit Profile
        </AtelierText>

        <Formik
          enableReinitialize
          initialValues={{
            displayName: user.displayName || '',
          }}
          validationSchema={ProfileSchema}
          onSubmit={handleProfileSubmit}
        >
          {({
            handleChange,
            handleBlur,
            setErrors,
            setSubmitting,
            setTouched,
            values,
            errors,
            touched,
            isSubmitting,
          }) => (
            <View
              onLayout={(e) => {
                editSectionTopRef.current = e.nativeEvent.layout.y;
              }}
            >
              <AtelierInput
                label="Display Name"
                placeholder="Enter your display name"
                value={values.displayName}
                onChangeText={handleChange('displayName')}
                onBlur={handleBlur('displayName')}
                error={errors.displayName}
                touched={touched.displayName}
                style={profileError ? styles.inputWithBanner : styles.compactInput}
              />

              <AtelierErrorBanner
                message={profileError}
                style={styles.errorBanner}
              />

              <AtelierButton
                title={
                  savingProfile || isSubmitting ? 'Saving...' : 'Save Changes'
                }
                onPress={() =>
                  submitFormWithScroll({
                    schema: ProfileSchema,
                    values,
                    setErrors,
                    setTouched,
                    setSubmitting,
                    onSubmit: handleProfileSubmit,
                    scrollViewRef,
                    yPositions: { displayName: editSectionTopRef.current },
                    fieldOrder: ['displayName'],
                  })
                }
                loading={savingProfile || isSubmitting}
                disabled={uploadingPhoto || savingProfile || isSubmitting}
                style={styles.saveButton}
              />

              <AtelierButton
                title="Sign Out"
                onPress={handleLogout}
                variant="outline"
                disabled={savingProfile || isSubmitting}
                style={styles.logoutButton}
              />
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

      <AtelierBottomSheet
        visible={avatarSheetVisible}
        onClose={() => setAvatarSheetVisible(false)}
        title="Update Profile Photo"
        subtitle="Choose a source for your photo."
        options={[
          {
            key: 'gallery',
            label: 'Choose from Gallery',
            icon: 'images-outline',
            onPress: handlePickFromGallery,
          },
          {
            key: 'camera',
            label: 'Take Photo',
            icon: 'camera-outline',
            onPress: handleCaptureCamera,
          },
        ]}
      />

      <AtelierBottomSheet
        visible={usernameSheetVisible}
        onClose={handleCloseUsernameSheet}
        title="Set Username"
        subtitle="Choose a unique @username so you can sign in with either email or username."
      >
        <Formik
          enableReinitialize
          initialValues={{
            username: suggestedUsername,
          }}
          validationSchema={SetUsernameSchema}
          onSubmit={handleSetUsernameSubmit}
        >
          {({
            handleBlur,
            setFieldValue,
            setErrors,
            setTouched,
            setSubmitting,
            values,
            errors,
            touched,
            isSubmitting,
          }) => {
            const usernameFeedback = getUsernameFeedback(
              errors.username,
              availabilityState
            );

            return (
              <View style={styles.sheetForm}>
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

                <AtelierErrorBanner
                  message={usernameErrorMsg}
                  style={styles.errorBanner}
                />

                <AtelierButton
                  title={
                    savingUsername || isSubmitting
                      ? 'Saving...'
                      : 'Save Username'
                  }
                  onPress={() =>
                    submitFormWithScroll({
                      schema: SetUsernameSchema,
                      values,
                      setErrors,
                      setTouched,
                      setSubmitting,
                      onSubmit: handleSetUsernameSubmit,
                      fieldOrder: ['username'],
                      onBeforeValidate: () => {
                        if (availabilityState.status === 'taken') {
                          setUsernameErrorMsg('That username is already taken.');
                          return { username: 'That username is already taken.' };
                        }
                        return {};
                      },
                    })
                  }
                  loading={savingUsername || isSubmitting}
                  disabled={
                    savingUsername ||
                    isSubmitting ||
                    availabilityState.status === 'checking' ||
                    availabilityState.status === 'taken'
                  }
                  style={styles.sheetSaveButton}
                />
              </View>
            );
          }}
        </Formik>
      </AtelierBottomSheet>

      <AtelierBottomSheet
        visible={passwordSheetVisible}
        onClose={handleClosePasswordSheet}
        title={hasExistingPassword ? 'Change Password' : 'Set Password'}
        subtitle={
          hasExistingPassword
            ? 'Confirm your current password, then choose a new password.'
            : 'Add a password so you can also sign in with your email or username.'
        }
        maxHeight={Math.round(windowHeight * 0.85)}
      >
        <Formik
          enableReinitialize
          initialValues={{
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          }}
          validationSchema={passwordSchema}
          onSubmit={handlePasswordSubmit}
        >
          {({
            handleChange,
            handleBlur,
            setErrors,
            setTouched,
            setSubmitting,
            resetForm,
            values,
            errors,
            touched,
            isSubmitting,
          }) => (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.sheetForm}>
                {hasExistingPassword ? (
                  <AtelierInput
                    label="Current Password"
                    placeholder="Enter current password"
                    value={values.currentPassword}
                    onChangeText={(text) => {
                      setPasswordErrorMsg('');
                      handleChange('currentPassword')(text);
                    }}
                    onBlur={handleBlur('currentPassword')}
                    secureTextEntry
                    autoComplete="current-password"
                    textContentType="password"
                    error={errors.currentPassword}
                    touched={touched.currentPassword}
                    style={styles.compactInput}
                  />
                ) : null}

                <AtelierInput
                  label="New Password"
                  placeholder="Enter new password"
                  helperText="Minimum 6 characters"
                  value={values.newPassword}
                  onChangeText={(text) => {
                    setPasswordErrorMsg('');
                    handleChange('newPassword')(text);
                  }}
                  onBlur={handleBlur('newPassword')}
                  secureTextEntry
                  autoComplete="new-password"
                  textContentType="newPassword"
                  error={errors.newPassword}
                  touched={touched.newPassword}
                  style={styles.compactInput}
                />

                <AtelierInput
                  label="Confirm New Password"
                  placeholder="Re-enter new password"
                  value={values.confirmPassword}
                  onChangeText={(text) => {
                    setPasswordErrorMsg('');
                    handleChange('confirmPassword')(text);
                  }}
                  onBlur={handleBlur('confirmPassword')}
                  secureTextEntry
                  autoComplete="new-password"
                  textContentType="newPassword"
                  error={errors.confirmPassword}
                  touched={touched.confirmPassword}
                  style={
                    passwordErrorMsg ? styles.inputWithBanner : styles.compactInput
                  }
                />

                <AtelierErrorBanner
                  message={passwordErrorMsg}
                  style={styles.errorBanner}
                />

                <AtelierButton
                  title={
                    savingPassword || isSubmitting
                      ? 'Saving...'
                      : hasExistingPassword
                      ? 'Save Password'
                      : 'Set Password'
                  }
                  onPress={() =>
                    submitFormWithScroll({
                      schema: passwordSchema,
                      values,
                      setErrors,
                      setTouched,
                      setSubmitting,
                      resetForm,
                      onSubmit: handlePasswordSubmit,
                      fieldOrder: hasExistingPassword
                        ? ['currentPassword', 'newPassword', 'confirmPassword']
                        : ['newPassword', 'confirmPassword'],
                    })
                  }
                  loading={savingPassword || isSubmitting}
                  disabled={savingPassword || isSubmitting}
                  style={styles.sheetSaveButton}
                />
              </View>
            </ScrollView>
          )}
        </Formik>
      </AtelierBottomSheet>
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
  avatarSection: {
    alignItems: 'center',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  avatarOuter: {
    width: 84,
    height: 84,
    position: 'relative',
  },
  avatarWrapper: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: theme.colors.gold,
    backgroundColor: theme.colors.surface,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  avatarUploadingOverlay: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderRadius: 38,
    backgroundColor: 'rgba(28, 25, 23, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.inkPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  profileDisplayName: {
    marginTop: theme.spacing.md,
  },
  profileEmail: {
    marginTop: 2,
  },
  infoCard: {
    marginTop: 0,
    marginBottom: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 46,
    paddingVertical: 12,
  },
  infoLabelText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Montserrat_500Medium',
  },
  infoValueText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Montserrat_500Medium',
  },
  infoDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  infoActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 46,
    paddingVertical: 12,
    borderRadius: theme.radii.xs,
    overflow: 'hidden',
  },
  inlineActionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  inlineStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  inlineStatusText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Montserrat_500Medium',
  },
  inlineActionText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Montserrat_600SemiBold',
  },
  sectionHeader: {
    marginBottom: theme.spacing.md,
  },
  compactInput: {
    marginBottom: theme.spacing.md,
  },
  inputWithBanner: {
    marginBottom: theme.spacing.sm,
  },
  saveButton: {
    marginTop: 0,
    marginBottom: theme.spacing.md,
  },
  errorBanner: {
    marginHorizontal: 0,
    marginBottom: theme.spacing.md,
  },
  sheetForm: {
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.sm,
  },
  sheetSaveButton: {
    marginTop: theme.spacing.xs,
  },
  logoutButton: {
    marginBottom: theme.spacing.md,
  },
});

export default ProfileScreen;
