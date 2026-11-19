import React, { useCallback, useState, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import AtelierHeader from '../../components/common/AtelierHeader';
import AtelierCard from '../../components/common/AtelierCard';
import AtelierText from '../../components/common/AtelierText';
import AtelierBadge from '../../components/common/AtelierBadge';
import AtelierSkeleton from '../../components/common/AtelierSkeleton';
import { fetchProducts } from '../../redux/productsSlice';
import { fetchAllOrders } from '../../redux/ordersSlice';
import { fetchCategories } from '../../redux/categoriesSlice';
import { fetchBrands } from '../../redux/brandsSlice';
import { runAfterFrame } from '../../utils/afterFrame';

export const AdminDashboardScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { adminTotal, adminItems, adminLoading } = useSelector((state) => state.products);
  const { allOrders, allOrdersLoading } = useSelector((state) => state.orders);
  const { items: categories } = useSelector((state) => state.categories);
  const { items: brands } = useSelector((state) => state.brands);
  const hasCachedSummary =
    adminItems.length > 0 || allOrders.length > 0 || categories.length > 0;
  const [refreshing, setRefreshing] = useState(false);
  const [initialSummarySettled, setInitialSummarySettled] = useState(hasCachedSummary);
  const lastLoadedAtRef = useRef(0);

  const loadSummary = useCallback(async () => {
    lastLoadedAtRef.current = Date.now();
    await Promise.all([
      dispatch(fetchProducts({ target: 'admin', page: 1, limit: 8 })),
      dispatch(fetchAllOrders()),
      dispatch(fetchCategories()),
      dispatch(fetchBrands()),
    ]);
    setInitialSummarySettled(true);
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      if (hasCachedSummary && Date.now() - lastLoadedAtRef.current < 30000) {
        return undefined;
      }
      return runAfterFrame(() => {
        loadSummary();
      });
    }, [loadSummary, hasCachedSummary])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSummary();
    setRefreshing(false);
  };

  const pendingOrdersCount = allOrders.filter(
    (order) => String(order.status || '').toLowerCase() === 'pending'
  ).length;
  const activeOrdersCount = allOrders.filter((order) => {
    const st = String(order.status || '').toLowerCase();
    return st === 'pending' || st === 'processing' || st === 'shipped';
  }).length;
  const productCount = adminTotal || adminItems.length;

  const openProducts = () => {
    const parent = navigation.getParent();
    if (parent?.getState?.().routeNames?.includes('AdminProductsTab')) {
      parent.navigate('AdminProductsTab', { screen: 'AdminProducts' });
      return;
    }
    navigation.navigate('AdminProducts');
  };

  const openOrders = () => {
    const parent = navigation.getParent();
    if (parent?.getState?.().routeNames?.includes('AdminOrdersTab')) {
      parent.navigate('AdminOrdersTab', { screen: 'AdminOrders' });
      return;
    }
    navigation.navigate('AdminOrders');
  };

  const tools = [
    {
      key: 'products',
      title: 'Manage Products',
      subtitle: 'Edit and restock catalog',
      icon: 'cube-outline',
      badge: `${productCount}`,
      badgeStatus: 'default',
      onPress: openProducts,
    },
    {
      key: 'orders',
      title: 'Manage Orders',
      subtitle: 'Track & fulfill',
      icon: 'clipboard-outline',
      badge: pendingOrdersCount > 0 ? `${pendingOrdersCount} Pending` : `${allOrders.length}`,
      badgeStatus: pendingOrdersCount > 0 ? 'gold' : 'default',
      onPress: openOrders,
    },
    {
      key: 'categories',
      title: 'Manage Categories',
      subtitle: 'Organize store collections',
      icon: 'pricetags-outline',
      badge: `${categories.length}`,
      badgeStatus: 'default',
      onPress: () => navigation.navigate('AdminCategories'),
    },
    {
      key: 'brands',
      title: 'Manage Brands',
      subtitle: 'Curate catalog makers',
      icon: 'bookmark-outline',
      badge: `${brands.length}`,
      badgeStatus: 'default',
      onPress: () => navigation.navigate('AdminBrands'),
    },
    {
      key: 'promotions',
      title: 'Send Promotions',
      subtitle: 'Broadcast discount alerts',
      icon: 'megaphone-outline',
      badge: 'Push',
      badgeStatus: 'gold',
      onPress: () => navigation.navigate('AdminPromotions'),
    },
  ];

  return (
    <View style={styles.container}>
      <AtelierHeader
        title="Admin Console"
        leftType="drawer"
        navigation={navigation}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.gold}
          />
        }
      >
        <AtelierText
          variant="caption"
          color={theme.colors.inkMuted}
          style={styles.sectionLabel}
        >
          Store Overview
        </AtelierText>

        <View style={styles.statsGrid}>
          {(!initialSummarySettled && !hasCachedSummary) ||
          ((adminLoading || allOrdersLoading) && !hasCachedSummary) ? (
            [1, 2, 3, 4].map((slot) => (
              <View
                key={slot}
                style={[styles.statCard, styles.statSkeletonCard]}
              >
                <AtelierSkeleton
                  height={12}
                  width="55%"
                  style={{ marginBottom: 10 }}
                />
                <AtelierSkeleton
                  height={26}
                  width="35%"
                />
              </View>
            ))
          ) : (
            <>
              <AtelierCard
                style={styles.statCard}
                onPress={openProducts}
              >
                <AtelierText
                  variant="caption"
                  color={theme.colors.inkMuted}
                >
                  Products
                </AtelierText>
                <AtelierText
                  variant="title1"
                  color={theme.colors.inkPrimary}
                  style={styles.statValue}
                >
                  {productCount}
                </AtelierText>
              </AtelierCard>

              <AtelierCard
                style={styles.statCard}
                onPress={openOrders}
              >
                <AtelierText
                  variant="caption"
                  color={theme.colors.goldText}
                >
                  Pending Orders
                </AtelierText>
                <AtelierText
                  variant="title1"
                  color={theme.colors.inkPrimary}
                  style={styles.statValue}
                >
                  {pendingOrdersCount}
                </AtelierText>
              </AtelierCard>

              <AtelierCard
                style={styles.statCard}
                onPress={openOrders}
              >
                <AtelierText
                  variant="caption"
                  color={theme.colors.inkMuted}
                >
                  In Fulfillment
                </AtelierText>
                <AtelierText
                  variant="title1"
                  color={theme.colors.inkPrimary}
                  style={styles.statValue}
                >
                  {activeOrdersCount}
                </AtelierText>
              </AtelierCard>

              <AtelierCard
                style={styles.statCard}
                onPress={() => navigation.navigate('AdminCategories')}
              >
                <AtelierText
                  variant="caption"
                  color={theme.colors.inkMuted}
                >
                  Categories
                </AtelierText>
                <AtelierText
                  variant="title1"
                  color={theme.colors.inkPrimary}
                  style={styles.statValue}
                >
                  {categories.length}
                </AtelierText>
              </AtelierCard>
            </>
          )}
        </View>

        <AtelierText
          variant="caption"
          color={theme.colors.inkMuted}
          style={styles.sectionLabel}
        >
          Management Tools
        </AtelierText>

        {tools.map((tool) => (
          <AtelierCard
            key={tool.key}
            style={styles.toolCard}
            onPress={tool.onPress}
          >
            <View style={styles.toolRow}>
              <View style={styles.toolIconSlot}>
                <Ionicons
                  name={tool.icon}
                  size={24}
                  color={theme.colors.inkPrimary}
                />
              </View>
              <View style={styles.toolInfo}>
                <AtelierText
                  variant="title2"
                  style={styles.toolTitle}
                >
                  {tool.title}
                </AtelierText>
                <AtelierText
                  variant="bodySmall"
                  color={theme.colors.inkMuted}
                  numberOfLines={1}
                >
                  {tool.subtitle}
                </AtelierText>
              </View>
              <View style={styles.toolRight}>
                <AtelierBadge
                  label={tool.badge}
                  status={tool.badgeStatus}
                />
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={theme.colors.inkMuted}
                />
              </View>
            </View>
          </AtelierCard>
        ))}
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
  sectionLabel: {
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  statCard: {
    width: '48.5%',
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
  },
  statSkeletonCard: {
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statValue: {
    marginTop: theme.spacing.xs,
  },
  toolCard: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  toolIconSlot: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolInfo: {
    flex: 1,
  },
  toolTitle: {
    fontSize: 16,
  },
  toolRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
});

export default AdminDashboardScreen;
