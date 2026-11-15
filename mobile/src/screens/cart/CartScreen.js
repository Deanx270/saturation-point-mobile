import React from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '../../theme';
import AtelierText from '../../components/common/AtelierText';
import AtelierButton from '../../components/common/AtelierButton';
import AtelierCard from '../../components/common/AtelierCard';
import AtelierEmptyState from '../../components/common/AtelierEmptyState';
import AtelierHeader from '../../components/common/AtelierHeader';
import {
  selectCartItems,
  selectCartTotal,
  updateQuantity,
  removeFromCart,
  clearCart,
} from '../../redux/cartSlice';
import { formatPrice, isValidRemoteOrLocalUri } from '../../utils/formatters';

export const CartScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const items = useSelector(selectCartItems);
  const total = useSelector(selectCartTotal);
  const { user } = useSelector((state) => state.auth);

  const handleUpdateQuantity = async (item, delta) => {
    const nextQty = item.quantity + delta;
    if (delta > 0 && typeof item.stock === 'number' && nextQty > item.stock) {
      Alert.alert(
        'Stock Limit Reached',
        `Only ${item.stock} available in stock.`
      );
      return;
    }
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
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

  const handleProceedToCheckout = () => {
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in before placing an order.',
        [
          { text: 'Later' },
          { text: 'Sign In', onPress: () => navigation.navigate('UserTab') },
        ]
      );
      return;
    }
    navigation.navigate('Checkout');
  };

  const renderCartItem = ({ item }) => {
    const hasValidImage = isValidRemoteOrLocalUri(item.image);

    return (
      <AtelierCard style={styles.itemCard}>
        <View style={styles.cardRow}>
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
          <View style={styles.itemInfo}>
            <View style={styles.itemHeader}>
              <View style={styles.titleWrapper}>
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
              </View>
              <TouchableOpacity
                onPress={() => handleRemove(item.product, item.name)}
                style={styles.deleteButton}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={theme.colors.inkMuted}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.priceStepperRow}>
              <AtelierText
                variant="title2"
                color={theme.colors.inkPrimary}
              >
                {formatPrice(item.price * item.quantity)}
              </AtelierText>

              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => handleUpdateQuantity(item, -1)}
                >
                  <Ionicons
                    name="remove"
                    size={16}
                    color={theme.colors.inkPrimary}
                  />
                </TouchableOpacity>
                <AtelierText
                  variant="bodyMedium"
                  style={styles.stepperValue}
                >
                  {item.quantity}
                </AtelierText>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => handleUpdateQuantity(item, 1)}
                >
                  <Ionicons
                    name="add"
                    size={16}
                    color={theme.colors.inkPrimary}
                  />
                </TouchableOpacity>
              </View>
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
        rightIconSize={22}
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
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <AtelierEmptyState
            iconName="cart-outline"
            title="Your Cart is Empty"
            description="Add fountain pens, inks, or paper from the catalog to get started."
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
              FREE
            </AtelierText>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <AtelierText variant="title1">Total</AtelierText>
            <AtelierText
              variant="title1"
              color={theme.colors.inkPrimary}
            >
              {formatPrice(total)}
            </AtelierText>
          </View>

          <AtelierButton
            title="Checkout"
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
  itemCard: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
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
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.xs,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  stepperButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    minWidth: 28,
    textAlign: 'center',
    fontWeight: '600',
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
    fontWeight: '500',
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
  checkoutButton: {
    width: '100%',
  },
});

export default CartScreen;
