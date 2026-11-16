import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Alert,
  RefreshControl,
  ScrollView,
  Image,
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
import { fetchAllOrders, updateOrderStatus } from '../../redux/ordersSlice';
import {
  formatPrice,
  formatOrderStatus,
  isValidRemoteOrLocalUri,
} from '../../utils/formatters';

const STATUS_FILTERS = ['All', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'];

const STATUS_TRANSITIONS = {
  pending: [
    { key: 'processing', label: 'Mark as Processing', icon: 'construct-outline' },
    { key: 'cancelled', label: 'Cancel Order', icon: 'close-circle-outline', destructive: true },
  ],
  processing: [
    { key: 'shipped', label: 'Mark as Shipped', icon: 'airplane-outline' },
    { key: 'cancelled', label: 'Cancel Order', icon: 'close-circle-outline', destructive: true },
  ],
  shipped: [
    { key: 'delivered', label: 'Mark as Delivered', icon: 'checkmark-done-circle-outline' },
  ],
  delivered: [],
  cancelled: [],
};

export const AdminOrdersScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { allOrders, loading, error } = useSelector((state) => state.orders);
  const [refreshing, setRefreshing] = useState(false);
  const [activeStatus, setActiveStatus] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const canGoBack = navigation.canGoBack();

  useEffect(() => {
    dispatch(fetchAllOrders());
  }, [dispatch]);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchAllOrders());
    setRefreshing(false);
  };

  const handleStatusChange = async (order, nextStatus) => {
    const result = await dispatch(
      updateOrderStatus({ orderId: order._id, status: nextStatus })
    );
    if (updateOrderStatus.fulfilled.match(result)) {
      Alert.alert(
        'Status Updated',
        `Order status updated to ${formatOrderStatus(nextStatus)}. Notification sent to customer.`
      );
    } else {
      Alert.alert(
        'Update Failed',
        result.payload || 'Unable to update order status.'
      );
    }
  };

  const handleSelectTransition = (order, nextStatus) => {
    if (nextStatus === 'cancelled') {
      Alert.alert(
        'Cancel Order?',
        `Cancel Order #${order._id.slice(-8).toUpperCase()}? Item stock will be restored and the customer will be notified.`,
        [
          { text: 'Keep Order', style: 'cancel' },
          {
            text: 'Cancel Order',
            style: 'destructive',
            onPress: () => handleStatusChange(order, nextStatus),
          },
        ]
      );
      return;
    }
    handleStatusChange(order, nextStatus);
  };

  const handleStatusChangePrompt = (order) => {
    const normalized = String(order.status || 'pending').toLowerCase();
    const transitions = STATUS_TRANSITIONS[normalized] || [];
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
    const transitions = STATUS_TRANSITIONS[normalizedStatus] || [];
    const isFinalized = transitions.length === 0;
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
          {isFinalized ? (
            <AtelierBadge
              label={formatOrderStatus(item.status)}
              status={item.status}
            />
          ) : (
            <AtelierPressable
              tone="subtle"
              stopPropagation
              hitSlop={8}
              onPress={() => handleStatusChangePrompt(item)}
              accessibilityLabel={`Change status for order ${item._id.slice(-8).toUpperCase()}`}
            >
              <AtelierBadge
                label={`${formatOrderStatus(item.status)} ▾`}
                status={item.status}
              />
            </AtelierPressable>
          )}
        </View>

        {firstItem ? (
          <View style={styles.previewRow}>
            {hasThumb ? (
              <Image
                source={{ uri: firstItem.image }}
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
          <View>
            <AtelierText
              variant="caption"
              color={theme.colors.inkMuted}
            >
              Items
            </AtelierText>
            <AtelierText
              variant="bodyMedium"
              color={theme.colors.inkSecondary}
            >
              {totalCount} {totalCount === 1 ? 'item' : 'items'}
            </AtelierText>
          </View>

          <View>
            <AtelierText
              variant="caption"
              color={theme.colors.inkMuted}
            >
              Total
            </AtelierText>
            <AtelierText
              variant="title2"
              color={theme.colors.inkPrimary}
            >
              {formatPrice(item.totalAmount)}
            </AtelierText>
          </View>

          {isFinalized ? (
            <View style={styles.lockedStatusPill}>
              <Ionicons
                name={normalizedStatus === 'delivered' ? 'checkmark-done-outline' : 'lock-closed-outline'}
                size={14}
                color={theme.colors.inkMuted}
              />
              <AtelierText
                variant="caption"
                color={theme.colors.inkMuted}
              >
                {normalizedStatus === 'delivered' ? 'Completed' : 'Closed'}
              </AtelierText>
            </View>
          ) : (
            <AtelierPressable
              tone="surface"
              stopPropagation
              hitSlop={6}
              style={styles.updateButton}
              onPress={() => handleStatusChangePrompt(item)}
            >
              <AtelierText
                variant="caption"
                color={theme.colors.inkPrimary}
              >
                Update Status
              </AtelierText>
            </AtelierPressable>
          )}
        </View>
      </AtelierCard>
    );
  };

  const availableTransitions = selectedOrder
    ? STATUS_TRANSITIONS[String(selectedOrder.status || 'pending').toLowerCase()] || []
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

      {loading && allOrders.length === 0 ? (
        <View style={styles.skeletonPadding}>
          {[1, 2, 3].map((n) => (
            <AtelierSkeleton
              key={n}
              height={120}
              borderRadius={theme.radii.md}
              style={{ marginBottom: 12 }}
            />
          ))}
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item._id}
          renderItem={renderOrderItem}
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
          onPress: () => handleSelectTransition(selectedOrder, option.key),
        }))}
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
    paddingVertical: theme.spacing.md,
  },
  filterScroll: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: theme.radii.xs,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 32,
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
    padding: theme.spacing.lg,
  },
  listContent: {
    padding: theme.spacing.lg,
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  updateButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.radii.xs,
    borderWidth: 1,
    borderColor: theme.colors.borderMedium,
    backgroundColor: theme.colors.surfaceSubtle,
    overflow: 'hidden',
  },
  lockedStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.radii.xs,
    backgroundColor: theme.colors.surfaceSubtle,
  },
});

export default AdminOrdersScreen;
