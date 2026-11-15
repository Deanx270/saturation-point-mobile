import React, { useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Image,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import AtelierText from '../../components/common/AtelierText';
import AtelierCard from '../../components/common/AtelierCard';
import AtelierBadge from '../../components/common/AtelierBadge';
import AtelierErrorBanner from '../../components/common/AtelierErrorBanner';
import AtelierSkeleton from '../../components/common/AtelierSkeleton';
import AtelierHeader from '../../components/common/AtelierHeader';
import { fetchOrderById } from '../../redux/ordersSlice';
import { formatPrice, isValidRemoteOrLocalUri } from '../../utils/formatters';

const ORDER_STEPS = ['pending', 'processing', 'shipped', 'delivered'];

export const OrderDetailsScreen = ({ route, navigation }) => {
  const { orderId } = route.params || {};
  const dispatch = useDispatch();
  const { selectedOrder, loading, error } = useSelector((state) => state.orders);

  useEffect(() => {
    if (orderId) {
      dispatch(fetchOrderById(orderId));
    }
  }, [dispatch, orderId]);

  const isStaleOrder = !selectedOrder || (orderId && selectedOrder._id !== orderId);

  if (loading && isStaleOrder) {
    return (
      <View style={styles.container}>
        <AtelierHeader
          title="Order Details"
          leftType="back"
          navigation={navigation}
        />
        <View style={styles.skeletonPadding}>
          <AtelierSkeleton
            height={100}
            style={{ marginBottom: 20 }}
          />
          <AtelierSkeleton
            height={160}
            style={{ marginBottom: 20 }}
          />
          <AtelierSkeleton height={80} />
        </View>
      </View>
    );
  }

  if (isStaleOrder || error) {
    return (
      <View style={styles.container}>
        <AtelierHeader
          title="Order Details"
          leftType="back"
          navigation={navigation}
        />
        <View style={styles.skeletonPadding}>
          <AtelierErrorBanner
            message={error || 'Unable to load order details.'}
            onRetry={() => orderId && dispatch(fetchOrderById(orderId))}
          />
        </View>
      </View>
    );
  }

  const normalizedStatus = selectedOrder.status?.toLowerCase();
  const isCancelled = normalizedStatus === 'cancelled';
  const currentStepIndex = ORDER_STEPS.indexOf(normalizedStatus);

  return (
    <View style={styles.container}>
      <AtelierHeader
        title={`Order #${selectedOrder._id.slice(-8).toUpperCase()}`}
        leftType="back"
        navigation={navigation}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <AtelierCard style={styles.statusCard}>
          <View style={styles.statusHeaderRow}>
            <AtelierText
              variant="caption"
              color={theme.colors.goldText}
            >
              ORDER STATUS
            </AtelierText>
            <AtelierBadge
              label={selectedOrder.status.toUpperCase()}
              status={selectedOrder.status}
            />
          </View>

          {isCancelled ? (
            <AtelierText
              variant="bodyMedium"
              color={theme.colors.error}
            >
              This order was cancelled.
            </AtelierText>
          ) : (
            <View style={styles.timelineRow}>
              {ORDER_STEPS.map((step, idx) => {
                const isPassed = currentStepIndex >= idx;
                const isCurrent = currentStepIndex === idx;

                return (
                  <View
                    key={step}
                    style={styles.timelineStep}
                  >
                    <View
                      style={[
                        styles.stepDot,
                        isPassed && styles.stepDotPassed,
                        isCurrent && styles.stepDotCurrent,
                      ]}
                    >
                      {isPassed && (
                        <Ionicons
                          name="checkmark"
                          size={12}
                          color="#FFFFFF"
                        />
                      )}
                    </View>
                    <AtelierText
                      variant="caption"
                      color={isPassed ? theme.colors.inkPrimary : theme.colors.inkMuted}
                      style={styles.stepLabel}
                    >
                      {step}
                    </AtelierText>
                  </View>
                );
              })}
            </View>
          )}
        </AtelierCard>

        <AtelierText
          variant="title2"
          style={styles.sectionTitle}
        >
          Items
        </AtelierText>

        {selectedOrder.orderItems?.map((item, index) => {
          const hasValidImage = isValidRemoteOrLocalUri(item.image);
          return (
            <AtelierCard
              key={index}
              style={styles.itemCard}
            >
              <View style={styles.itemRow}>
                {hasValidImage ? (
                  <Image
                    source={{ uri: item.image }}
                    style={styles.itemImage}
                  />
                ) : (
                  <View style={[styles.itemImage, styles.placeholderImage]}>
                    <Ionicons
                      name="image-outline"
                      size={22}
                      color={theme.colors.inkMuted}
                    />
                  </View>
                )}
                <View style={styles.itemDetails}>
                  <AtelierText
                    variant="title2"
                    numberOfLines={1}
                  >
                    {item.name}
                  </AtelierText>
                  <AtelierText
                    variant="bodyMedium"
                    color={theme.colors.inkSecondary}
                  >
                    Qty: {item.quantity}
                  </AtelierText>
                  <AtelierText
                    variant="title2"
                    color={theme.colors.inkPrimary}
                    style={styles.itemPrice}
                  >
                    {formatPrice(item.price * item.quantity)}
                  </AtelierText>
                </View>
              </View>
            </AtelierCard>
          );
        })}

        <AtelierText
          variant="title2"
          style={styles.sectionTitle}
        >
          Shipping Address
        </AtelierText>

        <AtelierCard
          subtle
          style={styles.addressCard}
        >
          <AtelierText
            variant="bodyMedium"
            style={styles.addressLine}
          >
            {selectedOrder.shippingAddress?.street || 'No street address provided'}
          </AtelierText>
          <AtelierText
            variant="bodyMedium"
            color={theme.colors.inkSecondary}
            style={styles.addressLine}
          >
            {[selectedOrder.shippingAddress?.city, selectedOrder.shippingAddress?.postalCode]
              .filter(Boolean)
              .join(', ')}
          </AtelierText>
          {selectedOrder.shippingAddress?.country ? (
            <AtelierText
              variant="bodyMedium"
              color={theme.colors.inkSecondary}
            >
              {selectedOrder.shippingAddress.country}
            </AtelierText>
          ) : null}
        </AtelierCard>

        <AtelierText
          variant="title2"
          style={styles.sectionTitle}
        >
          Payment Summary
        </AtelierText>

        <AtelierCard style={styles.accountingCard}>
          <View style={styles.accountingRow}>
            <AtelierText
              variant="bodyMedium"
              color={theme.colors.inkSecondary}
            >
              Payment Method
            </AtelierText>
            <AtelierText
              variant="bodyLarge"
              style={styles.accountingValue}
            >
              {selectedOrder.paymentMethod}
            </AtelierText>
          </View>
          <View style={styles.accountingRow}>
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
          <View style={styles.accountingRow}>
            <AtelierText variant="title1">Total</AtelierText>
            <AtelierText
              variant="title1"
              color={theme.colors.inkPrimary}
            >
              {formatPrice(selectedOrder.totalAmount)}
            </AtelierText>
          </View>
        </AtelierCard>
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
    paddingBottom: theme.spacing.hero,
  },
  statusCard: {
    marginBottom: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xs,
  },
  timelineStep: {
    alignItems: 'center',
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: theme.colors.borderMedium,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stepDotPassed: {
    backgroundColor: theme.colors.gold,
    borderColor: theme.colors.gold,
  },
  stepDotCurrent: {
    borderColor: theme.colors.inkPrimary,
    borderWidth: 2,
  },
  stepLabel: {
    fontSize: 9,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  itemCard: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  itemRow: {
    flexDirection: 'row',
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: theme.radii.xs,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  placeholderImage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDetails: {
    flex: 1,
    marginLeft: theme.spacing.md,
    justifyContent: 'space-between',
  },
  itemPrice: {
    marginTop: 2,
  },
  addressCard: {
    marginBottom: theme.spacing.xl,
  },
  addressLine: {
    marginBottom: 2,
  },
  accountingCard: {
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.hero,
  },
  accountingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  accountingValue: {
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.sm,
  },
  skeletonPadding: {
    padding: theme.spacing.lg,
  },
});

export default OrderDetailsScreen;
