import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import AtelierText from '../../components/common/AtelierText';
import AtelierCard from '../../components/common/AtelierCard';
import AtelierBadge from '../../components/common/AtelierBadge';
import AtelierButton from '../../components/common/AtelierButton';
import AtelierPressable from '../../components/common/AtelierPressable';
import AtelierErrorBanner from '../../components/common/AtelierErrorBanner';
import AtelierSkeleton from '../../components/common/AtelierSkeleton';
import AtelierHeader from '../../components/common/AtelierHeader';
import AtelierEmptyState from '../../components/common/AtelierEmptyState';
import AtelierBottomSheet from '../../components/common/AtelierBottomSheet';
import AtelierToast from '../../components/common/AtelierToast';
import {
  fetchOrderById,
  updateOrderStatus,
  cancelMyOrder,
} from '../../redux/ordersSlice';
import {
  formatPrice,
  formatOrderStatus,
  isValidRemoteOrLocalUri,
} from '../../utils/formatters';
import { ORDER_STATUS_TRANSITIONS } from '../../utils/orderStatus';

const ORDER_STEPS = ['pending', 'processing', 'shipped', 'delivered'];

export const OrderDetailsScreen = ({ route, navigation }) => {
  const { orderId } = route.params || {};
  const dispatch = useDispatch();
  const { selectedOrder, loading, updatingOrderId, error } = useSelector(
    (state) => state.orders
  );
  const { user } = useSelector((state) => state.auth);
  const [statusSheetVisible, setStatusSheetVisible] = useState(false);
  const [cancelSheetMode, setCancelSheetMode] = useState(null);
  const [toastState, setToastState] = useState({
    visible: false,
    message: '',
    key: 0,
  });

  useEffect(() => {
    if (!user) {
      if (navigation.canGoBack()) {
        navigation.popToTop();
      }
      return;
    }
    if (orderId) {
      dispatch(fetchOrderById(orderId));
    }
  }, [dispatch, orderId, user, navigation]);

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
          title="Order Details"
          leftType="back"
          navigation={navigation}
        />
        <AtelierEmptyState
          iconName="lock-closed-outline"
          title="Sign In Required"
          description="Sign in to view your order details."
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

  const normalizedStatus = selectedOrder.status?.toLowerCase() || 'pending';
  const isCancelled = normalizedStatus === 'cancelled';
  const isAdmin = user?.role === 'admin';
  const isUpdatingOrder = updatingOrderId === selectedOrder._id;
  const currentStepIndex = ORDER_STEPS.indexOf(normalizedStatus);
  const availableTransitions = ORDER_STATUS_TRANSITIONS[normalizedStatus] || [];

  const handleAdminStatusChange = async (nextStatus) => {
    if (isUpdatingOrder) {
      return;
    }
    const result = await dispatch(
      updateOrderStatus({ orderId: selectedOrder._id, status: nextStatus })
    );
    if (updateOrderStatus.fulfilled.match(result)) {
      setToastState((prev) => ({
        visible: true,
        message: `Order updated to ${formatOrderStatus(nextStatus)}`,
        key: prev.key + 1,
      }));
    } else {
      Alert.alert(
        'Update Failed',
        result.payload || 'Unable to update order status.'
      );
    }
  };

  const handleSelectAdminTransition = (nextStatus) => {
    if (nextStatus === 'cancelled') {
      setCancelSheetMode('admin');
      return;
    }
    handleAdminStatusChange(nextStatus);
  };

  const handleCustomerCancelConfirm = async () => {
    if (isUpdatingOrder) {
      return;
    }
    const result = await dispatch(cancelMyOrder(selectedOrder._id));
    if (cancelMyOrder.fulfilled.match(result)) {
      setToastState((prev) => ({
        visible: true,
        message: 'Order cancelled and item stock restored',
        key: prev.key + 1,
      }));
    } else {
      Alert.alert(
        'Unable to Cancel',
        result.payload || 'Only pending orders can be cancelled.'
      );
    }
  };

  const openProductScreen = (targetProductId, focusReview = false) => {
    if (!targetProductId) {
      return;
    }
    navigation.navigate('HomeTab', {
      screen: 'ProductDetails',
      params: focusReview
        ? { productId: targetProductId, focusReview: true }
        : { productId: targetProductId },
    });
  };

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
              Order Status
            </AtelierText>
            <AtelierBadge
              label={formatOrderStatus(selectedOrder.status)}
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
                      {formatOrderStatus(step)}
                    </AtelierText>
                  </View>
                );
              })}
            </View>
          )}
          {isAdmin && availableTransitions.length > 0 ? (
            <View style={styles.statusActionsContainer}>
              <AtelierButton
                title={isUpdatingOrder ? 'Updating Status...' : 'Update Status'}
                loading={isUpdatingOrder}
                disabled={isUpdatingOrder}
                onPress={() => setStatusSheetVisible(true)}
              />
            </View>
          ) : null}

          {!isAdmin && normalizedStatus === 'pending' ? (
            <View style={styles.statusActionsContainer}>
              <AtelierButton
                title={isUpdatingOrder ? 'Cancelling Order...' : 'Cancel Order'}
                variant="outline"
                loading={isUpdatingOrder}
                disabled={isUpdatingOrder}
                onPress={() => setCancelSheetMode('customer')}
                style={styles.cancelButtonOutline}
                textStyle={styles.cancelButtonText}
              />
            </View>
          ) : !isAdmin &&
            (normalizedStatus === 'processing' || normalizedStatus === 'shipped') ? (
            <AtelierText
              variant="bodySmall"
              color={theme.colors.inkMuted}
              style={styles.statusHelperNote}
            >
              Order cancellation closes once preparation begins.
            </AtelierText>
          ) : null}
        </AtelierCard>

        <AtelierText
          variant="title2"
          style={styles.sectionTitle}
        >
          Items
        </AtelierText>

        {selectedOrder.orderItems?.map((item, index) => {
          const hasValidImage = isValidRemoteOrLocalUri(item.image);
          const itemProductId = item.product?._id || item.product;
          const canReviewItem =
            !isAdmin && normalizedStatus === 'delivered' && Boolean(itemProductId);

          return (
            <AtelierCard
              key={index}
              onPress={itemProductId ? () => openProductScreen(itemProductId) : undefined}
              style={[styles.itemCard, canReviewItem && styles.itemCardWithCta]}
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

              {canReviewItem ? (
                <AtelierPressable
                  tone="surface"
                  stopPropagation
                  hitSlop={6}
                  style={styles.reviewCtaRow}
                  onPress={() => openProductScreen(itemProductId, true)}
                >
                  <View style={styles.reviewCtaLeft}>
                    <Ionicons
                      name="star-outline"
                      size={16}
                      color={theme.colors.goldText}
                    />
                    <AtelierText
                      variant="caption"
                      color={theme.colors.goldText}
                    >
                      Write a Review
                    </AtelierText>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={theme.colors.goldText}
                  />
                </AtelierPressable>
              ) : null}
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
          {user?.role === 'admin' && selectedOrder.user?.displayName ? (
            <View style={styles.customerBlock}>
              <AtelierText
                variant="caption"
                color={theme.colors.goldText}
              >
                Customer
              </AtelierText>
              <AtelierText
                variant="bodyMedium"
                color={theme.colors.inkPrimary}
                style={styles.customerName}
              >
                {selectedOrder.user.displayName}
                {selectedOrder.user.email ? ` (${selectedOrder.user.email})` : ''}
              </AtelierText>
            </View>
          ) : null}
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
              Free
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

      <AtelierBottomSheet
        visible={statusSheetVisible}
        onClose={() => setStatusSheetVisible(false)}
        title="Advance Order Status"
        subtitle={`Order #${selectedOrder._id.slice(-8).toUpperCase()} • Currently ${formatOrderStatus(selectedOrder.status)}`}
        options={availableTransitions.map((option) => ({
          key: option.key,
          label: option.label,
          icon: option.icon,
          destructive: Boolean(option.destructive),
          onPress: () => handleSelectAdminTransition(option.key),
        }))}
      />

      <AtelierBottomSheet
        visible={Boolean(cancelSheetMode)}
        onClose={() => setCancelSheetMode(null)}
        title="Cancel Order?"
        subtitle={
          cancelSheetMode === 'admin'
            ? `Cancel Order #${selectedOrder._id.slice(-8).toUpperCase()}? Item stock will be restored and the customer will be notified.`
            : `Cancel Order #${selectedOrder._id.slice(-8).toUpperCase()}? Your items will be restocked immediately and this cannot be undone.`
        }
        showCloseButton={false}
        options={[
          {
            key: 'confirm-cancel',
            label: 'Cancel Order',
            icon: 'close-circle-outline',
            destructive: true,
            onPress: () =>
              cancelSheetMode === 'admin'
                ? handleAdminStatusChange('cancelled')
                : handleCustomerCancelConfirm(),
          },
          {
            key: 'keep-order',
            label: 'Keep Order',
            icon: 'arrow-back-outline',
            onPress: () => setCancelSheetMode(null),
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
    fontSize: 10,
  },
  statusActionsContainer: {
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  cancelButtonOutline: {
    borderColor: theme.colors.error,
  },
  cancelButtonText: {
    color: theme.colors.error,
  },
  statusHelperNote: {
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  reviewCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
    marginHorizontal: -theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    minHeight: 44,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  reviewCtaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  sectionTitle: {
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  itemCard: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  itemCardWithCta: {
    paddingBottom: 0,
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
  customerBlock: {
    marginBottom: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  customerName: {
    marginTop: 2,
    fontFamily: 'Montserrat_500Medium',
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
