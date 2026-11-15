import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { Formik } from 'formik';
import * as Yup from 'yup';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import AtelierText from '../../components/common/AtelierText';
import AtelierInput from '../../components/common/AtelierInput';
import AtelierButton from '../../components/common/AtelierButton';
import { createProduct, updateProduct } from '../../redux/productsSlice';

const PRODUCT_CATEGORIES = ['Fountain Pens', 'Inks', 'Paper'];

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

  const [images, setImages] = useState(product?.images || []);
  const [submitting, setSubmitting] = useState(false);

  const handlePickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Gallery access is needed to select product photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length > 0) {
      const newUris = result.assets.map((asset) => asset.uri);
      setImages([...images, ...newUris]);
    }
  };

  const handleCaptureCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Camera access is needed to take a product photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length > 0) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  const showImagePickerOptions = () => {
    Alert.alert(
      'Add Product Photo',
      'Choose an image source:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Choose from Gallery', onPress: handlePickFromGallery },
        { text: 'Take Photo', onPress: handleCaptureCamera },
      ]
    );
  };

  const handleRemoveImage = (index) => {
    const updated = [...images];
    updated.splice(index, 1);
    setImages(updated);
  };

  const handleFormSubmit = async (values) => {
    setSubmitting(true);

    const payload = {
      ...values,
      price: Number(values.price),
      stock: Number(values.stock),
      images,
    };

    let resultAction;
    if (isEditing) {
      resultAction = await dispatch(
        updateProduct({ productId: product._id, productData: payload })
      );
    } else {
      resultAction = await dispatch(createProduct(payload));
    }

    setSubmitting(false);

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
          <TouchableOpacity
            style={styles.addImageTile}
            onPress={showImagePickerOptions}
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

          {images.map((uri, idx) => (
            <View
              key={idx}
              style={styles.imagePreviewWrapper}
            >
              <Image
                source={{ uri }}
                style={styles.previewImage}
              />
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
            </View>
          ))}
        </ScrollView>

        <Formik
          initialValues={{
            name: product?.name || '',
            brand: product?.brand || '',
            category: product?.category || 'Fountain Pens',
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
                {PRODUCT_CATEGORIES.map((cat) => {
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
    width: 90,
    height: 90,
    borderRadius: theme.radii.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeImageBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
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
