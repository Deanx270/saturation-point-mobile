import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
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
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  clearCategoryError,
} from '../../redux/categoriesSlice';
import AtelierText from '../../components/common/AtelierText';
import AtelierButton from '../../components/common/AtelierButton';
import AtelierInput from '../../components/common/AtelierInput';
import AtelierCard from '../../components/common/AtelierCard';
import AtelierSkeleton from '../../components/common/AtelierSkeleton';
import AtelierEmptyState from '../../components/common/AtelierEmptyState';
import AtelierErrorBanner from '../../components/common/AtelierErrorBanner';
import AtelierBottomSheet from '../../components/common/AtelierBottomSheet';

const CategorySchema = Yup.object().shape({
  name: Yup.string()
    .min(2, 'Category name must be at least 2 characters')
    .max(50, 'Category name must be 50 characters or less')
    .required('Category name is required'),
  description: Yup.string().max(200, 'Description must be 200 characters or less'),
});

const AdminCategoriesScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { items, loading, submitting, error } = useSelector((state) => state.categories);
  const [refreshing, setRefreshing] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchCategories());
    setRefreshing(false);
  }, [dispatch]);

  const openCreateSheet = () => {
    dispatch(clearCategoryError());
    setEditingCategory(null);
    setSheetVisible(true);
  };

  const openEditSheet = (category) => {
    dispatch(clearCategoryError());
    setEditingCategory(category);
    setSheetVisible(true);
  };

  const handleSaveCategory = async (values, { resetForm }) => {
    const payload = {
      name: values.name.trim(),
      description: values.description.trim(),
    };

    const result = editingCategory
      ? await dispatch(updateCategory({ id: editingCategory._id, data: payload }))
      : await dispatch(createCategory(payload));

    if (!result.error) {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}
      resetForm();
      setSheetVisible(false);
      setEditingCategory(null);
    } else {
      Alert.alert('Save Failed', result.payload || 'Unable to save category.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    const result = await dispatch(deleteCategory(deleteTarget._id));
    setDeleteTarget(null);
    if (!result.error) {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}
    } else {
      Alert.alert('Delete Failed', result.payload || 'Unable to delete category.');
    }
  };

  const renderCategoryItem = ({ item }) => (
    <AtelierCard style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.cardInfo}>
          <AtelierText
            variant="title2"
            color={theme.colors.inkPrimary}
          >
            {item.name}
          </AtelierText>
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
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => openEditSheet(item)}
            accessibilityLabel={`Edit ${item.name}`}
          >
            <Ionicons
              name="create-outline"
              size={18}
              color={theme.colors.inkPrimary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => setDeleteTarget(item)}
            accessibilityLabel={`Delete ${item.name}`}
          >
            <Ionicons
              name="trash-outline"
              size={18}
              color={theme.colors.error}
            />
          </TouchableOpacity>
        </View>
      </View>
    </AtelierCard>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={() => navigation.openDrawer()}
        >
          <Ionicons
            name="menu-outline"
            size={26}
            color={theme.colors.inkPrimary}
          />
        </TouchableOpacity>
        <AtelierText
          variant="title1"
          style={styles.headerTitle}
        >
          Manage Categories
        </AtelierText>
        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={openCreateSheet}
          accessibilityLabel="Add Category"
        >
          <Ionicons
            name="add-outline"
            size={28}
            color={theme.colors.gold}
          />
        </TouchableOpacity>
      </View>

      {error ? (
        <AtelierErrorBanner
          message={error}
          onRetry={() => dispatch(fetchCategories())}
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
          renderItem={renderCategoryItem}
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
                iconName="pricetags-outline"
                title="No Categories Yet"
                description="Add product categories to organize your store."
                actionLabel="Add Category"
                onAction={openCreateSheet}
              />
            ) : null
          }
        />
      )}

      <AtelierBottomSheet
        visible={sheetVisible}
        onClose={() => {
          setSheetVisible(false);
          setEditingCategory(null);
        }}
        title={editingCategory ? 'Edit Category' : 'Add Category'}
        subtitle="Organize products cleanly across the catalog."
      >
        <Formik
          enableReinitialize
          initialValues={{
            name: editingCategory?.name || '',
            description: editingCategory?.description || '',
          }}
          validationSchema={CategorySchema}
          onSubmit={handleSaveCategory}
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
                label="Category Name"
                placeholder="e.g. Notebooks"
                value={values.name}
                onChangeText={handleChange('name')}
                onBlur={handleBlur('name')}
                autoCapitalize="words"
                error={errors.name}
                touched={touched.name}
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
                title={submitting ? 'Saving...' : editingCategory ? 'Save Changes' : 'Add Category'}
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
        title="Delete Category"
        subtitle={
          deleteTarget
            ? `Remove "${deleteTarget.name}" from store categories?`
            : ''
        }
        options={[
          {
            key: 'confirm',
            label: 'Delete Category',
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
  },
});

export default AdminCategoriesScreen;
