import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import AtelierText from '../../components/common/AtelierText';
import AtelierInput from '../../components/common/AtelierInput';
import AtelierButton from '../../components/common/AtelierButton';
import AtelierCard from '../../components/common/AtelierCard';
import AtelierPressable from '../../components/common/AtelierPressable';
import AtelierHeader from '../../components/common/AtelierHeader';
import AtelierBottomSheet from '../../components/common/AtelierBottomSheet';
import apiClient from '../../api/client';
import { fetchProducts } from '../../redux/productsSlice';
import { formatPrice, isValidRemoteOrLocalUri } from '../../utils/formatters';

const PromoSchema = Yup.object().shape({
  title: Yup.string().trim().required('Notification title is required'),
  body: Yup.string().trim().required('Notification message is required'),
  discountPercent: Yup.number()
    .typeError('Enter a valid percentage')
    .min(1, 'Minimum 1%')
    .max(99, 'Maximum 99%')
    .required('Discount percentage is required'),
});

export const AdminPromotionsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { adminItems, items } = useSelector((state) => state.products);
  const productOptions = useMemo(
    () => (adminItems.length > 0 ? adminItems : items),
    [adminItems, items]
  );
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [productQuery, setProductQuery] = useState('');
  const [productError, setProductError] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);

  useEffect(() => {
    if (productOptions.length < 20) {
      dispatch(fetchProducts({ target: 'admin', page: 1, limit: 50 }));
    }
  }, [dispatch, productOptions.length]);

  useEffect(() => {
    if (selectedProductIds.length === 0 && productOptions.length > 0) {
      setSelectedProductIds([productOptions[0]._id]);
    }
  }, [productOptions, selectedProductIds.length]);

  const selectedProducts = useMemo(() => {
    const map = new Map(productOptions.map((item) => [item._id, item]));
    return selectedProductIds.map((id) => map.get(id)).filter(Boolean);
  }, [productOptions, selectedProductIds]);

  const filteredProducts = useMemo(() => {
    const clean = productQuery.trim().toLowerCase();
    if (!clean) {
      return productOptions;
    }
    return productOptions.filter(
      (item) =>
        item.name?.toLowerCase().includes(clean) ||
        item.brand?.toLowerCase().includes(clean) ||
        item.category?.toLowerCase().includes(clean)
    );
  }, [productOptions, productQuery]);

  const toggleProductSelection = (id) => {
    setProductError('');
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const removeSelectedProduct = (id) => {
    setSelectedProductIds((prev) => prev.filter((itemId) => itemId !== id));
  };

  const getSelectionSummary = () => {
    if (selectedProducts.length === 0) {
      return 'Select featured products...';
    }
    if (selectedProducts.length === 1) {
      return selectedProducts[0].name;
    }
    return `${selectedProducts.length} products selected`;
  };

  const getCampaignHint = () => {
    if (selectedProducts.length === 0) {
      return 'Choose 1 item for a direct product link, or 2+ items for a curated sale list.';
    }
    if (selectedProducts.length === 1) {
      return 'Tapping this notification opens the selected product directly.';
    }
    return `Tapping this notification opens a curated sale list of ${selectedProducts.length} products.`;
  };

  const handleBroadcast = async (values, { resetForm }) => {
    if (selectedProductIds.length === 0) {
      setProductError('Select at least one featured product');
      return;
    }

    setProductError('');
    setBroadcasting(true);
    try {
      const response = await apiClient.post('/promotions/broadcast', {
        title: values.title.trim(),
        body: values.body.trim(),
        discountPercent: Number(values.discountPercent),
        productIds: selectedProductIds,
      });

      Alert.alert(
        'Notification Sent',
        response.data?.message || 'Promotional notification sent to registered users.'
      );
      resetForm();
    } catch (error) {
      Alert.alert(
        'Send Failed',
        error.response?.data?.message || 'Unable to send notification.'
      );
    } finally {
      setBroadcasting(false);
    }
  };

  return (
    <View style={styles.container}>
      <AtelierHeader
        title="Send Promotions"
        leftType={navigation.canGoBack() ? 'back' : 'drawer'}
        navigation={navigation}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <AtelierCard
          subtle
          style={styles.infoCard}
        >
          <AtelierText
            variant="caption"
            color={theme.colors.goldText}
            style={styles.infoLabel}
          >
            Promotional Notifications
          </AtelierText>
          <AtelierText
            variant="bodyMedium"
            color={theme.colors.inkSecondary}
            style={styles.infoText}
          >
            Send targeted campaign alerts to signed-in customers with a single featured product or curated multi-item sale.
          </AtelierText>
        </AtelierCard>

        <Formik
          initialValues={{
            title: '',
            body: '',
            discountPercent: '15',
          }}
          validationSchema={PromoSchema}
          onSubmit={handleBroadcast}
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
                label="Title"
                placeholder="e.g. Weekend Ink Sale"
                value={values.title}
                onChangeText={handleChange('title')}
                onBlur={handleBlur('title')}
                error={errors.title}
                touched={touched.title}
              />

              <AtelierInput
                label="Message"
                placeholder="e.g. Save 15% on archival inks and fountain pens this weekend."
                value={values.body}
                onChangeText={handleChange('body')}
                onBlur={handleBlur('body')}
                multiline
                numberOfLines={3}
                error={errors.body}
                touched={touched.body}
              />

              <AtelierInput
                label="Discount (%)"
                placeholder="e.g. 15"
                value={values.discountPercent}
                onChangeText={handleChange('discountPercent')}
                onBlur={handleBlur('discountPercent')}
                keyboardType="numeric"
                error={errors.discountPercent}
                touched={touched.discountPercent}
              />

              <View style={styles.selectorWrapper}>
                <AtelierText
                  variant="caption"
                  color={theme.colors.inkSecondary}
                  style={styles.pickerLabel}
                >
                  Featured Products
                </AtelierText>

                <AtelierPressable
                  tone="surface"
                  onPress={() => {
                    setProductQuery('');
                    setPickerVisible(true);
                  }}
                  style={[
                    styles.selectorBox,
                    productError ? styles.selectorBoxError : null,
                  ]}
                  accessibilityLabel="Select featured products"
                >
                  <AtelierText
                    variant="bodyMedium"
                    color={
                      selectedProducts.length > 0
                        ? theme.colors.inkPrimary
                        : theme.colors.inkMuted
                    }
                    numberOfLines={1}
                    style={styles.selectorText}
                  >
                    {getSelectionSummary()}
                  </AtelierText>
                  <Ionicons
                    name="chevron-down"
                    size={18}
                    color={theme.colors.inkMuted}
                  />
                </AtelierPressable>

                {productError ? (
                  <AtelierText
                    variant="bodySmall"
                    color={theme.colors.error}
                    style={styles.fieldErrorText}
                  >
                    {productError}
                  </AtelierText>
                ) : (
                  <AtelierText
                    variant="bodySmall"
                    color={theme.colors.inkMuted}
                    style={styles.helperText}
                  >
                    {getCampaignHint()}
                  </AtelierText>
                )}

                {selectedProducts.length > 0 ? (
                  <View style={styles.selectedChipsWrap}>
                    {selectedProducts.map((prod) => (
                      <View
                        key={prod._id}
                        style={styles.selectedChip}
                      >
                        <AtelierText
                          variant="caption"
                          color={theme.colors.inkPrimary}
                          numberOfLines={1}
                          style={styles.selectedChipText}
                        >
                          {prod.name}
                        </AtelierText>
                        <AtelierPressable
                          tone="none"
                          hitSlop={6}
                          onPress={() => removeSelectedProduct(prod._id)}
                          accessibilityLabel={`Remove ${prod.name}`}
                          style={styles.selectedChipRemove}
                        >
                          <Ionicons
                            name="close"
                            size={14}
                            color={theme.colors.inkMuted}
                          />
                        </AtelierPressable>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>

              <AtelierButton
                title={broadcasting ? 'Sending...' : 'Send Notification'}
                onPress={handleSubmit}
                loading={broadcasting}
                variant="gold"
                style={styles.submitButton}
              />
            </View>
          )}
        </Formik>
      </ScrollView>

      <AtelierBottomSheet
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        title="Select Featured Products"
        subtitle="Pick 1 item for a product view, or multiple items for a sale collection."
        maxHeight="80%"
        footer={
          <View style={styles.sheetFooterActions}>
            <AtelierButton
              title="Clear"
              variant="outline"
              singleLine
              onPress={() => setSelectedProductIds([])}
              style={styles.sheetFooterBtn}
            />
            <AtelierButton
              title={
                selectedProductIds.length > 0
                  ? `Done (${selectedProductIds.length})`
                  : 'Done'
              }
              singleLine
              onPress={() => setPickerVisible(false)}
              style={styles.sheetFooterBtn}
            />
          </View>
        }
      >
        <AtelierInput
          placeholder="Search products by name or brand..."
          value={productQuery}
          onChangeText={setProductQuery}
          rightIcon={productQuery.length > 0 ? 'close-circle' : undefined}
          onRightIconPress={() => setProductQuery('')}
          rightIconAccessibilityLabel="Clear product search"
          style={styles.sheetSearchInput}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={styles.sheetListScroll}
        >
          {filteredProducts.length === 0 ? (
            <AtelierText
              variant="bodySmall"
              color={theme.colors.inkMuted}
              style={styles.emptyFilterText}
            >
              No products match your search.
            </AtelierText>
          ) : (
            filteredProducts.map((prod) => {
              const isSelected = selectedProductIds.includes(prod._id);
              const thumb = prod.images?.[0];
              const hasThumb = isValidRemoteOrLocalUri(thumb);

              return (
                <AtelierPressable
                  key={prod._id}
                  tone="surface"
                  haptic="selection"
                  onPress={() => toggleProductSelection(prod._id)}
                  style={[
                    styles.productRow,
                    isSelected && styles.productRowSelected,
                  ]}
                >
                  {hasThumb ? (
                    <Image
                      source={{ uri: thumb }}
                      style={styles.productRowThumb}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.productRowThumb, styles.productRowThumbPlaceholder]}>
                      <Ionicons
                        name="image-outline"
                        size={18}
                        color={theme.colors.inkMuted}
                      />
                    </View>
                  )}

                  <View style={styles.productRowInfo}>
                    <AtelierText
                      variant="caption"
                      color={theme.colors.goldText}
                      numberOfLines={1}
                    >
                      {prod.brand}
                    </AtelierText>
                    <AtelierText
                      variant="bodyMedium"
                      color={theme.colors.inkPrimary}
                      numberOfLines={1}
                      style={styles.productRowName}
                    >
                      {prod.name}
                    </AtelierText>
                    <AtelierText
                      variant="bodySmall"
                      color={theme.colors.inkMuted}
                    >
                      {formatPrice(prod.price)}
                    </AtelierText>
                  </View>

                  <Ionicons
                    name={isSelected ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={isSelected ? theme.colors.goldText : theme.colors.inkMuted}
                  />
                </AtelierPressable>
              );
            })
          )}
        </ScrollView>
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
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.hero,
  },
  infoCard: {
    marginBottom: theme.spacing.xl,
  },
  infoLabel: {
    marginBottom: theme.spacing.xs,
  },
  infoText: {
    lineHeight: 20,
  },
  formContainer: {
    marginTop: theme.spacing.xs,
  },
  selectorWrapper: {
    marginBottom: theme.spacing.lg,
  },
  pickerLabel: {
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  selectorBox: {
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
  selectorBoxError: {
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.errorBg,
  },
  selectorText: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  fieldErrorText: {
    marginTop: theme.spacing.xs,
  },
  helperText: {
    marginTop: theme.spacing.xs,
  },
  selectedChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    maxWidth: '100%',
    paddingVertical: 5,
    paddingLeft: 10,
    paddingRight: 6,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectedChipText: {
    flexShrink: 1,
    fontSize: 11,
  },
  selectedChipRemove: {
    padding: 2,
  },
  submitButton: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.hero,
  },
  sheetSearchInput: {
    marginBottom: theme.spacing.sm,
  },
  sheetListScroll: {
    maxHeight: 320,
  },
  emptyFilterText: {
    textAlign: 'center',
    paddingVertical: theme.spacing.xl,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.xs,
    gap: theme.spacing.md,
    overflow: 'hidden',
  },
  productRowSelected: {
    borderColor: theme.colors.gold,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  productRowThumb: {
    width: 44,
    height: 44,
    borderRadius: theme.radii.xs,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  productRowThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  productRowInfo: {
    flex: 1,
    minWidth: 0,
  },
  productRowName: {
    fontFamily: 'Montserrat_500Medium',
  },
  sheetFooterActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  sheetFooterBtn: {
    flex: 1,
  },
});

export default AdminPromotionsScreen;
