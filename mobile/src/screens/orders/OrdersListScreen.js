import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import AtelierText from '../../components/common/AtelierText';
import AtelierCard from '../../components/common/AtelierCard';
import AtelierBadge from '../../components/common/AtelierBadge';
import AtelierEmptyState from '../../components/common/AtelierEmptyState';
import AtelierErrorBanner from '../../components/common/AtelierErrorBanner';
import AtelierSkeleton from '../../components/common/AtelierSkeleton';
import { fetchMyOrders } from '../../redux/ordersSlice';
import { formatPrice, formatDate } from '../../utils/formatters';

const STATUS_FILTERS = ['All', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'];

export const OrdersListScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { myOrders, loading, error } = useSelector((state) => state.orders);
  const { user } = useSelector((state) => state.auth);

  const [activeStatus, setActiveStatus] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      dispatch(fetchMyOrders());
    }
  }, [dispatch, user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchMyOrders());
    setRefreshing(false);
  };

  const filteredOrders = myOrders.filter((order) => {
    if (activeStatus === 'All') {
      return true;
    }
    return order.status?.toLowerCase() === activeStatus.toLowerCase();
  });

  const renderOrderItem = ({ item }) => {
    const totalCount =
      item.orderItems?.reduce((sum, i) => sum + (i.quantity || 1), 0) || 0;

    return (
      <AtelierCard
        style={styles.orderCard}
        onPress={() => navigation.navigate('OrderDetails', { orderId: item._id })}
      >
        <View style={styles.cardHeader}>
          <View>
            <AtelierText
              variant="caption"
              color={theme.colors.inkMuted}
            >
              ORDER ID
            </AtelierText>
            <AtelierText
              variant="title2"
              style={styles.orderIdText}
            >
              #{item._id.slice(-8).toUpperCase()}
            </AtelierText>
          </View>
          <AtelierBadge
            label={item.status.toUpperCase()}
            status={item.status}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.detailsRow}>
          <View>
            <AtelierText
              variant="caption"
              color={theme.colors.inkMuted}
            >
              DATE
            </AtelierText>
            <AtelierText
              variant="bodyMedium"
              color={theme.colors.inkSecondary}
            >
              {formatDate(item.createdAt)}
            </AtelierText>
          </View>
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
        </View>
      </AtelierCard>
    );
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => navigation.openDrawer()}
          >
            <Ionicons
              name="menu-outline"
              size={26}
              color={theme.colors.inkPrimary}
            />
          </TouchableOpacity>
          <AtelierText
            variant="title1"
            style={styles.headerTitle}
          >
            Orders
          </AtelierText>
          <View style={styles.headerIconButton} />
        </View>
        <AtelierEmptyState
          iconName="lock-closed-outline"
          title="Sign In Required"
          description="Sign in to view your order history."
          actionTitle="Sign In"
          onActionPress={() => navigation.navigate('UserTab')}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={() => navigation.openDrawer()}
        >
          <Ionicons
            name="menu-outline"
            size={26}
            color={theme.colors.inkPrimary}
          />
        </TouchableOpacity>
        <AtelierText
          variant="title1"
          style={styles.headerTitle}
        >
          Orders
        </AtelierText>
        <View style={styles.headerIconButton} />
      </View>

      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {STATUS_FILTERS.map((status) => {
            const isSelected = activeStatus === status;
            return (
              <TouchableOpacity
                key={status}
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
                  {status.toUpperCase()}
                </AtelierText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {error ? (
        <AtelierErrorBanner
          message={error}
          onRetry={() => dispatch(fetchMyOrders())}
          style={styles.errorBanner}
        />
      ) : null}

      {loading && myOrders.length === 0 ? (
        <View style={styles.skeletonPadding}>
          {[1, 2, 3].map((n) => (
            <AtelierSkeleton
              key={n}
              height={120}
              borderRadius={theme.radii.md}
              style={{ marginBottom: 16 }}
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
                iconName="receipt-outline"
                title={activeStatus === 'All' ? 'No Orders Yet' : 'No Matching Orders'}
                description={
                  activeStatus === 'All'
                    ? 'You have not placed any orders yet.'
                    : `No orders with status "${activeStatus}" were found.`
                }
                actionTitle={activeStatus === 'All' ? 'Browse Products' : 'Show All Orders'}
                onActionPress={() =>
                  activeStatus === 'All'
                    ? navigation.navigate('HomeTab')
                    : setActiveStatus('All')
                }
              />
            ) : null
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  header: {
    paddingTop: theme.spacing.hero + 16,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.canvas,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerIconButton: {
    width: theme.touchTarget.minWidth,
    height: theme.touchTarget.minHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    textAlign: 'center',
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
  },
  filterChipSelected: {
    backgroundColor: theme.colors.inkPrimary,
    borderColor: theme.colors.inkPrimary,
  },
  errorBanner: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  listContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.hero,
  },
  orderCard: {
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderIdText: {
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
  skeletonPadding: {
    padding: theme.spacing.lg,
  },
});

export default OrdersListScreen;
