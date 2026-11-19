import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
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
import apiClient from '../../api/client';
import {
  fetchProducts,
  fetchActivePromotions,
} from '../../redux/productsSlice';
import {
  formatPrice,
  formatDate,
  isValidRemoteOrLocalUri,
} from '../../utils/formatters';

const DURATION_OPTIONS = [
  { label: '1 Day', days: 1 },
  { label: '3 Days', days: 3 },
  { label: '7 Days', days: 7 },
  { label: '14 Days', days: 14 },
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
});

export const AdminPromotionsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { adminItems, items, activePromotions } = useSelector(
    (state) => state.products
  );
  const productOptions = useMemo(
    () => (adminItems.length > 0 ? adminItems : items),
    [adminItems, items]
  );
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [durationDays, setDurationDays] = useState(7);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [productQuery, setProductQuery] = useState('');
  const [productError, setProductError] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [endingPromoId, setEndingPromoId] = useState(null);

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

  const getCampaignHint = () => {
    const durationLabel = `${durationDays} ${durationDays === 1 ? 'day' : 'days'}`;
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

    setProductError('');
    setBroadcasting(true);
    try {
      const response = await apiClient.post('/promotions/broadcast', {
        title: values.title.trim(),
        body: values.body.trim(),
        discountPercent: Number(values.discountPercent),
        durationDays,
        productIds: selectedProductIds,
      });

      await dispatch(fetchActivePromotions());
      Alert.alert(
        'Promotion Active',
        response.data?.message || 'Promotional notification sent to registered users.'
      );
      resetForm();
      setSelectedProductIds([]);
      setDurationDays(7);
    } catch (error) {
      Alert.alert(
        'Send Failed',
        error.response?.data?.message || 'Unable to send notification.'
      );
    } finally {
      setBroadcasting(false);
    }
  };

  const handleEndPromotion = (promo) => {
    Alert.alert(
      'End Promotion',
      `End "${promo.title}" now? Customers will immediately see regular pricing.`,
      [
        { text: 'Keep Active', style: 'cancel' },
        {
          text: 'End Now',
          style: 'destructive',
          onPress: async () => {
            setEndingPromoId(promo._id);
            try {
              await apiClient.delete(`/promotions/${promo._id}`);
              await dispatch(fetchActivePromotions());
            } catch (error) {
              Alert.alert(
                'Update Failed',
                error.response?.data?.message || 'Unable to end promotion.'
              );
            } finally {
              setEndingPromoId(null);
            }
          },
        },
      ]
    );
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

              <View style={styles.durationWrapper}>
                <AtelierText
                  variant="caption"
                  color={theme.colors.inkSecondary}
                  style={styles.pickerLabel}
                >
                  Campaign Duration
                </AtelierText>
                <View style={styles.durationChipsRow}>
                  {DURATION_OPTIONS.map((option) => {
                    const isSelected = durationDays === option.days;
                    return (
                      <AtelierPressable
                        key={option.days}
                        tone={isSelected ? 'solid' : 'surface'}
                        haptic="selection"
                        hitSlop={4}
                        onPress={() => setDurationDays(option.days)}
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
                </View>
              </View>

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
                    {getCampaignHint()}
                  </AtelierText>
                )}
              </View>

              <AtelierButton
                title={broadcasting ? 'Sending...' : 'Send Notification'}
                onPress={handleSubmit}
                loading={broadcasting}
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
  formContainer: {
    marginTop: 0,
  },
  durationWrapper: {
    marginBottom: theme.spacing.lg,
  },
  durationChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  durationChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    minHeight: 36,
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
