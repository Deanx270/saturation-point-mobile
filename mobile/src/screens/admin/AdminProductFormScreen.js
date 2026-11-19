import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Image,
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
import AtelierPressable from '../../components/common/AtelierPressable';
import AtelierBottomSheet from '../../components/common/AtelierBottomSheet';
import AtelierHeader from '../../components/common/AtelierHeader';
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
import { submitFormWithScroll } from '../../utils/formScroll';
import { optimizeImageUrl } from '../../utils/formatters';

const DEFAULT_CATEGORIES = ['Fountain Pens', 'Inks', 'Paper'];

const normalizeLabel = (value) => String(value || '').trim().replace(/\s+/g, ' ');

const ProductSchema = Yup.object().shape({
  name: Yup.string().trim().required('Product name is required'),
  brand: Yup.string().trim().required('Brand is required'),
  category: Yup.string().trim().required('Category is required'),
  price: Yup.number()
    .typeError('Enter a valid price')
    .positive('Price must be greater than zero')
    .required('Price is required'),
  stock: Yup.number()
    .typeError('Enter a valid stock quantity')
    .min(0, 'Stock cannot be negative')
    .required('Stock is required'),
  description: Yup.string().trim().required('Description is required'),
});

export const AdminProductFormScreen = ({ route, navigation }) => {
  const { product, isEditing } = route.params || {};
  const dispatch = useDispatch();
  const scrollViewRef = useRef(null);
  const formTopRef = useRef(0);
  const fieldYRef = useRef({});
  const storeCategories = useSelector((state) => state.products.categories);
  const storeBrands = useSelector((state) => state.products.brands);

  const [images, setImages] = useState(product?.images || []);
  const [submitting, setSubmitting] = useState(false);
  const [photoSheetVisible, setPhotoSheetVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [brandSheetVisible, setBrandSheetVisible] = useState(false);
  const [brandQuery, setBrandQuery] = useState('');

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

  const brandOptions = useMemo(() => {
    const set = new Set((storeBrands || []).filter((b) => b && b !== 'All'));
    if (product?.brand) {
      set.add(product.brand);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [storeBrands, product?.brand]);

  const handlePickFromGallery = async () => {
    const selected = await pickImagesFromGallery({
      allowsMultipleSelection: false,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (selected.length > 0) {
      setImages((prev) => [...prev, selected[0]].slice(0, 5));
    }
  };

  const handleCaptureCamera = async () => {
    const captured = await captureImageWithCamera({
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (captured) {
      setImages((prev) => [...prev, captured].slice(0, 5));
    }
  };

  const handleRemoveImage = (index) => {
    setImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSetCoverImage = (index) => {
    if (index <= 0 || index >= images.length) {
      return;
    }
    setImages((prev) => {
      const target = prev[index];
      const remaining = prev.filter((_, idx) => idx !== index);
      return [target, ...remaining];
    });
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
      formData.append('name', normalizeLabel(values.name));
      formData.append('brand', normalizeLabel(values.brand));
      formData.append('category', normalizeLabel(values.category));
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
        dispatch(fetchProductFilters());
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
      <AtelierHeader
        title={isEditing ? 'Edit Product' : 'Add Product'}
        leftType="back"
        navigation={navigation}
      />

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <AtelierText
          variant="title2"
          style={styles.sectionHeading}
        >
          Product Images
        </AtelierText>
        <AtelierText
          variant="bodySmall"
          color={theme.colors.inkMuted}
          style={styles.imageHelperText}
        >
          First photo is the cover. Photos crop cleanly to 1:1 square; tap any photo to reorder.
        </AtelierText>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.imageScroll}
        >
          {images.length < 5 && (
            <AtelierPressable
              tone="surface"
              haptic="light"
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
            </AtelierPressable>
          )}

          {images.map((uri, idx) => (
            <AtelierPressable
              key={`${uri}_${idx}`}
              tone="none"
              haptic="selection"
              onPress={() => setSelectedImageIndex(idx)}
              style={[
                styles.imagePreviewWrapper,
                idx === 0 && styles.primaryImageBorder,
              ]}
              accessibilityLabel={
                idx === 0 ? 'Manage cover image' : `Manage product image ${idx + 1}`
              }
            >
              <Image
                source={{
                  uri: optimizeImageUrl(uri, {
                    width: 96,
                    crop: 'limit',
                  }),
                }}
                style={styles.previewImage}
              />
              {idx === 0 && (
                <View style={styles.coverBadge}>
                  <AtelierText
                    variant="caption"
                    color="#FFFFFF"
                    style={styles.coverBadgeText}
                  >
                    Cover
                  </AtelierText>
                </View>
              )}
              <AtelierPressable
                tone="solid"
                stopPropagation
                hitSlop={8}
                style={styles.removeImageBadge}
                onPress={() => handleRemoveImage(idx)}
                accessibilityLabel="Remove image"
              >
                <Ionicons
                  name="close"
                  size={14}
                  color="#FFFFFF"
                />
              </AtelierPressable>
            </AtelierPressable>
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
            setFieldTouched,
            validateForm,
            setTouched,
            values,
            errors,
            touched,
          }) => {
            const normalizedBrandQuery = normalizeLabel(brandQuery);
            const filteredBrands = brandOptions.filter((b) =>
              b.toLowerCase().includes(normalizedBrandQuery.toLowerCase())
            );
            const hasExactBrandMatch = brandOptions.some(
              (b) => b.toLowerCase() === normalizedBrandQuery.toLowerCase()
            );
            const selectBrandValue = (nextBrand) => {
              const clean = normalizeLabel(nextBrand);
              setFieldValue('brand', clean);
              setFieldTouched('brand', true, false);
              setBrandSheetVisible(false);
              setBrandQuery('');
            };

            return (
              <View
                style={styles.formContainer}
                onLayout={(e) => {
                  formTopRef.current = e.nativeEvent.layout.y;
                }}
              >
                <View
                  onLayout={(e) => {
                    fieldYRef.current.name =
                      formTopRef.current + e.nativeEvent.layout.y;
                  }}
                >
                  <AtelierInput
                    label="Product Name"
                    placeholder="e.g. Lamy Safari Fountain Pen"
                    value={values.name}
                    onChangeText={handleChange('name')}
                    onBlur={handleBlur('name')}
                    error={errors.name}
                    touched={touched.name}
                  />
                </View>

                <View
                  style={styles.brandFieldWrapper}
                  onLayout={(e) => {
                    fieldYRef.current.brand =
                      formTopRef.current + e.nativeEvent.layout.y;
                  }}
                >
                  <AtelierText
                    variant="caption"
                    color={theme.colors.inkSecondary}
                    style={styles.brandFieldLabel}
                  >
                    Brand
                  </AtelierText>
                  <AtelierPressable
                    tone="surface"
                    onPress={() => {
                      setBrandQuery('');
                      setBrandSheetVisible(true);
                    }}
                    style={[
                      styles.brandSelectorBox,
                      touched.brand && errors.brand && styles.brandSelectorError,
                    ]}
                    accessibilityLabel="Select product brand"
                  >
                    <AtelierText
                      variant="bodyMedium"
                      color={
                        values.brand
                          ? theme.colors.inkPrimary
                          : theme.colors.inkMuted
                      }
                      numberOfLines={1}
                      style={styles.brandSelectorText}
                    >
                      {values.brand || 'Select or add brand...'}
                    </AtelierText>
                    <Ionicons
                      name="chevron-down"
                      size={18}
                      color={theme.colors.inkMuted}
                    />
                  </AtelierPressable>
                  {touched.brand && errors.brand ? (
                    <AtelierText
                      variant="bodySmall"
                      color={theme.colors.error}
                      style={styles.fieldErrorText}
                    >
                      {errors.brand}
                    </AtelierText>
                  ) : null}
                </View>

                <AtelierText
                  variant="caption"
                  color={theme.colors.inkSecondary}
                  style={styles.categoryLabel}
                >
                  Category
                </AtelierText>
                <View style={styles.categoryRow}>
                  {categoryOptions.map((cat) => {
                    const isSelected = values.category === cat;
                    return (
                      <AtelierPressable
                        key={cat}
                        tone={isSelected ? 'solid' : 'surface'}
                        haptic="selection"
                        hitSlop={4}
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
                      </AtelierPressable>
                    );
                  })}
                </View>

                <View
                  style={styles.twoColumnRow}
                  onLayout={(e) => {
                    const rowY = formTopRef.current + e.nativeEvent.layout.y;
                    fieldYRef.current.price = rowY;
                    fieldYRef.current.stock = rowY;
                  }}
                >
                  <View style={styles.columnLeft}>
                    <AtelierInput
                      label="Price (₱)"
                      prefix="₱"
                      placeholder="e.g. 4500.00"
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
                      placeholder="e.g. 10"
                      value={values.stock}
                      onChangeText={handleChange('stock')}
                      onBlur={handleBlur('stock')}
                      keyboardType="numeric"
                      error={errors.stock}
                      touched={touched.stock}
                    />
                  </View>
                </View>

                <View
                  onLayout={(e) => {
                    fieldYRef.current.description =
                      formTopRef.current + e.nativeEvent.layout.y;
                  }}
                >
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
                </View>

                <AtelierButton
                  title={submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Product'}
                  onPress={() =>
                    submitFormWithScroll({
                      validateForm,
                      setTouched,
                      handleSubmit,
                      scrollViewRef,
                      yPositions: fieldYRef.current,
                      fieldOrder: [
                        'name',
                        'brand',
                        'price',
                        'stock',
                        'description',
                      ],
                    })
                  }
                  loading={submitting}
                  style={styles.submitButton}
                />

                <AtelierBottomSheet
                  visible={brandSheetVisible}
                  onClose={() => {
                    setFieldTouched('brand', true, false);
                    setBrandSheetVisible(false);
                  }}
                  title="Select Brand"
                  subtitle="Choose an existing maker or add a new brand name."
                  maxHeight="76%"
                >
                  <AtelierInput
                    placeholder="Search or enter new brand..."
                    value={brandQuery}
                    onChangeText={setBrandQuery}
                    autoCapitalize="words"
                    rightIcon={brandQuery.length > 0 ? 'close-circle' : undefined}
                    onRightIconPress={() => setBrandQuery('')}
                    rightIconAccessibilityLabel="Clear brand search"
                    style={styles.brandSearchInput}
                  />
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    style={styles.brandPickerScroll}
                  >
                    {normalizedBrandQuery.length > 0 && !hasExactBrandMatch ? (
                      <AtelierPressable
                        tone="surface"
                        haptic="selection"
                        onPress={() => selectBrandValue(normalizedBrandQuery)}
                        style={[styles.brandOptionRow, styles.brandCreateRow]}
                      >
                        <View style={styles.brandOptionLeft}>
                          <Ionicons
                            name="add-circle-outline"
                            size={20}
                            color={theme.colors.goldText}
                          />
                          <AtelierText
                            variant="bodyMedium"
                            color={theme.colors.goldText}
                            style={styles.brandCreateText}
                          >
                            {`Use "${normalizedBrandQuery}"`}
                          </AtelierText>
                        </View>
                      </AtelierPressable>
                    ) : null}

                    {filteredBrands.map((brandName) => {
                      const isSelected = values.brand === brandName;
                      return (
                        <AtelierPressable
                          key={brandName}
                          tone="surface"
                          haptic="selection"
                          onPress={() => selectBrandValue(brandName)}
                          style={[
                            styles.brandOptionRow,
                            isSelected && styles.brandOptionRowSelected,
                          ]}
                        >
                          <AtelierText
                            variant="bodyMedium"
                            color={
                              isSelected
                                ? theme.colors.goldText
                                : theme.colors.inkPrimary
                            }
                            style={isSelected ? styles.brandSelectedText : undefined}
                          >
                            {brandName}
                          </AtelierText>
                          {isSelected ? (
                            <Ionicons
                              name="checkmark"
                              size={18}
                              color={theme.colors.goldText}
                            />
                          ) : null}
                        </AtelierPressable>
                      );
                    })}
                  </ScrollView>
                </AtelierBottomSheet>
              </View>
            );
          }}
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
        ]}
      />

      <AtelierBottomSheet
        visible={selectedImageIndex !== null && Boolean(images[selectedImageIndex])}
        onClose={() => setSelectedImageIndex(null)}
        title="Manage Product Photo"
        subtitle={
          selectedImageIndex === 0
            ? 'This photo is currently the product cover.'
            : 'Promote to cover, reorder, or remove this photo.'
        }
        options={
          selectedImageIndex !== null
            ? [
                ...(selectedImageIndex > 0
                  ? [
                      {
                        key: 'cover',
                        label: 'Set as Cover Photo',
                        icon: 'star-outline',
                        onPress: () => handleSetCoverImage(selectedImageIndex),
                      },
                      {
                        key: 'left',
                        label: 'Move Left',
                        icon: 'arrow-back-outline',
                        onPress: () => handleMoveImage(selectedImageIndex, -1),
                      },
                    ]
                  : []),
                ...(selectedImageIndex < images.length - 1
                  ? [
                      {
                        key: 'right',
                        label: 'Move Right',
                        icon: 'arrow-forward-outline',
                        onPress: () => handleMoveImage(selectedImageIndex, 1),
                      },
                    ]
                  : []),
                {
                  key: 'remove',
                  label: 'Remove Photo',
                  icon: 'trash-outline',
                  destructive: true,
                  onPress: () => handleRemoveImage(selectedImageIndex),
                },
              ]
            : []
        }
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
  sectionHeading: {
    marginBottom: theme.spacing.xs,
  },
  imageHelperText: {
    marginBottom: theme.spacing.sm,
  },
  imageScroll: {
    gap: theme.spacing.sm,
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  addImageTile: {
    width: 96,
    height: 96,
    borderRadius: theme.radii.xs,
    borderWidth: 1.5,
    borderColor: theme.colors.gold,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    overflow: 'hidden',
  },
  imagePreviewWrapper: {
    width: 96,
    height: 96,
    borderRadius: theme.radii.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    position: 'relative',
  },
  primaryImageBorder: {
    borderColor: theme.colors.gold,
    borderWidth: 1.5,
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
    borderRadius: theme.radii.xs,
    backgroundColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  brandFieldWrapper: {
    marginBottom: theme.spacing.lg,
  },
  brandFieldLabel: {
    marginBottom: theme.spacing.xs,
  },
  brandSelectorBox: {
    minHeight: theme.touchTarget.minHeight,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    overflow: 'hidden',
  },
  brandSelectorError: {
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.errorBg,
  },
  brandSelectorText: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  fieldErrorText: {
    marginTop: theme.spacing.xs,
  },
  brandSearchInput: {
    marginBottom: theme.spacing.sm,
  },
  brandPickerScroll: {
    maxHeight: 280,
  },
  brandOptionRow: {
    minHeight: theme.touchTarget.minHeight,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
    overflow: 'hidden',
  },
  brandOptionRowSelected: {
    borderColor: theme.colors.gold,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  brandCreateRow: {
    borderColor: theme.colors.gold,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  brandOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  brandCreateText: {
    fontFamily: 'Montserrat_600SemiBold',
  },
  brandSelectedText: {
    fontFamily: 'Montserrat_600SemiBold',
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
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSubtle,
    overflow: 'hidden',
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
