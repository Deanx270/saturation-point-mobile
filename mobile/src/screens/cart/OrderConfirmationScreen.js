import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import AtelierText from '../../components/common/AtelierText';
import AtelierButton from '../../components/common/AtelierButton';
import AtelierCard from '../../components/common/AtelierCard';
import { formatPrice } from '../../utils/formatters';

export const OrderConfirmationScreen = ({ route, navigation }) => {
  const { orderId, totalAmount } = route.params || {};

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
              Total Paid
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
          onPress={() =>
            navigation.navigate('OrdersTab', {
              screen: 'OrderDetails',
              params: { orderId },
            })
          }
          style={styles.viewOrderButton}
        />

        <AtelierButton
          title="Continue Shopping"
          onPress={() => navigation.navigate('HomeTab')}
          variant="outline"
          style={styles.homeButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
