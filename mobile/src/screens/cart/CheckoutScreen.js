import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Formik } from 'formik';
import * as Yup from 'yup';
import * as Haptics from 'expo-haptics';
import { theme } from '../../theme';
import AtelierText from '../../components/common/AtelierText';
import AtelierInput from '../../components/common/AtelierInput';
import AtelierButton from '../../components/common/AtelierButton';
import AtelierCard from '../../components/common/AtelierCard';
import AtelierHeader from '../../components/common/AtelierHeader';
import AtelierEmptyState from '../../components/common/AtelierEmptyState';
import apiClient from '../../api/client';
import {
  selectCartItems,
  selectCartTotal,
  selectCartSavings,
  syncCartProductPricing,
  removeFromCart,
  updateQuantity,
} from '../../redux/cartSlice';
import { syncProductSnapshot } from '../../redux/productsSlice';
import { createOrder } from '../../redux/ordersSlice';
import { formatPrice, resolveProductPricing } from '../../utils/formatters';
import { submitFormWithScroll } from '../../utils/formScroll';

const CheckoutSchema = Yup.object().shape({
  street: Yup.string()
    .trim()
    .min(5, 'Enter a complete street address (at least 5 characters)')
    .max(150, 'Street address must be 150 characters or fewer')
    .matches(/[a-zA-Z]/, 'Enter a valid street address')
    .required('Street address is required'),
  city: Yup.string()
    .trim()
    .min(2, 'Enter a valid city name')
    .max(80, 'City name must be 80 characters or fewer')
    .matches(/^[a-zA-Z\s.\-']+$/, 'City name should contain letters only')
    .required('City is required'),
  postalCode: Yup.string()
    .trim()
    .matches(/^\d+$/, 'Postal code must contain numbers only')
    .test(
      'postal-length',
      'Enter a valid numeric ZIP code (4 digits for PH, 4–10 digits)',
      (value, context) => {
        if (!value) {
          return false;
        }
        const normalizedCountry = String(context.parent?.country || '')
          .trim()
          .toLowerCase();
        if (normalizedCountry === 'philippines' || normalizedCountry === 'ph') {
          return /^\d{4}$/.test(value);
        }
        return /^\d{4,10}$/.test(value);
      }
    )
    .required('Postal code is required'),
  country: Yup.string()
    .trim()
    .min(2, 'Enter a valid country name')
    .max(60, 'Country name must be 60 characters or fewer')
    .matches(/^[a-zA-Z\s.\-']+$/, 'Country name should contain letters only')
    .required('Country is required'),
});

const PAYMENT_METHOD_COD = 'Cash on Delivery';

export const CheckoutScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const scrollViewRef = useRef(null);
  const fieldYRef = useRef({});
  const items = useSelector(selectCartItems);
  const total = useSelector(selectCartTotal);
  const savings = useSelector(selectCartSavings);
  const { loading } = useSelector((state) => state.orders);
  const { user } = useSelector((state) => state.auth);
  const [verifyingCheckout, setVerifyingCheckout] = useState(false);

  useEffect(() => {
    if (!user && navigation.canGoBack()) {
      navigation.popToTop();
    }
  }, [user, navigation]);

  useFocusEffect(
    useCallback(() => {
      if (!user && navigation.canGoBack()) {
        navigation.popToTop();
        return undefined;
      }
      if (items.length === 0) {
        return undefined;
      }
      let active = true;
      Promise.all(
        items.map(async (item) => {
          try {
            const res = await apiClient.get(`/products/${item.product}`);
            if (active && res.data?._id) {
              dispatch(syncCartProductPricing(res.data));
            }
          } catch (e) {}
        })
      );
      return () => {
        active = false;
      };
    }, [user, navigation, dispatch, items.length])
  );

  if (!user) {
    return (
      <View style={styles.container}>
        <AtelierHeader
          title="Checkout"
          leftType="back"
          navigation={navigation}
        />
        <AtelierEmptyState
          iconName="lock-closed-outline"
          title="Sign In Required"
          description="Sign in to complete your checkout."
          actionTitle="Sign In"
          actionVariant="primary"
          fullWidthActions
          onActionPress={() =>
            navigation.navigate('UserTab', { screen: 'Login' })
          }
          secondaryActionTitle="Create Account"
          onSecondaryActionPress={() =>
            navigation.navigate('UserTab', { screen: 'Register' })
          }
        />
      </View>
    );
  }

  const totalQuantity = items.reduce((sum, i) => sum + (i.quantity || 0), 0);

  const handleOrderSubmit = async (values) => {
    if (verifyingCheckout || loading) {
      return;
    }

    setVerifyingCheckout(true);
    let liveTotal = total;
    const syncedItems = [...items];

    try {
      const notices = [];
      let computedLiveTotal = 0;

      await Promise.all(
        items.map(async (item, index) => {
          try {
            const res = await apiClient.get(`/products/${item.product}`);
            const latest = res.data;
            if (!latest?._id) {
              computedLiveTotal += Number(item.price) * item.quantity;
              return;
            }
            const pricing = resolveProductPricing(latest);
            const liveStock = Math.max(0, Number(latest.stock) || 0);
            dispatch(syncProductSnapshot(latest));
            dispatch(syncCartProductPricing(latest));

            if (liveStock <= 0) {
              dispatch(removeFromCart(item.product));
              notices.push(`${item.name} is now out of stock and was removed.`);
              return;
            }

            const effectiveQty = Math.min(item.quantity, liveStock);
            if (item.quantity > liveStock) {
              dispatch(updateQuantity({ product: item.product, quantity: liveStock }));
              notices.push(`${item.name} quantity adjusted to ${liveStock}.`);
            }

            if (Math.abs(pricing.effectivePrice - Number(item.price)) > 0.01) {
              notices.push(
                `${item.name} price updated to ${formatPrice(pricing.effectivePrice)} (${
                  pricing.hasPromo ? 'promotion updated' : 'promotion ended'
                }).`
              );
            }

            syncedItems[index] = {
              ...item,
              price: pricing.effectivePrice,
              quantity: effectiveQty,
            };
            computedLiveTotal += pricing.effectivePrice * effectiveQty;
          } catch (e) {
            computedLiveTotal += Number(item.price) * item.quantity;
          }
        })
      );

      if (notices.length > 0) {
        Alert.alert('Order Summary Updated', notices.join('\n'));
        return;
      }

      liveTotal = computedLiveTotal;
    } finally {
      setVerifyingCheckout(false);
    }

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {}

    const orderPayload = {
      orderItems: syncedItems.map((i) => ({
        product: i.product,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        image: i.image,
      })),
      totalAmount: liveTotal,
      expectedTotalAmount: liveTotal,
      paymentMethod: PAYMENT_METHOD_COD,
      shippingAddress: {
        street: values.street.trim(),
        city: values.city.trim(),
        postalCode: values.postalCode.trim(),
        country: values.country.trim(),
      },
    };

    const resultAction = await dispatch(createOrder(orderPayload));

    if (createOrder.fulfilled.match(resultAction)) {
      navigation.replace('OrderConfirmation', {
        orderId: resultAction.payload._id,
        totalAmount: resultAction.payload.totalAmount,
      });
    } else {
      Alert.alert(
        'Order Failed',
        resultAction.payload || 'Unable to place your order. Please try again.'
      );
    }
  };

  return (
    <View style={styles.container}>
      <AtelierHeader
        title="Checkout"
        leftType="back"
        navigation={navigation}
      />

      <Formik
        initialValues={{
          street: '',
          city: '',
          postalCode: '',
          country: '',
        }}
        validationSchema={CheckoutSchema}
        onSubmit={handleOrderSubmit}
      >
        {({
          handleChange,
          handleBlur,
          handleSubmit,
          setFieldValue,
          validateForm,
          setTouched,
          values,
          errors,
          touched,
        }) => (
          <KeyboardAvoidingView
            style={styles.flexBody}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              ref={scrollViewRef}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
            >
              <AtelierCard style={styles.summaryCard}>
                <AtelierText
                  variant="caption"
                  color={theme.colors.goldText}
                  style={styles.cardSectionTitle}
                >
                  Order Summary
                </AtelierText>
                <View style={styles.summaryRow}>
                  <AtelierText
                    variant="bodySmall"
                    color={theme.colors.inkMuted}
                    style={styles.summaryLabel}
                  >
                    Items
                  </AtelierText>
                  <AtelierText
                    variant="bodyMedium"
                    color={theme.colors.inkPrimary}
                    style={styles.summaryValue}
                  >
                    {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}
                  </AtelierText>
                </View>
                {savings > 0 ? (
                  <View style={styles.summaryRow}>
                    <AtelierText
                      variant="bodySmall"
                      color={theme.colors.inkMuted}
                      style={styles.summaryLabel}
                    >
                      Promo Savings
                    </AtelierText>
                    <AtelierText
                      variant="bodyMedium"
                      color={theme.colors.success}
                      style={styles.summaryValue}
                    >
                      -{formatPrice(savings)}
                    </AtelierText>
                  </View>
                ) : null}
                <View style={styles.summaryDivider} />
                <View style={styles.summaryTotalRow}>
                  <AtelierText
                    variant="bodyMedium"
                    color={theme.colors.inkSecondary}
                    style={styles.summaryTotalLabel}
                  >
                    Total (COD)
                  </AtelierText>
                  <AtelierText
                    variant="bodyLarge"
                    color={theme.colors.goldText}
                    style={styles.summaryTotal}
                  >
                    {formatPrice(total)}
                  </AtelierText>
                </View>
              </AtelierCard>

              <AtelierText
                variant="title2"
                style={styles.sectionHeader}
              >
                Shipping Address
              </AtelierText>

              <View
                onLayout={(e) => {
                  fieldYRef.current.street = e.nativeEvent.layout.y;
                }}
              >
                <AtelierInput
                  label="Street Address"
                  placeholder="e.g. 123 Ayala Avenue, Unit 4B"
                  value={values.street}
                  onChangeText={handleChange('street')}
                  onBlur={handleBlur('street')}
                  autoCapitalize="words"
                  autoComplete="street-address"
                  textContentType="fullStreetAddress"
                  error={errors.street}
                  touched={touched.street}
                  style={styles.compactInput}
                />
              </View>

              <View
                style={styles.twoColumnRow}
                onLayout={(e) => {
                  fieldYRef.current.city = e.nativeEvent.layout.y;
                  fieldYRef.current.postalCode = e.nativeEvent.layout.y;
                }}
              >
                <View style={styles.columnLeft}>
                  <AtelierInput
                    label="City"
                    placeholder="e.g. Makati"
                    value={values.city}
                    onChangeText={handleChange('city')}
                    onBlur={handleBlur('city')}
                    autoCapitalize="words"
                    autoComplete="postal-address-locality"
                    textContentType="addressCity"
                    error={errors.city}
                    touched={touched.city}
                    style={styles.compactInput}
                  />
                </View>
                <View style={styles.columnRight}>
                  <AtelierInput
                    label="Postal Code"
                    placeholder="e.g. 1226"
                    value={values.postalCode}
                    onChangeText={(text) =>
                      setFieldValue('postalCode', text.replace(/\D/g, ''))
                    }
                    onBlur={handleBlur('postalCode')}
                    keyboardType="number-pad"
                    maxLength={10}
                    autoComplete="postal-code"
                    textContentType="postalCode"
                    error={errors.postalCode}
                    touched={touched.postalCode}
                    style={styles.compactInput}
                  />
                </View>
              </View>

              <View
                onLayout={(e) => {
                  fieldYRef.current.country = e.nativeEvent.layout.y;
                }}
              >
                <AtelierInput
                  label="Country"
                  placeholder="e.g. Philippines"
                  value={values.country}
                  onChangeText={handleChange('country')}
                  onBlur={handleBlur('country')}
                  autoCapitalize="words"
                  autoComplete="country"
                  textContentType="countryName"
                  error={errors.country}
                  touched={touched.country}
                  style={styles.compactInput}
                />
              </View>

              <AtelierText
                variant="title2"
                style={styles.paymentHeader}
              >
                Payment Method
              </AtelierText>

              <AtelierCard style={[styles.paymentCard, styles.selectedPaymentCard]}>
                <View style={styles.paymentRadioRow}>
                  <Ionicons
                    name="cash-outline"
                    size={20}
                    color={theme.colors.goldText}
                    style={styles.codIcon}
                  />
                  <View style={styles.paymentDetails}>
                    <AtelierText
                      variant="bodyLarge"
                      color={theme.colors.inkPrimary}
                      style={styles.paymentTitle}
                    >
                      Cash on Delivery
                    </AtelierText>
                    <AtelierText
                      variant="bodySmall"
                      color={theme.colors.inkMuted}
                    >
                      Pay in cash when your order arrives
                    </AtelierText>
                  </View>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={theme.colors.gold}
                  />
                </View>
              </AtelierCard>
            </ScrollView>

            <View style={styles.footerBar}>
              <AtelierButton
                title={
                  loading || verifyingCheckout
                    ? 'Placing Order...'
                    : `Place Order (${formatPrice(total)})`
                }
                onPress={() =>
                  submitFormWithScroll({
                    validateForm,
                    setTouched,
                    handleSubmit,
                    scrollViewRef,
                    yPositions: fieldYRef.current,
                    fieldOrder: ['street', 'city', 'postalCode', 'country'],
                  })
                }
                loading={loading || verifyingCheckout}
                style={styles.submitButton}
              />
            </View>
          </KeyboardAvoidingView>
        )}
      </Formik>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  flexBody: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  cardSectionTitle: {
    marginBottom: theme.spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryLabel: {
    fontFamily: 'Montserrat_500Medium',
  },
  summaryValue: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.sm,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTotalLabel: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
  },
  summaryTotal: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 17,
    lineHeight: 22,
  },
  sectionHeader: {
    marginBottom: theme.spacing.sm,
  },
  compactInput: {
    marginBottom: theme.spacing.md,
  },
  paymentHeader: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
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
  paymentCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
  },
  selectedPaymentCard: {
    borderColor: theme.colors.gold,
    borderWidth: 1,
  },
  paymentRadioRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codIcon: {
    marginRight: theme.spacing.md,
  },
  paymentDetails: {
    flex: 1,
  },
  paymentTitle: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 15,
    lineHeight: 20,
  },
  footerBar: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    ...theme.shadows.card,
  },
  submitButton: {
    width: '100%',
  },
});

export default CheckoutScreen;
