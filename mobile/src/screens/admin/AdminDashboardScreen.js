import React, { useCallback, useState } from 'react';
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
import { fetchProducts } from '../../redux/productsSlice';
import { fetchAllOrders } from '../../redux/ordersSlice';
import { fetchCategories } from '../../redux/categoriesSlice';

export const AdminDashboardScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { adminTotal, adminItems } = useSelector((state) => state.products);
  const { allOrders } = useSelector((state) => state.orders);
  const { items: categories } = useSelector((state) => state.categories);
  const [refreshing, setRefreshing] = useState(false);

  const loadSummary = useCallback(async () => {
    await Promise.all([
      dispatch(fetchProducts({ target: 'admin', page: 1, limit: 8 })),
      dispatch(fetchAllOrders()),
      dispatch(fetchCategories()),
    ]);
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      loadSummary();
    }, [loadSummary])
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
      subtitle: 'Add, edit, or restock catalog items',
      icon: 'cube-outline',
      badge: `${productCount}`,
      badgeStatus: 'default',
      onPress: openProducts,
    },
    {
      key: 'orders',
      title: 'Manage Orders',
      subtitle: 'Advance order status and inspect shipments',
      icon: 'clipboard-outline',
      badge: pendingOrdersCount > 0 ? `${pendingOrdersCount} PENDING` : `${allOrders.length}`,
      badgeStatus: pendingOrdersCount > 0 ? 'gold' : 'default',
      onPress: openOrders,
    },
    {
      key: 'categories',
      title: 'Manage Categories',
      subtitle: 'Create and organize store collections',
      icon: 'pricetags-outline',
      badge: `${categories.length}`,
      badgeStatus: 'default',
      onPress: () => navigation.navigate('AdminCategories'),
    },
    {
      key: 'promotions',
      title: 'Send Promotions',
      subtitle: 'Broadcast push alerts for featured discounts',
      icon: 'megaphone-outline',
      badge: 'PUSH',
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
          STORE OVERVIEW
        </AtelierText>

        <View style={styles.statsGrid}>
          <AtelierCard
            style={styles.statCard}
            onPress={openProducts}
          >
            <AtelierText
              variant="caption"
              color={theme.colors.inkMuted}
            >
              PRODUCTS
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
              PENDING ORDERS
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
              IN FULFILLMENT
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
              CATEGORIES
            </AtelierText>
            <AtelierText
              variant="title1"
              color={theme.colors.inkPrimary}
              style={styles.statValue}
            >
              {categories.length}
            </AtelierText>
          </AtelierCard>
        </View>

        <AtelierText
          variant="caption"
          color={theme.colors.inkMuted}
          style={styles.sectionLabel}
        >
          MANAGEMENT TOOLS
        </AtelierText>

        {tools.map((tool) => (
          <AtelierCard
            key={tool.key}
            style={styles.toolCard}
            onPress={tool.onPress}
          >
            <View style={styles.toolRow}>
              <View style={styles.toolIconBox}>
                <Ionicons
                  name={tool.icon}
                  size={20}
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
  toolIconBox: {
    width: 44,
    height: 44,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    gap: theme.spacing.xs,
  },
});

export default AdminDashboardScreen;
