import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
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
  street: Yup.string().required('Street address is required'),
  city: Yup.string().required('City is required'),
  postalCode: Yup.string().required('Postal code is required'),
  country: Yup.string().required('Country is required'),
});

const PAYMENT_METHODS = [
  {
    id: 'Cash on Delivery',
    title: 'Cash on Delivery',
    description: 'Pay in cash when your order arrives',
  },
  {
    id: 'Bank Transfer',
    title: 'Bank Transfer',
    description: 'Pay via direct bank transfer before shipping',
  },
];

export const CheckoutScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const items = useSelector(selectCartItems);
  const total = useSelector(selectCartTotal);
  const { loading } = useSelector((state) => state.orders);
  const { user } = useSelector((state) => state.auth);
  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery');

  useEffect(() => {
    if (!user && navigation.canGoBack()) {
      navigation.popToTop();
    }
  }, [user, navigation]);

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
      paymentMethod,
      shippingAddress: values,
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
                    error={errors.city}
                    touched={touched.city}
                  />
                </View>
                <View style={styles.columnRight}>
                  <AtelierInput
                    label="Postal Code"
                    placeholder="e.g. 1226"
                    value={values.postalCode}
                    onChangeText={handleChange('postalCode')}
                    onBlur={handleBlur('postalCode')}
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
                error={errors.country}
                touched={touched.country}
              />

              <AtelierText
                variant="title2"
                style={styles.sectionHeader}
              >
                Payment Method
              </AtelierText>

              {PAYMENT_METHODS.map((method) => {
                const isSelected = paymentMethod === method.id;
                return (
                  <AtelierCard
                    key={method.id}
                    onPress={() => setPaymentMethod(method.id)}
                    style={[
                      styles.paymentCard,
                      isSelected && styles.selectedPaymentCard,
                    ]}
                  >
                    <View style={styles.paymentRadioRow}>
                      <View
                        style={[
                          styles.radioOuter,
                          isSelected && styles.radioOuterSelected,
                        ]}
                      >
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                      <View style={styles.paymentDetails}>
                        <AtelierText
                          variant="title2"
                          style={styles.paymentTitle}
                        >
                          {method.title}
                        </AtelierText>
                        <AtelierText
                          variant="bodySmall"
                          color={theme.colors.inkMuted}
                        >
                          {method.description}
                        </AtelierText>
                      </View>
                    </View>
                  </AtelierCard>
                );
              })}

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
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.borderMedium,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  radioOuterSelected: {
    borderColor: theme.colors.gold,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.gold,
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
