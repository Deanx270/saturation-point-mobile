import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { theme } from '../../theme';
import AtelierText from '../../components/common/AtelierText';
import AtelierCard from '../../components/common/AtelierCard';
import AtelierBadge from '../../components/common/AtelierBadge';
import AtelierEmptyState from '../../components/common/AtelierEmptyState';
import AtelierErrorBanner from '../../components/common/AtelierErrorBanner';
import AtelierSkeleton from '../../components/common/AtelierSkeleton';
import AtelierBottomSheet from '../../components/common/AtelierBottomSheet';
import AtelierHeader from '../../components/common/AtelierHeader';
import { fetchAllOrders, updateOrderStatus } from '../../redux/ordersSlice';
import { formatPrice } from '../../utils/formatters';

const STATUS_OPTIONS = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

export const AdminOrdersScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { allOrders, loading, error } = useSelector((state) => state.orders);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

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
        `Order status updated to ${nextStatus.toUpperCase()}. Notification sent to customer.`
      );
    } else {
      Alert.alert(
        'Update Failed',
        result.payload || 'Unable to update order status.'
      );
    }
  };

  const handleStatusChangePrompt = (order) => {
    setSelectedOrder(order);
  };

  const renderOrderItem = ({ item }) => {
    const totalCount =
      item.orderItems?.reduce((sum, i) => sum + (i.quantity || 1), 0) || 0;

    return (
      <AtelierCard style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <AtelierText
              variant="caption"
              color={theme.colors.goldText}
            >
              ORDER #{item._id.slice(-8).toUpperCase()}
            </AtelierText>
            <AtelierText
              variant="title2"
              style={styles.customerName}
            >
              {item.user?.displayName || 'Customer'}
            </AtelierText>
          </View>
          <TouchableOpacity onPress={() => handleStatusChangePrompt(item)}>
            <AtelierBadge
              label={`${item.status.toUpperCase()} ▾`}
              status={item.status}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailsRow}>
          <View>
            <AtelierText
              variant="caption"
              color={theme.colors.inkMuted}
            >
              ITEMS
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
              TOTAL
            </AtelierText>
            <AtelierText
              variant="title2"
              color={theme.colors.inkPrimary}
            >
              {formatPrice(item.totalAmount)}
            </AtelierText>
          </View>

          <TouchableOpacity
            style={styles.updateButton}
            onPress={() => handleStatusChangePrompt(item)}
          >
            <AtelierText
              variant="caption"
              color={theme.colors.inkPrimary}
            >
              UPDATE STATUS
            </AtelierText>
          </TouchableOpacity>
        </View>
      </AtelierCard>
    );
  };

  return (
    <View style={styles.container}>
      <AtelierHeader
        title="Manage Orders"
        leftType="drawer"
        navigation={navigation}
      />

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
          data={allOrders}
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
                title="No Orders Yet"
                description="Customer orders will appear here."
              />
            ) : null
          }
        />
      )}

      <AtelierBottomSheet
        visible={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title="Update Order Status"
        subtitle={
          selectedOrder
            ? `Order #${selectedOrder._id.slice(-8).toUpperCase()}`
            : ''
        }
        options={
          selectedOrder
            ? [
                ...STATUS_OPTIONS.map((st) => ({
                  key: st,
                  label: st.charAt(0).toUpperCase() + st.slice(1),
                  selected: selectedOrder.status === st,
                  destructive: st === 'cancelled',
                  onPress: () => handleStatusChange(selectedOrder, st),
                })),
                {
                  key: 'cancel',
                  label: 'Cancel',
                  icon: 'close-outline',
                  onPress: () => setSelectedOrder(null),
                },
              ]
            : []
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
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
  },
});

export default AdminOrdersScreen;
