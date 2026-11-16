import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
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
import AtelierBadge from '../../components/common/AtelierBadge';
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
import { appendImageToFormData } from '../../utils/formDataHelper';
import {
  pickImagesFromGallery,
  captureImageWithCamera,
} from '../../utils/imagePickerHelper';
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

const ProfileSchema = Yup.object().shape({
  displayName: displayNameSchemaField,
});

const SetUsernameSchema = Yup.object().shape({
  username: usernameSchemaField,
});

export const ProfileScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user, loading } = useSelector((state) => state.auth);
  const [avatarUri, setAvatarUri] = useState(user?.photoURL || null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [syncingPush, setSyncingPush] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [avatarSheetVisible, setAvatarSheetVisible] = useState(false);
  const [usernameSheetVisible, setUsernameSheetVisible] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [usernameErrorMsg, setUsernameErrorMsg] = useState('');
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
      refreshPushPermission();
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
    setProfileError('');
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
      if (Platform.OS !== 'web') {
        Alert.alert('Update Failed', errorMsg);
      }
    }
  };

  const handleOpenUsernameSheet = () => {
    setUsernameErrorMsg('');
    setUsernameSheetVisible(true);
  };

  const handleCloseUsernameSheet = () => {
    if (loading) {
      return;
    }
    setUsernameSheetVisible(false);
    setUsernameErrorMsg('');
    resetAvailability();
  };

  const handleSetUsernameSubmit = async (values) => {
    setUsernameErrorMsg('');
    if (availabilityState.status === 'taken') {
      setUsernameErrorMsg('That username is already taken.');
      return;
    }
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
      if (Platform.OS !== 'web') {
        Alert.alert('Unable to Save', errorMsg);
      }
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
        showsVerticalScrollIndicator={false}
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
            variant="bodyMedium"
            color={theme.colors.inkMuted}
          >
            {user.email}
          </AtelierText>
          <View style={styles.badgeRow}>
            <AtelierBadge
              label={user.role === 'admin' ? 'Admin' : 'Member'}
              status={user.role === 'admin' ? 'gold' : 'default'}
            />
          </View>
        </View>

        <AtelierCard
          subtle
          style={styles.infoCard}
        >
          {user.username ? (
            <View style={styles.infoRow}>
              <AtelierText
                variant="caption"
                color={theme.colors.inkMuted}
              >
                Username
              </AtelierText>
              <AtelierText
                variant="bodyMedium"
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
                variant="caption"
                color={theme.colors.inkMuted}
              >
                Username
              </AtelierText>
              <View style={styles.inlineActionChip}>
                <AtelierText
                  variant="caption"
                  color={theme.colors.goldText}
                  style={styles.inlineActionText}
                >
                  Set Username
                </AtelierText>
                <Ionicons
                  name="chevron-forward"
                  size={13}
                  color={theme.colors.goldText}
                />
              </View>
            </AtelierPressable>
          )}

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <AtelierText
              variant="caption"
              color={theme.colors.inkMuted}
            >
              Account Role
            </AtelierText>
            <AtelierText
              variant="bodyMedium"
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
              variant="caption"
              color={theme.colors.inkMuted}
            >
              Push Notifications
            </AtelierText>
            {pushEnabled && !syncingPush ? (
              <AtelierBadge
                label="Enabled"
                status="success"
              />
            ) : (
              <View style={styles.inlineActionChip}>
                <AtelierText
                  variant="caption"
                  color={theme.colors.goldText}
                  style={styles.inlineActionText}
                >
                  {syncingPush ? 'Syncing...' : 'Enable'}
                </AtelierText>
                {!syncingPush ? (
                  <Ionicons
                    name="chevron-forward"
                    size={13}
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
            handleSubmit,
            values,
            errors,
            touched,
          }) => (
            <View>
              <AtelierInput
                label="Display Name"
                placeholder="Enter your display name"
                value={values.displayName}
                onChangeText={handleChange('displayName')}
                onBlur={handleBlur('displayName')}
                error={errors.displayName}
                touched={touched.displayName}
              />

              <AtelierErrorBanner
                message={profileError}
                style={styles.errorBanner}
              />

              <AtelierButton
                title={loading ? 'Saving...' : 'Save Changes'}
                onPress={handleSubmit}
                loading={loading}
                style={styles.saveButton}
              />

              <AtelierButton
                title="Sign Out"
                onPress={handleLogout}
                variant="outline"
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
            handleSubmit,
            setFieldValue,
            values,
            errors,
            touched,
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
                  title={loading ? 'Saving...' : 'Save Username'}
                  onPress={handleSubmit}
                  loading={loading}
                  disabled={
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
    marginBottom: theme.spacing.md,
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
    marginTop: theme.spacing.sm,
  },
  badgeRow: {
    marginTop: theme.spacing.xs,
  },
  infoCard: {
    marginTop: 0,
    marginBottom: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoValueText: {
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
    paddingVertical: 6,
    borderRadius: theme.radii.xs,
    overflow: 'hidden',
  },
  inlineActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(161, 98, 7, 0.4)',
    borderRadius: theme.radii.sm,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  inlineActionText: {
    fontSize: 11,
  },
  sectionHeader: {
    marginBottom: theme.spacing.sm,
  },
  saveButton: {
    marginTop: 0,
    marginBottom: theme.spacing.sm,
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
