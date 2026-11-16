import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '../../theme';
import {
  fetchBrands,
  createBrand,
  updateBrand,
  deleteBrand,
  clearBrandError,
} from '../../redux/brandsSlice';
import AtelierText from '../../components/common/AtelierText';
import AtelierButton from '../../components/common/AtelierButton';
import AtelierInput from '../../components/common/AtelierInput';
import AtelierCard from '../../components/common/AtelierCard';
import AtelierPressable from '../../components/common/AtelierPressable';
import AtelierSkeleton from '../../components/common/AtelierSkeleton';
import AtelierEmptyState from '../../components/common/AtelierEmptyState';
import AtelierErrorBanner from '../../components/common/AtelierErrorBanner';
import AtelierBottomSheet from '../../components/common/AtelierBottomSheet';
import AtelierHeader from '../../components/common/AtelierHeader';
import AtelierToast from '../../components/common/AtelierToast';

const BrandSchema = Yup.object().shape({
  name: Yup.string()
    .trim()
    .min(2, 'Brand name must be at least 2 characters')
    .max(50, 'Brand name must be 50 characters or less')
    .required('Brand name is required'),
  origin: Yup.string().trim().max(50, 'Origin must be 50 characters or less'),
  description: Yup.string().trim().max(200, 'Description must be 200 characters or less'),
});

const AdminBrandsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { items, loading, submitting, error } = useSelector((state) => state.brands);
  const [refreshing, setRefreshing] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toastState, setToastState] = useState({
    visible: false,
    message: '',
    key: 0,
  });

  useEffect(() => {
    dispatch(fetchBrands());
  }, [dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchBrands());
    setRefreshing(false);
  }, [dispatch]);

  const openCreateSheet = () => {
    dispatch(clearBrandError());
    setEditingBrand(null);
    setSheetVisible(true);
  };

  const openEditSheet = (brand) => {
    dispatch(clearBrandError());
    setEditingBrand(brand);
    setSheetVisible(true);
  };

  const showToast = (message) => {
    setToastState((prev) => ({
      visible: true,
      message,
      key: prev.key + 1,
    }));
  };

  const handleSaveBrand = async (values, { resetForm }) => {
    const payload = {
      name: values.name.trim().replace(/\s+/g, ' '),
      origin: values.origin.trim().replace(/\s+/g, ' '),
      description: values.description.trim(),
    };

    const result = editingBrand
      ? await dispatch(updateBrand({ id: editingBrand._id, data: payload }))
      : await dispatch(createBrand(payload));

    if (!result.error) {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}
      resetForm();
      setSheetVisible(false);
      showToast(editingBrand ? 'Brand updated' : 'Brand added');
      setEditingBrand(null);
    } else {
      Alert.alert('Save Failed', result.payload || 'Unable to save brand.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    const targetName = deleteTarget.name;
    const result = await dispatch(deleteBrand(deleteTarget._id));
    setDeleteTarget(null);
    if (!result.error) {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}
      showToast(`"${targetName}" removed`);
    } else {
      Alert.alert('Delete Failed', result.payload || 'Unable to delete brand.');
    }
  };

  const renderBrandItem = ({ item }) => (
    <AtelierCard style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.cardInfo}>
          <AtelierText
            variant="title2"
            color={theme.colors.inkPrimary}
          >
            {item.name}
          </AtelierText>
          {item.origin ? (
            <AtelierText
              variant="caption"
              color={theme.colors.goldText}
              style={styles.originText}
            >
              {item.origin}
            </AtelierText>
          ) : null}
          {item.description ? (
            <AtelierText
              variant="bodySmall"
              color={theme.colors.inkMuted}
              style={styles.descriptionText}
            >
              {item.description}
            </AtelierText>
          ) : null}
        </View>

        <View style={styles.actionsRow}>
          <AtelierPressable
            tone="surface"
            hitSlop={6}
            style={styles.editButton}
            onPress={() => openEditSheet(item)}
            accessibilityLabel={`Edit ${item.name}`}
          >
            <Ionicons
              name="create-outline"
              size={18}
              color={theme.colors.inkPrimary}
            />
          </AtelierPressable>
          <AtelierPressable
            tone="subtle"
            hitSlop={6}
            style={styles.deleteButton}
            onPress={() => setDeleteTarget(item)}
            accessibilityLabel={`Delete ${item.name}`}
          >
            <Ionicons
              name="trash-outline"
              size={18}
              color={theme.colors.error}
            />
          </AtelierPressable>
        </View>
      </View>
    </AtelierCard>
  );

  return (
    <View style={styles.container}>
      <AtelierHeader
        title="Manage Brands"
        leftType={navigation.canGoBack() ? 'back' : 'drawer'}
        navigation={navigation}
        rightIcon="add-outline"
        rightIconColor={theme.colors.gold}
        rightIconSize={28}
        rightAccessibilityLabel="Add Brand"
        onRightPress={openCreateSheet}
      />

      {error ? (
        <AtelierErrorBanner
          message={error}
          onRetry={() => dispatch(fetchBrands())}
          style={styles.errorBanner}
        />
      ) : null}

      {loading && items.length === 0 ? (
        <View style={styles.skeletonPadding}>
          {[1, 2, 3].map((n) => (
            <AtelierSkeleton
              key={n}
              height={84}
              borderRadius={theme.radii.md}
              style={{ marginBottom: 12 }}
            />
          ))}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          renderItem={renderBrandItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.gold}
            />
          }
          ListEmptyComponent={
            !error ? (
              <AtelierEmptyState
                iconName="bookmark-outline"
                title="No Brands Yet"
                description="Add fountain pen, ink, or paper makers for your catalog."
                actionTitle="Add Brand"
                onActionPress={openCreateSheet}
              />
            ) : null
          }
        />
      )}

      <AtelierBottomSheet
        visible={sheetVisible}
        onClose={() => {
          setSheetVisible(false);
          setEditingBrand(null);
        }}
        title={editingBrand ? 'Edit Brand' : 'Add Brand'}
        subtitle="Keep brand names consistent across products and storefront filters."
      >
        <Formik
          enableReinitialize
          initialValues={{
            name: editingBrand?.name || '',
            origin: editingBrand?.origin || '',
            description: editingBrand?.description || '',
          }}
          validationSchema={BrandSchema}
          onSubmit={handleSaveBrand}
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
                label="Brand Name"
                placeholder="e.g. Sailor"
                value={values.name}
                onChangeText={handleChange('name')}
                onBlur={handleBlur('name')}
                autoCapitalize="words"
                error={errors.name}
                touched={touched.name}
              />

              <AtelierInput
                label="Country / Origin (Optional)"
                placeholder="e.g. Japan"
                value={values.origin}
                onChangeText={handleChange('origin')}
                onBlur={handleBlur('origin')}
                autoCapitalize="words"
                error={errors.origin}
                touched={touched.origin}
              />

              <AtelierInput
                label="Description"
                placeholder="Short description shown to admins"
                value={values.description}
                onChangeText={handleChange('description')}
                onBlur={handleBlur('description')}
                multiline
                numberOfLines={3}
                error={errors.description}
                touched={touched.description}
              />

              <AtelierButton
                title={submitting ? 'Saving...' : editingBrand ? 'Save Changes' : 'Add Brand'}
                onPress={handleSubmit}
                loading={submitting}
              />
            </View>
          )}
        </Formik>
      </AtelierBottomSheet>

      <AtelierBottomSheet
        visible={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Brand"
        showCloseButton={false}
        subtitle={
          deleteTarget
            ? `Remove "${deleteTarget.name}" from store brands?`
            : ''
        }
        options={[
          {
            key: 'confirm',
            label: 'Delete Brand',
            icon: 'trash-outline',
            destructive: true,
            onPress: handleConfirmDelete,
          },
          {
            key: 'cancel',
            label: 'Cancel',
            icon: 'close-outline',
            onPress: () => setDeleteTarget(null),
          },
        ]}
      />

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
  errorBanner: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  skeletonPadding: {
    padding: theme.spacing.lg,
  },
  listContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.hero,
  },
  card: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  cardInfo: {
    flex: 1,
  },
  originText: {
    marginTop: 2,
  },
  descriptionText: {
    marginTop: 4,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  editButton: {
    width: theme.touchTarget.minWidth,
    height: theme.touchTarget.minHeight,
    borderRadius: theme.radii.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  deleteButton: {
    width: theme.touchTarget.minWidth,
    height: theme.touchTarget.minHeight,
    borderRadius: theme.radii.xs,
    borderWidth: 1,
    borderColor: theme.colors.errorBg,
    backgroundColor: theme.colors.errorBg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

export default AdminBrandsScreen;
