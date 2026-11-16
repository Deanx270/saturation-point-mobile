import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
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
import { updateProfile, requestSignOut, syncPushToken } from '../../redux/authSlice';
import { getNotificationPermissionGranted } from '../../services/pushNotificationService';
import { isValidRemoteOrLocalUri } from '../../utils/formatters';
import { appendImageToFormData } from '../../utils/formDataHelper';
import {
  pickImagesFromGallery,
  captureImageWithCamera,
} from '../../utils/imagePickerHelper';
import {
  USERNAME_REGEX,
  displayNameSchemaField,
} from '../../utils/validationSchemas';

const ProfileSchema = Yup.object().shape({
  displayName: displayNameSchemaField,
  username: Yup.string()
    .trim()
    .transform((v) => (v ? v.replace(/^@/, '') : ''))
    .test(
      'optional-username',
      'Username must be 3–30 characters (letters, numbers, underscores)',
      (value) => !value || USERNAME_REGEX.test(value)
    ),
});

export const ProfileScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user, loading } = useSelector((state) => state.auth);
  const [avatarUri, setAvatarUri] = useState(user?.photoURL || null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [syncingPush, setSyncingPush] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [avatarSheetVisible, setAvatarSheetVisible] = useState(false);
  const [toastState, setToastState] = useState({
    visible: false,
    message: '',
    key: 0,
  });

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
    const payload = {
      displayName: values.displayName.trim(),
    };
    if (!user?.username && typeof values.username === 'string' && values.username.trim()) {
      payload.username = values.username.trim().replace(/^@/, '').toLowerCase();
    }
    const result = await dispatch(updateProfile(payload));
    if (updateProfile.fulfilled.match(result)) {
      setToastState((prev) => ({
        visible: true,
        message: 'Profile details updated',
        key: prev.key + 1,
      }));
    } else {
      Alert.alert('Update Failed', result.payload || 'Unable to update profile.');
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
  const hasAvatar = isValidRemoteOrLocalUri(resolvedAvatar);

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
              {hasAvatar ? (
                <Image
                  source={{ uri: resolvedAvatar }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons
                    name="person-outline"
                    size={40}
                    color={theme.colors.inkMuted}
                  />
                </View>
              )}
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
              status={user.role === 'admin' ? 'gold' : 'success'}
            />
          </View>
        </View>

        <AtelierCard
          subtle
          style={styles.infoCard}
        >
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
              {user.username ? `@${user.username}` : 'Not set'}
            </AtelierText>
          </View>

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
            <AtelierBadge
              label={syncingPush ? 'Syncing...' : pushEnabled ? 'Enabled' : 'Enable'}
              status={pushEnabled ? 'success' : 'gold'}
            />
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
            username: '',
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

              {!user.username ? (
                <AtelierInput
                  label="Username (Optional)"
                  prefix="@"
                  placeholder="e.g. alex_santos"
                  helperText="Set a handle to sign in with username"
                  value={values.username}
                  onChangeText={handleChange('username')}
                  onBlur={handleBlur('username')}
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={errors.username}
                  touched={touched.username}
                />
              ) : null}

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
    overflow: 'hidden',
  },
  avatarPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 38,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 38,
    backgroundColor: theme.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
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
  sectionHeader: {
    marginBottom: theme.spacing.sm,
  },
  saveButton: {
    marginTop: 0,
    marginBottom: theme.spacing.sm,
  },
  logoutButton: {
    marginBottom: theme.spacing.md,
  },
});

export default ProfileScreen;
