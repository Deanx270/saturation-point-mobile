import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
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
import AtelierPressable from '../../components/common/AtelierPressable';
import { updateProfile, logout, syncPushToken } from '../../redux/authSlice';
import { getNotificationPermissionGranted } from '../../services/pushNotificationService';
import { isValidRemoteOrLocalUri } from '../../utils/formatters';
import { appendImageToFormData } from '../../utils/formDataHelper';
import {
  pickImagesFromGallery,
  captureImageWithCamera,
} from '../../utils/imagePickerHelper';

const ProfileSchema = Yup.object().shape({
  displayName: Yup.string().required('Display name is required'),
  username: Yup.string().required('Username is required'),
});

export const ProfileScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user, loading } = useSelector((state) => state.auth);
  const [avatarUri, setAvatarUri] = useState(user?.photoURL || null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [syncingPush, setSyncingPush] = useState(false);
  const [avatarSheetVisible, setAvatarSheetVisible] = useState(false);

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

        <View style={styles.guestContainer}>
          <View style={styles.guestAvatarPlaceholder}>
            <Ionicons
              name="person-outline"
              size={48}
              color={theme.colors.inkMuted}
            />
          </View>
          <AtelierText
            variant="display"
            style={styles.guestTitle}
          >
            Guest
          </AtelierText>
          <AtelierText
            variant="bodyLarge"
            color={theme.colors.inkSecondary}
            style={styles.guestSubtitle}
          >
            Sign in to view your orders, save your details, and manage your account.
          </AtelierText>
          <AtelierButton
            title="Sign In"
            onPress={() => navigation.navigate('Login')}
            style={styles.guestButton}
          />
          <AtelierButton
            title="Create Account"
            onPress={() => navigation.navigate('Register')}
            variant="outline"
            style={styles.guestButton}
          />
        </View>
      </View>
    );
  }

  const uploadSelectedAvatar = async (uri) => {
    setAvatarUri(uri);
    try {
      const formData = new FormData();
      await appendImageToFormData(formData, 'photo', uri, 0, 'avatar');
      const result = await dispatch(updateProfile(formData));
      if (updateProfile.fulfilled.match(result)) {
        Alert.alert('Photo Updated', 'Your profile photo has been saved.');
      } else {
        setAvatarUri(user?.photoURL || null);
        Alert.alert('Upload Failed', result.payload || 'Unable to upload photo.');
      }
    } catch (error) {
      setAvatarUri(user?.photoURL || null);
      Alert.alert('Upload Failed', error.message || 'Unable to upload photo.');
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
    const result = await dispatch(updateProfile(values));
    if (updateProfile.fulfilled.match(result)) {
      Alert.alert('Profile Saved', 'Your account details have been updated.');
    } else {
      Alert.alert('Update Failed', result.payload || 'Unable to update profile.');
    }
  };

  const handleLogout = () => {
    dispatch(logout());
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
          <View style={styles.avatarWrapper}>
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
            <AtelierPressable
              tone="solid"
              haptic="light"
              hitSlop={8}
              style={styles.cameraIconBadge}
              onPress={showAvatarPickerOptions}
              accessibilityLabel="Update profile photo"
            >
              <Ionicons
                name="camera"
                size={18}
                color="#FFFFFF"
              />
            </AtelierPressable>
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
              ACCOUNT ROLE
            </AtelierText>
            <AtelierText
              variant="title2"
              color={theme.colors.inkPrimary}
            >
              {user.role === 'admin' ? 'Administrator' : 'Customer'}
            </AtelierText>
          </View>
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
              PUSH NOTIFICATIONS
            </AtelierText>
            <AtelierBadge
              label={syncingPush ? 'SYNCING...' : pushEnabled ? 'ENABLED' : 'ENABLE'}
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
            username: user.username || '',
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
                value={values.displayName}
                onChangeText={handleChange('displayName')}
                onBlur={handleBlur('displayName')}
                error={errors.displayName}
                touched={touched.displayName}
              />

              <AtelierInput
                label="Username"
                value={values.username}
                onChangeText={handleChange('username')}
                onBlur={handleBlur('username')}
                error={errors.username}
                touched={touched.username}
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
          {
            key: 'cancel',
            label: 'Cancel',
            icon: 'close-outline',
            onPress: () => setAvatarSheetVisible(false),
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
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.hero,
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: theme.spacing.lg,
  },
  avatarWrapper: {
    width: 100,
    height: 100,
    borderRadius: theme.radii.sm,
    borderWidth: 2,
    borderColor: theme.colors.gold,
    position: 'relative',
    backgroundColor: theme.colors.surface,
    padding: 3,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: theme.radii.xs,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: theme.radii.xs,
    backgroundColor: theme.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.inkPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.surface,
    overflow: 'hidden',
  },
  profileDisplayName: {
    marginTop: theme.spacing.md,
  },
  badgeRow: {
    marginTop: theme.spacing.sm,
  },
  infoCard: {
    marginVertical: theme.spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  infoActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: theme.radii.xs,
    overflow: 'hidden',
  },
  sectionHeader: {
    marginBottom: theme.spacing.md,
  },
  saveButton: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  logoutButton: {
    marginBottom: theme.spacing.hero,
  },
  guestContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.hero,
  },
  guestAvatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  guestTitle: {
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  guestSubtitle: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.xl,
  },
  guestButton: {
    width: '100%',
    marginBottom: theme.spacing.md,
  },
});

export default ProfileScreen;
