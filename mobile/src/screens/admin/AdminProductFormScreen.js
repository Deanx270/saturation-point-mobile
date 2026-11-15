import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Image,
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
import AtelierBottomSheet from '../../components/common/AtelierBottomSheet';
import {
  createProduct,
  updateProduct,
  fetchProductFilters,
} from '../../redux/productsSlice';
import { appendImageToFormData, isRemoteUri } from '../../utils/formDataHelper';
import {
  pickImagesFromGallery,
  captureImageWithCamera,
} from '../../utils/imagePickerHelper';

const DEFAULT_CATEGORIES = ['Fountain Pens', 'Inks', 'Paper'];

const ProductSchema = Yup.object().shape({
  name: Yup.string().required('Product name is required'),
  brand: Yup.string().required('Brand is required'),
  category: Yup.string().required('Category is required'),
  price: Yup.number()
    .typeError('Enter a valid price')
    .positive('Price must be greater than zero')
    .required('Price is required'),
  stock: Yup.number()
    .typeError('Enter a valid stock quantity')
    .min(0, 'Stock cannot be negative')
    .required('Stock is required'),
  description: Yup.string().required('Description is required'),
});

export const AdminProductFormScreen = ({ route, navigation }) => {
  const { product, isEditing } = route.params || {};
  const dispatch = useDispatch();
  const storeCategories = useSelector((state) => state.products.categories);

  const [images, setImages] = useState(product?.images || []);
  const [submitting, setSubmitting] = useState(false);
  const [photoSheetVisible, setPhotoSheetVisible] = useState(false);

  useEffect(() => {
    dispatch(fetchProductFilters());
  }, [dispatch]);

  const categoryOptions = useMemo(() => {
    const filtered = (storeCategories || []).filter((c) => c && c !== 'All');
    const merged = filtered.length > 0 ? filtered : DEFAULT_CATEGORIES;
    if (product?.category && !merged.includes(product.category)) {
      return [...merged, product.category];
    }
    return merged;
  }, [storeCategories, product?.category]);

  const handlePickFromGallery = async () => {
    const selected = await pickImagesFromGallery({ allowsMultipleSelection: true });
    if (selected.length > 0) {
      setImages((prev) => [...prev, ...selected].slice(0, 5));
    }
  };

  const handleCaptureCamera = async () => {
    const captured = await captureImageWithCamera();
    if (captured) {
      setImages((prev) => [...prev, captured].slice(0, 5));
    }
  };

  const handleRemoveImage = (index) => {
    setImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleMoveImage = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= images.length) {
      return;
    }
    setImages((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[nextIndex];
      updated[nextIndex] = temp;
      return updated;
    });
  };

  const handleFormSubmit = async (values) => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', values.name.trim());
      formData.append('brand', values.brand.trim());
      formData.append('category', values.category.trim());
      formData.append('price', String(Number(values.price)));
      formData.append('stock', String(Number(values.stock)));
      formData.append('description', values.description.trim());

      const existingImages = [];
      const imageManifest = [];
      let uploadIndex = 0;

      for (const uri of images) {
        if (isRemoteUri(uri)) {
          existingImages.push(uri);
          imageManifest.push(`remote:${uri}`);
        } else {
          await appendImageToFormData(formData, 'images', uri, uploadIndex, 'product');
          imageManifest.push(`upload:${uploadIndex}`);
          uploadIndex += 1;
        }
      }

      formData.append('existingImages', JSON.stringify(existingImages));
      formData.append('imageManifest', JSON.stringify(imageManifest));

      const resultAction = isEditing
        ? await dispatch(updateProduct({ productId: product._id, productData: formData }))
        : await dispatch(createProduct(formData));

      if (
        createProduct.fulfilled.match(resultAction) ||
        updateProduct.fulfilled.match(resultAction)
      ) {
        Alert.alert(
          isEditing ? 'Product Updated' : 'Product Added',
          `Product ${isEditing ? 'updated' : 'added'} successfully.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Save Failed', resultAction.payload || 'Unable to save product.');
      }
    } catch (error) {
      Alert.alert('Save Failed', error.message || 'Unable to prepare image upload.');
    } finally {
      setSubmitting(false);
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
          {isEditing ? 'Edit Product' : 'Add Product'}
        </AtelierText>
        <View style={styles.headerIconButton} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <AtelierText
          variant="title2"
          style={styles.sectionHeading}
        >
          Product Images
        </AtelierText>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.imageScroll}
        >
          {images.length < 5 && (
            <TouchableOpacity
              style={styles.addImageTile}
              onPress={() => setPhotoSheetVisible(true)}
            >
              <Ionicons
                name="camera-outline"
                size={28}
                color={theme.colors.gold}
              />
              <AtelierText
                variant="caption"
                color={theme.colors.goldText}
                style={{ marginTop: 4 }}
              >
                Add Photo
              </AtelierText>
            </TouchableOpacity>
          )}

          {images.map((uri, idx) => (
            <View
              key={`${uri}_${idx}`}
              style={[
                styles.imagePreviewWrapper,
                idx === 0 && styles.primaryImageBorder,
              ]}
            >
              <Image
                source={{ uri }}
                style={styles.previewImage}
              />
              {idx === 0 && (
                <View style={styles.coverBadge}>
                  <AtelierText
                    variant="caption"
                    color="#FFFFFF"
                    style={styles.coverBadgeText}
                  >
                    COVER
                  </AtelierText>
                </View>
              )}
              <TouchableOpacity
                style={styles.removeImageBadge}
                onPress={() => handleRemoveImage(idx)}
              >
                <Ionicons
                  name="close"
                  size={14}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
              {images.length > 1 && (
                <View style={styles.reorderBar}>
                  <TouchableOpacity
                    style={[styles.reorderBtn, idx === 0 && styles.reorderBtnDisabled]}
                    onPress={() => handleMoveImage(idx, -1)}
                    disabled={idx === 0}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={14}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.reorderBtn,
                      idx === images.length - 1 && styles.reorderBtnDisabled,
                    ]}
                    onPress={() => handleMoveImage(idx, 1)}
                    disabled={idx === images.length - 1}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        <Formik
          initialValues={{
            name: product?.name || '',
            brand: product?.brand || '',
            category: product?.category || categoryOptions[0] || 'Fountain Pens',
            price: product?.price ? String(product.price) : '',
            stock: product?.stock !== undefined ? String(product.stock) : '10',
            description: product?.description || '',
          }}
          validationSchema={ProductSchema}
          onSubmit={handleFormSubmit}
        >
          {({
            handleChange,
            handleBlur,
            handleSubmit,
            setFieldValue,
            values,
            errors,
            touched,
          }) => (
            <View style={styles.formContainer}>
              <AtelierInput
                label="Product Name"
                placeholder="e.g. Lamy Safari Fountain Pen"
                value={values.name}
                onChangeText={handleChange('name')}
                onBlur={handleBlur('name')}
                error={errors.name}
                touched={touched.name}
              />

              <AtelierInput
                label="Brand"
                placeholder="e.g. Lamy"
                value={values.brand}
                onChangeText={handleChange('brand')}
                onBlur={handleBlur('brand')}
                error={errors.brand}
                touched={touched.brand}
              />

              <AtelierText
                variant="caption"
                color={theme.colors.inkSecondary}
                style={styles.categoryLabel}
              >
                CATEGORY
              </AtelierText>
              <View style={styles.categoryRow}>
                {categoryOptions.map((cat) => {
                  const isSelected = values.category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setFieldValue('category', cat)}
                      style={[
                        styles.categoryChip,
                        isSelected && styles.categoryChipSelected,
                      ]}
                    >
                      <AtelierText
                        variant="caption"
                        color={isSelected ? '#FFFFFF' : theme.colors.inkSecondary}
                      >
                        {cat}
                      </AtelierText>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.twoColumnRow}>
                <View style={styles.columnLeft}>
                  <AtelierInput
                    label="Price (PHP)"
                    placeholder="4500.00"
                    value={values.price}
                    onChangeText={handleChange('price')}
                    onBlur={handleBlur('price')}
                    keyboardType="numeric"
                    error={errors.price}
                    touched={touched.price}
                  />
                </View>
                <View style={styles.columnRight}>
                  <AtelierInput
                    label="Stock"
                    placeholder="10"
                    value={values.stock}
                    onChangeText={handleChange('stock')}
                    onBlur={handleBlur('stock')}
                    keyboardType="numeric"
                    error={errors.stock}
                    touched={touched.stock}
                  />
                </View>
              </View>

              <AtelierInput
                label="Description"
                placeholder="Enter product description, specifications, and materials..."
                value={values.description}
                onChangeText={handleChange('description')}
                onBlur={handleBlur('description')}
                multiline
                numberOfLines={4}
                error={errors.description}
                touched={touched.description}
              />

              <AtelierButton
                title={submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Product'}
                onPress={handleSubmit}
                loading={submitting}
                style={styles.submitButton}
              />
            </View>
          )}
        </Formik>
      </ScrollView>

      <AtelierBottomSheet
        visible={photoSheetVisible}
        onClose={() => setPhotoSheetVisible(false)}
        title="Add Product Photo"
        subtitle="Select up to 5 photos. First photo is shown as cover."
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
            onPress: () => setPhotoSheetVisible(false),
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
  scrollContent: {
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.hero,
  },
  sectionHeading: {
    marginBottom: theme.spacing.sm,
  },
  imageScroll: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  addImageTile: {
    width: 90,
    height: 90,
    borderRadius: theme.radii.xs,
    borderWidth: 1.5,
    borderColor: theme.colors.gold,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
  },
  imagePreviewWrapper: {
    width: 100,
    height: 100,
    borderRadius: theme.radii.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    position: 'relative',
  },
  primaryImageBorder: {
    borderColor: theme.colors.gold,
    borderWidth: 2,
  },
  coverBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(28, 25, 23, 0.8)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: theme.radii.xs,
  },
  coverBadgeText: {
    fontSize: 9,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeImageBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 4,
    backgroundColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(28, 25, 23, 0.72)',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  reorderBtn: {
    width: 26,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderBtnDisabled: {
    opacity: 0.3,
  },
  formContainer: {
    marginTop: theme.spacing.sm,
  },
  categoryLabel: {
    marginBottom: theme.spacing.xs,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.radii.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  categoryChipSelected: {
    backgroundColor: theme.colors.inkPrimary,
    borderColor: theme.colors.inkPrimary,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  columnLeft: {
    flex: 1,
  },
  columnRight: {
    flex: 1,
  },
  submitButton: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.hero,
  },
});

export default AdminProductFormScreen;
