import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import apiClient from '../../api/client';
import AtelierText from '../../components/common/AtelierText';
import AtelierButton from '../../components/common/AtelierButton';
import AtelierCard from '../../components/common/AtelierCard';
import AtelierEmptyState from '../../components/common/AtelierEmptyState';
import AtelierHeader from '../../components/common/AtelierHeader';
import AtelierPressable from '../../components/common/AtelierPressable';
import AtelierQuantityStepper from '../../components/common/AtelierQuantityStepper';
import {
  selectCartItems,
  selectCartTotal,
  selectCartSavings,
  syncCartProductPricing,
  updateQuantity,
  removeFromCart,
  clearCart,
} from '../../redux/cartSlice';
import { syncProductSnapshot } from '../../redux/productsSlice';
import { formatPrice, isValidRemoteOrLocalUri } from '../../utils/formatters';

export const CartScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const items = useSelector(selectCartItems);
  const total = useSelector(selectCartTotal);
  const savings = useSelector(selectCartSavings);
  const { user } = useSelector((state) => state.auth);
  const [checkingStock, setCheckingStock] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (items.length === 0) {
        return undefined;
      }
      let active = true;
      Promise.all(
        items.map(async (item) => {
          try {
            const res = await apiClient.get(`/products/${item.product}`);
            if (active && res.data?._id) {
              dispatch(syncProductSnapshot(res.data));
              dispatch(syncCartProductPricing(res.data));
            }
          } catch (e) {}
        })
      );
      return () => {
        active = false;
      };
    }, [dispatch, items.length])
  );

  const handleSetQuantity = (item, nextQty) => {
    if (
      typeof item.stock === 'number' &&
      item.stock > 0 &&
      nextQty > item.stock
    ) {
      Alert.alert(
        'Stock Limit Reached',
        `Only ${item.stock} available in stock.`
      );
      dispatch(updateQuantity({ product: item.product, quantity: item.stock }));
      return;
    }
    dispatch(updateQuantity({ product: item.product, quantity: nextQty }));
  };

  const handleRemove = (productId, name) => {
    Alert.alert(
      'Remove Item',
      `Remove "${name}" from your cart?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => dispatch(removeFromCart(productId)),
        },
      ]
    );
  };

  const handleProceedToCheckout = async () => {
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in before placing an order.',
        [
          { text: 'Later' },
          {
            text: 'Sign In',
            onPress: () =>
              navigation.navigate('UserTab', { screen: 'Login' }),
          },
        ]
      );
      return;
    }

    if (checkingStock || items.length === 0) {
      return;
    }

    setCheckingStock(true);
    try {
      const adjustments = [];
      await Promise.all(
        items.map(async (item) => {
          try {
            const res = await apiClient.get(`/products/${item.product}`);
            const latest = res.data;
            if (!latest?._id) {
              return;
            }
            dispatch(syncProductSnapshot(latest));
            dispatch(syncCartProductPricing(latest));
            const liveStock = Math.max(0, Number(latest.stock) || 0);
            if (liveStock <= 0) {
              dispatch(removeFromCart(item.product));
              adjustments.push(`${item.name} is now out of stock and was removed.`);
            } else if (item.quantity > liveStock) {
              dispatch(updateQuantity({ product: item.product, quantity: liveStock }));
              adjustments.push(
                `${item.name} quantity adjusted to ${liveStock} (available stock).`
              );
            }
          } catch (e) {}
        })
      );

      if (adjustments.length > 0) {
        Alert.alert('Cart Stock Updated', adjustments.join('\n'));
        return;
      }

      navigation.navigate('Checkout');
    } finally {
      setCheckingStock(false);
    }
  };

  const openProductDetails = (productId) => {
    navigation.navigate('HomeTab', {
      screen: 'ProductDetails',
      params: { productId },
    });
  };

  const renderCartItem = ({ item }) => {
    const hasValidImage = isValidRemoteOrLocalUri(item.image);

    return (
      <AtelierCard style={styles.itemCard}>
        <View style={styles.cardRow}>
          <AtelierPressable
            tone="subtle"
            onPress={() => openProductDetails(item.product)}
            style={styles.thumbPressable}
          >
            {hasValidImage ? (
              <Image
                source={{ uri: item.image }}
                style={styles.itemThumbnail}
              />
            ) : (
              <View style={[styles.itemThumbnail, styles.placeholderThumb]}>
                <Ionicons
                  name="image-outline"
                  size={24}
                  color={theme.colors.inkMuted}
                />
              </View>
            )}
          </AtelierPressable>
          <View style={styles.itemInfo}>
            <View style={styles.itemHeader}>
              <AtelierPressable
                tone="subtle"
                onPress={() => openProductDetails(item.product)}
                style={styles.titleWrapper}
              >
                <AtelierText
                  variant="caption"
                  color={theme.colors.goldText}
                  numberOfLines={1}
                >
                  {item.brand || 'The Saturation Point'}
                </AtelierText>
                <AtelierText
                  variant="title2"
                  numberOfLines={1}
                  style={styles.itemName}
                >
                  {item.name}
                </AtelierText>
              </AtelierPressable>
              <AtelierPressable
                tone="subtle"
                hitSlop={8}
                onPress={() => handleRemove(item.product, item.name)}
                style={styles.deleteButton}
                accessibilityLabel={`Remove ${item.name}`}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={theme.colors.inkMuted}
                />
              </AtelierPressable>
            </View>

            <View style={styles.priceStepperRow}>
              <View style={styles.priceColumn}>
                <AtelierText
                  variant="bodyLarge"
                  color={theme.colors.inkPrimary}
                  style={styles.itemPrice}
                >
                  {formatPrice(item.price * item.quantity)}
                </AtelierText>
                {item.discountPercent > 0 &&
                Number(item.originalPrice) > item.price ? (
                  <AtelierText
                    variant="caption"
                    color={theme.colors.inkMuted}
                    style={styles.originalLinePrice}
                  >
                    {formatPrice(Number(item.originalPrice) * item.quantity)}
                  </AtelierText>
                ) : null}
              </View>

              <AtelierQuantityStepper
                compact
                allowDecrementBelowMin
                haptic="light"
                value={item.quantity}
                max={typeof item.stock === 'number' && item.stock > 0 ? item.stock : undefined}
                onChange={(nextQty) => handleSetQuantity(item, nextQty)}
                onLimitReached={(maxStock) =>
                  Alert.alert(
                    'Stock Limit Reached',
                    `Only ${maxStock} available in stock.`
                  )
                }
                decrementLabel={`Decrease quantity of ${item.name}`}
                incrementLabel={`Increase quantity of ${item.name}`}
                inputLabel={`Quantity for ${item.name}`}
              />
            </View>
          </View>
        </View>
      </AtelierCard>
    );
  };

  return (
    <View style={styles.container}>
      <AtelierHeader
        title="Cart"
        leftType="drawer"
        navigation={navigation}
        rightIcon={items.length > 0 ? 'trash-bin-outline' : undefined}
        rightIconColor={theme.colors.error}
        rightIconSize={24}
        rightAccessibilityLabel="Clear shopping cart"
        onRightPress={() =>
          Alert.alert(
            'Clear Cart',
            'Remove all items from your cart?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Clear',
                style: 'destructive',
                onPress: () => dispatch(clearCart()),
              },
            ]
          )
        }
      />

      <FlatList
        data={items}
        keyExtractor={(item) => item.product}
        renderItem={renderCartItem}
        contentContainerStyle={[
          styles.listContent,
          items.length === 0 && styles.emptyListContent,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <AtelierEmptyState
            iconName="cart-outline"
            title="Your Cart is Empty"
            description="Add fountain pens, inks, or paper from the shop to get started."
            actionTitle="Browse Products"
            onActionPress={() => navigation.navigate('HomeTab')}
          />
        }
      />

      {items.length > 0 && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <AtelierText
              variant="bodyMedium"
              color={theme.colors.inkSecondary}
            >
              Subtotal
            </AtelierText>
            <AtelierText
              variant="bodyLarge"
              style={styles.summaryValue}
            >
              {formatPrice(total)}
            </AtelierText>
          </View>

          {savings > 0 ? (
            <View style={styles.summaryRow}>
              <AtelierText
                variant="bodyMedium"
                color={theme.colors.inkSecondary}
              >
                Promo Savings
              </AtelierText>
              <AtelierText
                variant="caption"
                color={theme.colors.success}
              >
                -{formatPrice(savings)}
              </AtelierText>
            </View>
          ) : null}

          <View style={styles.summaryRow}>
            <AtelierText
              variant="bodyMedium"
              color={theme.colors.inkSecondary}
            >
              Shipping
            </AtelierText>
            <AtelierText
              variant="caption"
              color={theme.colors.goldText}
            >
              Free
            </AtelierText>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <AtelierText variant="title1">Total</AtelierText>
            <AtelierText
              variant="bodyLarge"
              color={theme.colors.inkPrimary}
              style={styles.totalValue}
            >
              {formatPrice(total)}
            </AtelierText>
          </View>

          <AtelierButton
            title={checkingStock ? 'Checking Stock...' : 'Checkout'}
            loading={checkingStock}
            disabled={checkingStock}
            onPress={handleProceedToCheckout}
            style={styles.checkoutButton}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  listContent: {
    padding: theme.spacing.lg,
    paddingBottom: 220,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: theme.spacing.hero,
  },
  itemCard: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
  },
  thumbPressable: {
    borderRadius: theme.radii.xs,
    overflow: 'hidden',
  },
  itemThumbnail: {
    width: 80,
    height: 80,
    borderRadius: theme.radii.xs,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  placeholderThumb: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
    justifyContent: 'space-between',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleWrapper: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    lineHeight: 20,
    marginTop: 2,
  },
  deleteButton: {
    padding: theme.spacing.xs,
  },
  priceStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
  },
  priceColumn: {
    justifyContent: 'center',
  },
  itemPrice: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
  },
  originalLinePrice: {
    textDecorationLine: 'line-through',
    fontSize: 11,
  },
  summaryContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    ...theme.shadows.card,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  summaryValue: {
    fontFamily: 'Montserrat_600SemiBold',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  totalValue: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 20,
    lineHeight: 26,
  },
  checkoutButton: {
    width: '100%',
  },
});

export default CartScreen;
