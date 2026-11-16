import React, { useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import AtelierText from '../../components/common/AtelierText';
import AtelierButton from '../../components/common/AtelierButton';
import AtelierCard from '../../components/common/AtelierCard';
import AtelierHeader from '../../components/common/AtelierHeader';
import AtelierEmptyState from '../../components/common/AtelierEmptyState';
import { formatPrice } from '../../utils/formatters';

export const OrderConfirmationScreen = ({ route, navigation }) => {
  const { orderId, totalAmount } = route.params || {};
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
      <View style={styles.emptyContainer}>
        <AtelierHeader
          title="Cart"
          leftType="drawer"
          navigation={navigation}
        />
        <AtelierEmptyState
          iconName="lock-closed-outline"
          title="Sign In Required"
          description="Sign in to view your order confirmation."
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

  const handleViewOrder = () => {
    if (navigation.canGoBack()) {
      navigation.popToTop();
    }
    navigation.navigate('OrdersTab', {
      screen: 'OrderDetails',
      params: { orderId },
    });
  };

  const handleContinueShopping = () => {
    if (navigation.canGoBack()) {
      navigation.popToTop();
    }
    navigation.navigate('HomeTab');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.sealCircle}>
          <Ionicons
            name="checkmark"
            size={40}
            color={theme.colors.gold}
          />
        </View>

        <AtelierText
          variant="caption"
          color={theme.colors.goldText}
          style={styles.statusSub}
        >
          Order Confirmed
        </AtelierText>
        <AtelierText
          variant="display"
          style={styles.heading}
        >
          Thank You for Your Order
        </AtelierText>

        <AtelierText
          variant="bodyLarge"
          color={theme.colors.inkSecondary}
          style={styles.message}
        >
          Your order has been received and is now being prepared for shipping.
        </AtelierText>

        <AtelierCard
          subtle
          style={styles.referenceCard}
        >
          <View style={styles.refRow}>
            <AtelierText
              variant="caption"
              color={theme.colors.inkMuted}
            >
              Order ID
            </AtelierText>
            <AtelierText
              variant="title2"
              color={theme.colors.inkPrimary}
            >
              #{orderId ? orderId.slice(-8).toUpperCase() : 'ORD-0001'}
            </AtelierText>
          </View>
          <View style={styles.refRow}>
            <AtelierText
              variant="caption"
              color={theme.colors.inkMuted}
            >
              Order Total (COD)
            </AtelierText>
            <AtelierText
              variant="title2"
              color={theme.colors.goldText}
            >
              {formatPrice(totalAmount || 0)}
            </AtelierText>
          </View>
        </AtelierCard>

        <AtelierButton
          title="View Order"
          onPress={handleViewOrder}
          style={styles.viewOrderButton}
        />

        <AtelierButton
          title="Continue Shopping"
          onPress={handleContinueShopping}
          variant="outline"
          style={styles.homeButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  sealCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.goldLight,
    borderWidth: 1.5,
    borderColor: theme.colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  statusSub: {
    letterSpacing: 1.2,
    marginBottom: theme.spacing.xs,
  },
  heading: {
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  message: {
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
  },
  referenceCard: {
    width: '100%',
    marginBottom: theme.spacing.xl,
  },
  refRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  viewOrderButton: {
    width: '100%',
    marginBottom: theme.spacing.md,
  },
  homeButton: {
    width: '100%',
  },
});

export default OrderConfirmationScreen;
