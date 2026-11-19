import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
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
import AtelierEmptyState from '../../components/common/AtelierEmptyState';
import AtelierErrorBanner from '../../components/common/AtelierErrorBanner';
import AtelierSkeleton from '../../components/common/AtelierSkeleton';
import AtelierHeader from '../../components/common/AtelierHeader';
import AtelierPressable from '../../components/common/AtelierPressable';
import { fetchMyOrders } from '../../redux/ordersSlice';
import {
  formatPrice,
  formatDate,
  formatOrderStatus,
  isValidRemoteOrLocalUri,
  optimizeImageUrl,
} from '../../utils/formatters';
import { runAfterFrame } from '../../utils/afterFrame';

const STATUS_FILTERS = ['All', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'];

export const OrdersListScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { myOrders, loading, error } = useSelector((state) => state.orders);
  const { user } = useSelector((state) => state.auth);

  const [activeStatus, setActiveStatus] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [fetchStarted, setFetchStarted] = useState(myOrders.length > 0 || !user);

  useEffect(() => {
    if (!user) {
      setFetchStarted(true);
      return undefined;
    }
    return runAfterFrame(() => {
      setFetchStarted(true);
      dispatch(fetchMyOrders());
    });
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
    const firstItem = item.orderItems?.[0];
    const extraProductsCount = Math.max(0, (item.orderItems?.length || 0) - 1);
    const hasThumb = isValidRemoteOrLocalUri(firstItem?.image);

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
              Order ID
            </AtelierText>
            <AtelierText
              variant="bodyLarge"
              style={styles.orderIdText}
            >
              #{item._id.slice(-8).toUpperCase()}
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
          <View>
            <AtelierText
              variant="caption"
              color={theme.colors.inkMuted}
              style={styles.footerLabel}
            >
              Date
            </AtelierText>
            <AtelierText
              variant="bodySmall"
              color={theme.colors.inkSecondary}
              style={styles.footerValueText}
            >
              {formatDate(item.createdAt)}
            </AtelierText>
          </View>
          <View>
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
          <View style={styles.totalAlignCol}>
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
              style={styles.totalValue}
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
        <AtelierHeader
          title="Orders"
          leftType="drawer"
          navigation={navigation}
        />
        <AtelierEmptyState
          iconName="lock-closed-outline"
          title="Sign In Required"
          description="Sign in to view your order history."
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

  return (
    <View style={styles.container}>
      <AtelierHeader
        title="Orders"
        leftType="drawer"
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
          onRetry={() => dispatch(fetchMyOrders())}
          style={styles.errorBanner}
        />
      ) : null}

      {(loading || !fetchStarted) && myOrders.length === 0 && !error ? (
        <View style={styles.skeletonPadding}>
          {[1, 2, 3].map((n) => (
            <AtelierCard
              key={n}
              style={styles.orderCard}
            >
              <View style={styles.cardHeader}>
                <View>
                  <AtelierSkeleton
                    height={12}
                    width={54}
                    style={{ marginBottom: 6 }}
                  />
                  <AtelierSkeleton
                    height={15}
                    width={92}
                  />
                </View>
                <AtelierSkeleton
                  height={22}
                  width={74}
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
                <View>
                  <AtelierSkeleton
                    height={12}
                    width={36}
                    style={{ marginBottom: 6 }}
                  />
                  <AtelierSkeleton
                    height={14}
                    width={76}
                  />
                </View>
                <View>
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
                <View style={styles.totalAlignCol}>
                  <AtelierSkeleton
                    height={12}
                    width={36}
                    style={{ marginBottom: 6 }}
                  />
                  <AtelierSkeleton
                    height={14}
                    width={68}
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
          contentContainerStyle={[
            styles.listContent,
            filteredOrders.length === 0 && styles.emptyListContent,
          ]}
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
    marginBottom: theme.spacing.md,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.hero,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
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
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 15,
    lineHeight: 20,
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
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  footerLabel: {
    marginBottom: 2,
  },
  footerValueText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Montserrat_500Medium',
  },
  totalAlignCol: {
    alignItems: 'flex-end',
  },
  totalValue: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
  },
  skeletonPadding: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
});

export default OrdersListScreen;
