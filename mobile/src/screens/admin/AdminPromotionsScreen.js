import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Image,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import AtelierText from '../../components/common/AtelierText';
import AtelierInput from '../../components/common/AtelierInput';
import AtelierButton from '../../components/common/AtelierButton';
import AtelierCard from '../../components/common/AtelierCard';
import AtelierBadge from '../../components/common/AtelierBadge';
import AtelierPressable from '../../components/common/AtelierPressable';
import AtelierHeader from '../../components/common/AtelierHeader';
import AtelierBottomSheet from '../../components/common/AtelierBottomSheet';
import AtelierToast from '../../components/common/AtelierToast';
import AtelierErrorBanner from '../../components/common/AtelierErrorBanner';
import apiClient from '../../api/client';
import {
  fetchProducts,
  fetchActivePromotions,
} from '../../redux/productsSlice';
import {
  formatPrice,
  formatDate,
  isValidRemoteOrLocalUri,
  optimizeImageUrl,
} from '../../utils/formatters';
import { submitFormWithScroll } from '../../utils/formScroll';

const DURATION_OPTIONS = [
  { label: '1 Day', days: 1 },
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
];

const PromoSchema = Yup.object().shape({
  title: Yup.string().trim().required('Notification title is required'),
  body: Yup.string().trim().required('Notification message is required'),
  discountPercent: Yup.number()
    .typeError('Enter a valid percentage')
    .min(1, 'Minimum 1%')
    .max(99, 'Maximum 99%')
    .required('Discount percentage is required'),
  customDays: Yup.number().when('durationMode', {
    is: 'custom',
    then: (schema) =>
      schema
        .typeError('Enter valid whole days')
        .integer('Enter whole days')
        .min(1, 'Minimum 1 day')
        .max(90, 'Maximum 90 days')
        .required('Custom duration is required'),
    otherwise: (schema) => schema.notRequired(),
  }),
});

export const AdminPromotionsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const scrollViewRef = useRef(null);
  const formTopRef = useRef(0);
  const fieldYRef = useRef({});
  const { adminItems, items, activePromotions } = useSelector(
    (state) => state.products
  );
  const productOptions = useMemo(
    () => (adminItems.length > 0 ? adminItems : items),
    [adminItems, items]
  );
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [productQuery, setProductQuery] = useState('');
  const [productError, setProductError] = useState('');
  const [actionError, setActionError] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [endingPromoId, setEndingPromoId] = useState(null);
  const [endPromoTarget, setEndPromoTarget] = useState(null);
  const [toastState, setToastState] = useState({
    visible: false,
    message: '',
    key: 0,
  });

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchActivePromotions());
    }, [dispatch])
  );

  useEffect(() => {
    if (productOptions.length < 20) {
      dispatch(fetchProducts({ target: 'admin', page: 1, limit: 50 }));
    }
  }, [dispatch, productOptions.length]);

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

  const showToast = (message) => {
    setToastState({
      visible: true,
      message,
      key: Date.now(),
    });
  };

  const resolveEffectiveDays = (values) => {
    if (values.durationMode === 'custom') {
      const parsed = parseInt(String(values.customDays || '').trim(), 10);
      return Number.isNaN(parsed) ? 7 : parsed;
    }
    return values.presetDays || 7;
  };

  const getCampaignHint = (values) => {
    const activeDays = resolveEffectiveDays(values);
    const durationLabel = `${activeDays} ${activeDays === 1 ? 'day' : 'days'}`;
    if (selectedProducts.length === 0) {
      return `Lasts ${durationLabel} and replaces any overlapping promo on selected items.`;
    }
    if (selectedProducts.length === 1) {
      return `Opens product view directly; ${durationLabel} campaign replaces overlaps.`;
    }
    return `Opens ${selectedProducts.length} featured items; ${durationLabel} campaign replaces overlaps.`;
  };

  const handleBroadcast = async (values, { resetForm }) => {
    if (selectedProductIds.length === 0) {
      setProductError('Select at least one featured product');
      return;
    }

    const effectiveDays = resolveEffectiveDays(values);
    setProductError('');
    setActionError('');
    setBroadcasting(true);
    try {
      const response = await apiClient.post('/promotions/broadcast', {
        title: values.title.trim(),
        body: values.body.trim(),
        discountPercent: Number(values.discountPercent),
        durationDays: effectiveDays,
        productIds: selectedProductIds,
      });

      await Promise.all([
        dispatch(fetchActivePromotions()),
        dispatch(fetchProducts({ target: 'shop', page: 1, limit: 8 })),
      ]);
      resetForm();
      setSelectedProductIds([]);
      showToast(
        response.data?.message || 'Promotion saved and notification dispatched.'
      );
    } catch (error) {
      setActionError(
        error.response?.data?.message || 'Unable to send notification.'
      );
    } finally {
      setBroadcasting(false);
    }
  };

  const handleEndPromotion = (promo) => {
    setActionError('');
    setEndPromoTarget(promo);
  };

  const handleConfirmEndPromotion = async () => {
    const promo = endPromoTarget;
    if (!promo?._id || endingPromoId) {
      return;
    }
    setEndPromoTarget(null);
    setEndingPromoId(promo._id);
    setActionError('');
    try {
      await apiClient.delete(`/promotions/${promo._id}`);
      await Promise.all([
        dispatch(fetchActivePromotions()),
        dispatch(fetchProducts({ target: 'shop', page: 1, limit: 8 })),
      ]);
      showToast(`"${promo.title}" ended. Regular pricing restored.`);
    } catch (error) {
      setActionError(
        error.response?.data?.message || 'Unable to end promotion.'
      );
    } finally {
      setEndingPromoId(null);
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
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <AtelierCard style={styles.infoCard}>
          <AtelierText
            variant="caption"
            color={theme.colors.goldText}
            style={styles.infoLabel}
          >
            Promotional Notifications
          </AtelierText>
          <AtelierText
            variant="bodySmall"
            color={theme.colors.inkSecondary}
            style={styles.infoText}
          >
            Send push alerts for a featured product or curated sale.
          </AtelierText>
        </AtelierCard>

        {actionError ? (
          <AtelierErrorBanner
            message={actionError}
            style={styles.actionErrorBanner}
          />
        ) : null}

        <Formik
          initialValues={{
            title: '',
            body: '',
            discountPercent: '15',
            durationMode: 'preset',
            presetDays: 7,
            customDays: '14',
          }}
          validationSchema={PromoSchema}
          onSubmit={handleBroadcast}
        >
          {({
            handleChange,
            handleBlur,
            setFieldValue,
            setErrors,
            setTouched,
            setSubmitting,
            resetForm,
            values,
            errors,
            touched,
            isSubmitting,
          }) => (
            <View
              style={styles.formContainer}
              onLayout={(e) => {
                formTopRef.current = e.nativeEvent.layout.y;
              }}
            >
              <View
                onLayout={(e) => {
                  fieldYRef.current.title = formTopRef.current + e.nativeEvent.layout.y;
                }}
              >
                <AtelierInput
                  label="Title"
                  placeholder="e.g. Weekend Ink Sale"
                  value={values.title}
                  onChangeText={handleChange('title')}
                  onBlur={handleBlur('title')}
                  error={errors.title}
                  touched={touched.title}
                />
              </View>

              <View
                onLayout={(e) => {
                  fieldYRef.current.body = formTopRef.current + e.nativeEvent.layout.y;
                }}
              >
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
              </View>

              <View
                onLayout={(e) => {
                  fieldYRef.current.discountPercent =
                    formTopRef.current + e.nativeEvent.layout.y;
                }}
              >
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
              </View>

              <View
                style={styles.durationWrapper}
                onLayout={(e) => {
                  fieldYRef.current.customDays =
                    formTopRef.current + e.nativeEvent.layout.y;
                }}
              >
                <AtelierText
                  variant="caption"
                  color={theme.colors.inkSecondary}
                  style={styles.pickerLabel}
                >
                  Campaign Duration
                </AtelierText>
                <View style={styles.durationChipsRow}>
                  {DURATION_OPTIONS.map((option) => {
                    const isSelected =
                      values.durationMode === 'preset' &&
                      values.presetDays === option.days;
                    return (
                      <AtelierPressable
                        key={option.days}
                        tone={isSelected ? 'solid' : 'surface'}
                        haptic="selection"
                        hitSlop={4}
                        onPress={() => {
                          setFieldValue('durationMode', 'preset');
                          setFieldValue('presetDays', option.days);
                        }}
                        style={[
                          styles.durationChip,
                          isSelected && styles.durationChipSelected,
                        ]}
                      >
                        <AtelierText
                          variant="caption"
                          color={
                            isSelected ? '#FFFFFF' : theme.colors.inkSecondary
                          }
                        >
                          {option.label}
                        </AtelierText>
                      </AtelierPressable>
                    );
                  })}
                  <AtelierPressable
                    tone={values.durationMode === 'custom' ? 'solid' : 'surface'}
                    haptic="selection"
                    hitSlop={4}
                    onPress={() => setFieldValue('durationMode', 'custom')}
                    style={[
                      styles.durationChip,
                      values.durationMode === 'custom' &&
                        styles.durationChipSelected,
                    ]}
                  >
                    <AtelierText
                      variant="caption"
                      color={
                        values.durationMode === 'custom'
                          ? '#FFFFFF'
                          : theme.colors.inkSecondary
                      }
                    >
                      Custom
                    </AtelierText>
                  </AtelierPressable>
                </View>

                {values.durationMode === 'custom' ? (
                  <AtelierInput
                    label="Custom Duration (Days)"
                    placeholder="e.g. 14"
                    helperText="Enter between 1 and 90 days"
                    value={values.customDays}
                    onChangeText={(text) =>
                      setFieldValue('customDays', text.replace(/[^0-9]/g, ''))
                    }
                    onBlur={handleBlur('customDays')}
                    keyboardType="number-pad"
                    maxLength={2}
                    error={errors.customDays}
                    touched={touched.customDays}
                    style={styles.customDaysInput}
                  />
                ) : null}
              </View>

              <View
                style={styles.selectorWrapper}
                onLayout={(e) => {
                  fieldYRef.current.products =
                    formTopRef.current + e.nativeEvent.layout.y;
                }}
              >
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

                {selectedProducts.length > 0 ? (
                  <View style={styles.selectedListCard}>
                    {selectedProducts.map((prod, idx) => (
                      <View key={prod._id}>
                        {idx > 0 ? <View style={styles.selectedItemDivider} /> : null}
                        <View style={styles.selectedItemRow}>
                          <AtelierText
                            variant="bodyMedium"
                            color={theme.colors.inkPrimary}
                            numberOfLines={1}
                            style={styles.selectedItemText}
                          >
                            {prod.name}
                          </AtelierText>
                          <AtelierPressable
                            tone="subtle"
                            hitSlop={6}
                            onPress={() => removeSelectedProduct(prod._id)}
                            accessibilityLabel={`Remove ${prod.name}`}
                            style={styles.selectedItemRemove}
                          >
                            <Ionicons
                              name="close"
                              size={16}
                              color={theme.colors.inkMuted}
                            />
                          </AtelierPressable>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}

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
                    {getCampaignHint(values)}
                  </AtelierText>
                )}
              </View>

              <AtelierButton
                title={
                  broadcasting || isSubmitting
                    ? 'Sending...'
                    : 'Send Notification'
                }
                onPress={() =>
                  submitFormWithScroll({
                    schema: PromoSchema,
                    values,
                    setErrors,
                    setTouched,
                    setSubmitting,
                    resetForm,
                    onSubmit: handleBroadcast,
                    scrollViewRef,
                    yPositions: fieldYRef.current,
                    fieldOrder: [
                      'title',
                      'body',
                      'discountPercent',
                      'customDays',
                      'products',
                    ],
                    onBeforeValidate: () => {
                      if (selectedProductIds.length === 0) {
                        setProductError('Select at least one featured product');
                        return { products: 'Required' };
                      }
                      setProductError('');
                      return {};
                    },
                  })
                }
                loading={broadcasting || isSubmitting}
                style={styles.submitButton}
              />
            </View>
          )}
        </Formik>

        {activePromotions.length > 0 ? (
          <View style={styles.activeSection}>
            <AtelierText
              variant="title2"
              style={styles.activeSectionTitle}
            >
              Active Promotions
            </AtelierText>
            {activePromotions.map((promo) => {
              const itemCount = Array.isArray(promo.productIds)
                ? promo.productIds.length
                : 0;
              const isEnding = endingPromoId === promo._id;
              return (
                <AtelierCard
                  key={promo._id}
                  style={styles.activePromoCard}
                >
                  <View style={styles.activePromoRow}>
                    <View style={styles.activePromoInfo}>
                      <View style={styles.activePromoTitleRow}>
                        <AtelierText
                          variant="bodyMedium"
                          color={theme.colors.inkPrimary}
                          numberOfLines={1}
                          style={styles.activePromoName}
                        >
                          {promo.title}
                        </AtelierText>
                        <AtelierBadge
                          label={`${promo.discountPercent}% OFF`}
                          status="gold"
                        />
                      </View>
                      <AtelierText
                        variant="bodySmall"
                        color={theme.colors.inkMuted}
                      >
                        {`${itemCount} ${itemCount === 1 ? 'item' : 'items'} • Ends ${formatDate(promo.expiresAt)}`}
                      </AtelierText>
                    </View>
                    <AtelierPressable
                      tone="subtle"
                      hitSlop={6}
                      disabled={isEnding}
                      onPress={() => handleEndPromotion(promo)}
                      style={styles.endPromoAction}
                    >
                      <AtelierText
                        variant="caption"
                        color={theme.colors.error}
                      >
                        {isEnding ? 'Ending...' : 'End'}
                      </AtelierText>
                    </AtelierPressable>
                  </View>
                </AtelierCard>
              );
            })}
          </View>
        ) : null}
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
                      source={{
                        uri: optimizeImageUrl(thumb, {
                          width: 44,
                          height: 44,
                          crop: 'fill',
                        }),
                      }}
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

      <AtelierBottomSheet
        visible={Boolean(endPromoTarget)}
        onClose={() => {
          if (!endingPromoId) {
            setEndPromoTarget(null);
          }
        }}
        title="End Promotion"
        showCloseButton={false}
        subtitle={`End "${endPromoTarget?.title || ''}" immediately? Customers will return to regular pricing across shop and checkout.`}
        options={[
          {
            key: 'confirm-end',
            label: 'End Promotion Now',
            icon: 'stop-circle-outline',
            destructive: true,
            onPress: handleConfirmEndPromotion,
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
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.hero,
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.lg,
  },
  infoLabel: {
    marginBottom: theme.spacing.xs,
  },
  infoText: {
    fontSize: 13.5,
    lineHeight: 20,
  },
  actionErrorBanner: {
    marginBottom: theme.spacing.md,
  },
  formContainer: {
    marginTop: 0,
  },
  durationWrapper: {
    marginBottom: theme.spacing.lg,
  },
  customDaysInput: {
    marginTop: theme.spacing.md,
    marginBottom: 0,
  },
  durationChipsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  durationChip: {
    flex: 1,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 8,
    minHeight: 38,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  durationChipSelected: {
    backgroundColor: theme.colors.inkPrimary,
    borderColor: theme.colors.inkPrimary,
  },
  selectorWrapper: {
    marginBottom: theme.spacing.md,
  },
  pickerLabel: {
    marginBottom: theme.spacing.xs,
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
    marginTop: theme.spacing.sm,
  },
  helperText: {
    marginTop: theme.spacing.sm,
    lineHeight: 19,
  },
  selectedListCard: {
    width: '100%',
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.sm,
    overflow: 'hidden',
  },
  selectedItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    minHeight: 44,
    paddingVertical: 10,
    paddingLeft: theme.spacing.lg,
    paddingRight: theme.spacing.sm,
  },
  selectedItemDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  selectedItemText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  selectedItemRemove: {
    width: 32,
    height: 32,
    borderRadius: theme.radii.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  activeSection: {
    marginTop: theme.spacing.md,
  },
  activeSectionTitle: {
    marginBottom: theme.spacing.md,
  },
  activePromoCard: {
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  activePromoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  activePromoInfo: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  activePromoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  activePromoName: {
    flexShrink: 1,
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14.5,
  },
  endPromoAction: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radii.xs,
    borderWidth: 1,
    borderColor: theme.colors.errorBorder,
    backgroundColor: theme.colors.errorBg,
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
