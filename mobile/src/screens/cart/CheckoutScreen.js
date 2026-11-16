import React, { useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
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
import { selectCartItems, selectCartTotal } from '../../redux/cartSlice';
import { createOrder } from '../../redux/ordersSlice';
import { formatPrice } from '../../utils/formatters';

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
  const items = useSelector(selectCartItems);
  const total = useSelector(selectCartTotal);
  const { loading } = useSelector((state) => state.orders);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (!user && navigation.canGoBack()) {
      navigation.popToTop();
    }
  }, [user, navigation]);

  useFocusEffect(
    useCallback(() => {
      if (!user && navigation.canGoBack()) {
        navigation.popToTop();
      }
    }, [user, navigation])
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
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {}

    const orderPayload = {
      orderItems: items.map((i) => ({
        product: i.product,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        image: i.image,
      })),
      totalAmount: total,
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <AtelierCard
          subtle
          style={styles.summaryCard}
        >
          <AtelierText
            variant="caption"
            color={theme.colors.goldText}
            style={styles.cardSectionTitle}
          >
            Order Summary
          </AtelierText>
          <View style={styles.summaryRow}>
            <AtelierText
              variant="bodyMedium"
              color={theme.colors.inkSecondary}
            >
              Items
            </AtelierText>
            <AtelierText
              variant="bodyLarge"
              style={styles.summaryBold}
            >
              {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}
            </AtelierText>
          </View>
          <View style={styles.summaryRow}>
            <AtelierText
              variant="bodyMedium"
              color={theme.colors.inkSecondary}
            >
              Total
            </AtelierText>
            <AtelierText
              variant="title2"
              color={theme.colors.inkPrimary}
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
            values,
            errors,
            touched,
          }) => (
            <View>
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
              />

              <View style={styles.twoColumnRow}>
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
                  />
                </View>
              </View>

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
              />

              <AtelierText
                variant="title2"
                style={styles.sectionHeader}
              >
                Payment Method
              </AtelierText>

              <AtelierCard style={[styles.paymentCard, styles.selectedPaymentCard]}>
                <View style={styles.paymentRadioRow}>
                  <Ionicons
                    name="cash-outline"
                    size={22}
                    color={theme.colors.goldText}
                    style={styles.codIcon}
                  />
                  <View style={styles.paymentDetails}>
                    <AtelierText
                      variant="title2"
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

              <AtelierButton
                title={loading ? 'Placing Order...' : `Place Order (${formatPrice(total)})`}
                onPress={handleSubmit}
                loading={loading}
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
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: 60,
  },
  summaryCard: {
    marginBottom: theme.spacing.xl,
  },
  cardSectionTitle: {
    marginBottom: theme.spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  summaryBold: {
    fontWeight: '600',
  },
  sectionHeader: {
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.sm,
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
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  selectedPaymentCard: {
    borderColor: theme.colors.gold,
    borderWidth: 1.5,
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
    fontSize: 15,
  },
  submitButton: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.hero,
  },
});

export default CheckoutScreen;
