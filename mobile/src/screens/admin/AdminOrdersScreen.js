import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Alert,
  RefreshControl,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import AtelierText from '../../components/common/AtelierText';
import AtelierCard from '../../components/common/AtelierCard';
import AtelierBadge from '../../components/common/AtelierBadge';
import AtelierPressable from '../../components/common/AtelierPressable';
import AtelierEmptyState from '../../components/common/AtelierEmptyState';
import AtelierErrorBanner from '../../components/common/AtelierErrorBanner';
import AtelierSkeleton from '../../components/common/AtelierSkeleton';
import AtelierBottomSheet from '../../components/common/AtelierBottomSheet';
import AtelierHeader from '../../components/common/AtelierHeader';
import AtelierToast from '../../components/common/AtelierToast';
import { fetchAllOrders, updateOrderStatus } from '../../redux/ordersSlice';
import {
  formatPrice,
  formatOrderStatus,
  isValidRemoteOrLocalUri,
  optimizeImageUrl,
} from '../../utils/formatters';
import { ORDER_STATUS_TRANSITIONS } from '../../utils/orderStatus';
import { runAfterFrame } from '../../utils/afterFrame';

const STATUS_FILTERS = ['All', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'];

export const AdminOrdersScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const {
    allOrders,
    allOrdersLoading: loading,
    updatingOrderId,
    allOrdersError: error,
  } = useSelector((state) => state.orders);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchStarted, setFetchStarted] = useState(allOrders.length > 0);
  const [activeStatus, setActiveStatus] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cancelConfirmOrder, setCancelConfirmOrder] = useState(null);
  const [toastState, setToastState] = useState({
    visible: false,
    message: '',
    key: 0,
  });
  const canGoBack = navigation.canGoBack();

  useEffect(() => {
    return runAfterFrame(() => {
      setFetchStarted(true);
      dispatch(fetchAllOrders());
    });
  }, [dispatch]);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchAllOrders());
    setRefreshing(false);
  };

  const handleStatusChange = async (order, nextStatus) => {
    if (!order?._id || updatingOrderId === order._id) {
      return;
    }
    const result = await dispatch(
      updateOrderStatus({ orderId: order._id, status: nextStatus })
    );
    if (updateOrderStatus.fulfilled.match(result)) {
      setToastState((prev) => ({
        visible: true,
        message: `Order #${order._id.slice(-8).toUpperCase()} updated to ${formatOrderStatus(nextStatus)}`,
        key: prev.key + 1,
      }));
    } else {
      Alert.alert(
        'Update Failed',
        result.payload || 'Unable to update order status.'
      );
    }
  };

  const handleSelectTransition = (order, nextStatus) => {
    if (nextStatus === 'cancelled') {
      setCancelConfirmOrder(order);
      return;
    }
    handleStatusChange(order, nextStatus);
  };

  const handleStatusChangePrompt = (order) => {
    if (updatingOrderId === order._id) {
      return;
    }
    const normalized = String(order.status || 'pending').toLowerCase();
    const transitions = ORDER_STATUS_TRANSITIONS[normalized] || [];
    if (transitions.length === 0) {
      return;
    }
    setSelectedOrder(order);
  };

  const filteredOrders = allOrders.filter((order) => {
    if (activeStatus === 'All') {
      return true;
    }
    return String(order.status || '').toLowerCase() === activeStatus.toLowerCase();
  });

  const renderOrderItem = ({ item }) => {
    const totalCount =
      item.orderItems?.reduce((sum, i) => sum + (i.quantity || 1), 0) || 0;
    const normalizedStatus = String(item.status || 'pending').toLowerCase();
    const transitions = ORDER_STATUS_TRANSITIONS[normalizedStatus] || [];
    const isFinalized = transitions.length === 0;
    const isUpdating = updatingOrderId === item._id;
    const firstItem = item.orderItems?.[0];
    const extraProductsCount = Math.max(0, (item.orderItems?.length || 0) - 1);
    const hasThumb = isValidRemoteOrLocalUri(firstItem?.image);

    return (
      <AtelierCard
        style={styles.card}
        onPress={() => navigation.navigate('OrderDetails', { orderId: item._id })}
      >
        <View style={styles.cardHeader}>
          <View>
            <AtelierText
              variant="caption"
              color={theme.colors.goldText}
            >
              Order #{item._id.slice(-8).toUpperCase()}
            </AtelierText>
            <AtelierText
              variant="title2"
              style={styles.customerName}
            >
              {item.user?.displayName || 'Customer'}
            </AtelierText>
          </View>
          <AtelierBadge
            label={formatOrderStatus(item.status)}
            status={item.status}
          />
        </View>

        {firstItem ? (
          <View style={styles.previewRow}>
            {hasThumb ? (
              <Image
                source={{
                  uri: optimizeImageUrl(firstItem.image, {
                    width: 44,
                    height: 44,
                    crop: 'fill',
                  }),
                }}
                style={styles.previewThumb}
              />
            ) : (
              <View style={[styles.previewThumb, styles.previewThumbPlaceholder]}>
                <Ionicons
                  name="cube-outline"
                  size={18}
                  color={theme.colors.inkMuted}
                />
              </View>
            )}
            <View style={styles.previewTextCol}>
              <AtelierText
                variant="bodyMedium"
                color={theme.colors.inkPrimary}
                numberOfLines={1}
                style={styles.previewTitle}
              >
                {firstItem.name}
              </AtelierText>
              <AtelierText
                variant="bodySmall"
                color={theme.colors.inkMuted}
                numberOfLines={1}
              >
                {extraProductsCount > 0
                  ? `Qty: ${firstItem.quantity} • +${extraProductsCount} more ${extraProductsCount === 1 ? 'item' : 'items'}`
                  : `Qty: ${firstItem.quantity} • ${formatPrice(firstItem.price)}`}
              </AtelierText>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={theme.colors.inkMuted}
            />
          </View>
        ) : null}

        <View style={styles.divider} />

        <View style={styles.detailsRow}>
          <View style={styles.footerColLeft}>
            <AtelierText
              variant="caption"
              color={theme.colors.inkMuted}
              style={styles.footerLabel}
            >
              Items
            </AtelierText>
            <AtelierText
              variant="bodySmall"
              color={theme.colors.inkSecondary}
              style={styles.footerValueText}
            >
              {totalCount} {totalCount === 1 ? 'item' : 'items'}
            </AtelierText>
          </View>

          <View style={styles.footerColMid}>
            <AtelierText
              variant="caption"
              color={theme.colors.inkMuted}
              style={styles.footerLabel}
            >
              Total
            </AtelierText>
            <AtelierText
              variant="bodySmall"
              color={theme.colors.inkPrimary}
              style={styles.footerTotalText}
            >
              {formatPrice(item.totalAmount)}
            </AtelierText>
          </View>

          <View style={styles.footerColRight}>
            <AtelierText
              variant="caption"
              color={theme.colors.inkMuted}
              style={styles.footerLabel}
            >
              Status
            </AtelierText>
            {isFinalized ? (
              <View style={styles.footerStatusRow}>
                <Ionicons
                  name={normalizedStatus === 'delivered' ? 'checkmark-done-outline' : 'lock-closed-outline'}
                  size={14}
                  color={theme.colors.inkMuted}
                />
                <AtelierText
                  variant="bodySmall"
                  color={theme.colors.inkMuted}
                  style={styles.footerValueText}
                >
                  {normalizedStatus === 'delivered' ? 'Completed' : 'Closed'}
                </AtelierText>
              </View>
            ) : (
              <AtelierPressable
                tone="subtle"
                stopPropagation
                disabled={isUpdating}
                hitSlop={{ top: 16, bottom: 12, left: 12, right: 8 }}
                style={[styles.updateActionLink, isUpdating && styles.updateActionDisabled]}
                onPress={() => handleStatusChangePrompt(item)}
              >
                <AtelierText
                  variant="bodySmall"
                  color={isUpdating ? theme.colors.inkMuted : theme.colors.goldText}
                  style={styles.footerActionText}
                >
                  {isUpdating ? 'Updating...' : 'Update'}
                </AtelierText>
                {!isUpdating ? (
                  <Ionicons
                    name="chevron-forward"
                    size={13}
                    color={theme.colors.goldText}
                  />
                ) : null}
              </AtelierPressable>
            )}
          </View>
        </View>
      </AtelierCard>
    );
  };

  const availableTransitions = selectedOrder
    ? ORDER_STATUS_TRANSITIONS[String(selectedOrder.status || 'pending').toLowerCase()] || []
    : [];

  return (
    <View style={styles.container}>
      <AtelierHeader
        title="Manage Orders"
        leftType={canGoBack ? 'back' : 'drawer'}
        navigation={navigation}
      />

      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {STATUS_FILTERS.map((status) => {
            const isSelected = activeStatus === status;
            return (
              <AtelierPressable
                key={status}
                tone={isSelected ? 'solid' : 'surface'}
                hitSlop={6}
                style={[
                  styles.filterChip,
                  isSelected && styles.filterChipSelected,
                ]}
                onPress={() => setActiveStatus(status)}
              >
                <AtelierText
                  variant="caption"
                  color={isSelected ? '#FFFFFF' : theme.colors.inkSecondary}
                >
                  {status === 'All' ? 'All' : formatOrderStatus(status)}
                </AtelierText>
              </AtelierPressable>
            );
          })}
        </ScrollView>
      </View>

      {error ? (
        <AtelierErrorBanner
          message={error}
          onRetry={() => dispatch(fetchAllOrders())}
          style={styles.errorBanner}
        />
      ) : null}

      {(loading || !fetchStarted) && allOrders.length === 0 && !error ? (
        <View style={styles.skeletonPadding}>
          {[1, 2, 3].map((n) => (
            <AtelierCard
              key={n}
              style={styles.card}
            >
              <View style={styles.cardHeader}>
                <View>
                  <AtelierSkeleton
                    height={12}
                    width={96}
                    style={{ marginBottom: 6 }}
                  />
                  <AtelierSkeleton
                    height={16}
                    width={140}
                  />
                </View>
                <AtelierSkeleton
                  height={22}
                  width={72}
                  borderRadius={theme.radii.badge}
                />
              </View>

              <View style={styles.previewRow}>
                <AtelierSkeleton
                  width={44}
                  height={44}
                  borderRadius={theme.radii.xs}
                />
                <View style={styles.previewTextCol}>
                  <AtelierSkeleton
                    height={15}
                    width="74%"
                    style={{ marginBottom: 6 }}
                  />
                  <AtelierSkeleton
                    height={13}
                    width="48%"
                  />
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailsRow}>
                <View style={styles.footerColLeft}>
                  <AtelierSkeleton
                    height={12}
                    width={40}
                    style={{ marginBottom: 6 }}
                  />
                  <AtelierSkeleton
                    height={14}
                    width={48}
                  />
                </View>
                <View style={styles.footerColMid}>
                  <AtelierSkeleton
                    height={12}
                    width={36}
                    style={{ marginBottom: 6 }}
                  />
                  <AtelierSkeleton
                    height={14}
                    width={72}
                  />
                </View>
                <View style={styles.footerColRight}>
                  <AtelierSkeleton
                    height={12}
                    width={42}
                    style={{ marginBottom: 6 }}
                  />
                  <AtelierSkeleton
                    height={14}
                    width={64}
                  />
                </View>
              </View>
            </AtelierCard>
          ))}
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item._id}
          renderItem={renderOrderItem}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.gold}
            />
          }
          ListEmptyComponent={
            !error ? (
              <AtelierEmptyState
                iconName="file-tray-outline"
                title={activeStatus === 'All' ? 'No Orders Yet' : 'No Matching Orders'}
                description={
                  activeStatus === 'All'
                    ? 'Customer orders will appear here.'
                    : `No orders with status "${activeStatus}" were found.`
                }
                actionTitle={activeStatus !== 'All' ? 'Show All Orders' : undefined}
                onActionPress={activeStatus !== 'All' ? () => setActiveStatus('All') : undefined}
              />
            ) : null
          }
        />
      )}

      <AtelierBottomSheet
        visible={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title="Advance Order Status"
        subtitle={
          selectedOrder
            ? `Order #${selectedOrder._id.slice(-8).toUpperCase()} • Currently ${formatOrderStatus(selectedOrder.status)}`
            : ''
        }
        options={availableTransitions.map((option) => ({
          key: option.key,
          label: option.label,
          icon: option.icon,
          destructive: Boolean(option.destructive),
          immediate: option.key !== 'cancelled',
          onPress: () => handleSelectTransition(selectedOrder, option.key),
        }))}
      />

      <AtelierBottomSheet
        visible={Boolean(cancelConfirmOrder)}
        onClose={() => setCancelConfirmOrder(null)}
        title="Cancel Order?"
        subtitle={
          cancelConfirmOrder
            ? `Cancel Order #${cancelConfirmOrder._id.slice(-8).toUpperCase()}? Item stock will be restored and the customer will be notified.`
            : ''
        }
        showCloseButton={false}
        options={[
          {
            key: 'confirm-cancel',
            label: 'Cancel Order',
            icon: 'close-circle-outline',
            destructive: true,
            immediate: true,
            onPress: () => handleStatusChange(cancelConfirmOrder, 'cancelled'),
          },
          {
            key: 'keep-order',
            label: 'Keep Order',
            icon: 'arrow-back-outline',
            onPress: () => setCancelConfirmOrder(null),
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
  filterWrapper: {
    marginHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
    overflow: 'hidden',
  },
  filterScroll: {
    paddingHorizontal: 0,
    gap: theme.spacing.sm,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  filterChipSelected: {
    backgroundColor: theme.colors.inkPrimary,
    borderColor: theme.colors.inkPrimary,
  },
  errorBanner: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  skeletonPadding: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.hero,
  },
  card: {
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerName: {
    marginTop: 2,
    fontSize: 16,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    gap: theme.spacing.md,
  },
  previewThumb: {
    width: 44,
    height: 44,
    borderRadius: theme.radii.xs,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  previewThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  previewTextCol: {
    flex: 1,
  },
  previewTitle: {
    fontFamily: 'Montserrat_500Medium',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  footerColLeft: {
    flex: 0.85,
  },
  footerColMid: {
    flex: 1.05,
  },
  footerColRight: {
    flex: 1.1,
    alignItems: 'flex-end',
  },
  footerLabel: {
    marginBottom: 2,
  },
  footerValueText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Montserrat_500Medium',
  },
  footerTotalText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Montserrat_600SemiBold',
  },
  footerStatusRow: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  updateActionLink: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  updateActionDisabled: {
    opacity: 0.6,
  },
  footerActionText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Montserrat_600SemiBold',
  },
});

export default AdminOrdersScreen;
