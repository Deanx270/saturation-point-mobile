import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme';
import AtelierText from '../components/common/AtelierText';
import AtelierBadge from '../components/common/AtelierBadge';
import AtelierBrandMark from '../components/common/AtelierBrandMark';
import AtelierPressable from '../components/common/AtelierPressable';
import AtelierAvatar from '../components/common/AtelierAvatar';
import { requestSignOut } from '../redux/authSlice';

export const DrawerContent = ({ navigation }) => {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    navigation.closeDrawer();
    dispatch(requestSignOut());
  };

  const navigateTo = (tabName, screenName) => {
    navigation.closeDrawer();
    navigation.navigate('MainTabs', {
      screen: tabName,
      params: screenName ? { screen: screenName } : undefined,
    });
  };

  const isAdmin = user?.role === 'admin';

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.brandBanner,
          { paddingTop: Math.max(insets.top, theme.spacing.lg) + theme.spacing.sm },
        ]}
      >
        <AtelierBrandMark variant="drawer" />
      </View>

      <View style={styles.divider} />

      <View style={styles.profileHeader}>
        <View style={styles.avatarBorder}>
          <AtelierAvatar
            uri={user?.photoURL}
            name={user?.displayName}
            size={50}
          />
        </View>
        <View style={styles.profileDetails}>
          <AtelierText
            variant="title2"
            numberOfLines={1}
            style={styles.userName}
          >
            {user ? user.displayName : 'Guest'}
          </AtelierText>
          <AtelierText
            variant="bodySmall"
            color={theme.colors.inkMuted}
            numberOfLines={2}
            style={styles.userEmail}
          >
            {user ? user.email : 'Sign in to manage orders and profile'}
          </AtelierText>
          {user && (
            <View style={styles.badgeRow}>
              <AtelierBadge
                label={user.role === 'admin' ? 'Admin' : 'Member'}
                status={user.role === 'admin' ? 'gold' : 'default'}
              />
            </View>
          )}
        </View>
      </View>

      <View style={styles.divider} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.menuContainer}
      >
        <AtelierPressable
          tone="surface"
          style={styles.menuItem}
          onPress={() => navigateTo('HomeTab', 'ProductList')}
        >
          <Ionicons
            name="home-outline"
            size={20}
            color={theme.colors.inkPrimary}
          />
          <AtelierText
            variant="bodyMedium"
            style={styles.menuLabel}
          >
            Shop
          </AtelierText>
        </AtelierPressable>

        {!isAdmin && (
          <AtelierPressable
            tone="surface"
            style={styles.menuItem}
            onPress={() => navigateTo('CartTab', 'CartScreen')}
          >
            <Ionicons
              name="cart-outline"
              size={20}
              color={theme.colors.inkPrimary}
            />
            <AtelierText
              variant="bodyMedium"
              style={styles.menuLabel}
            >
              Cart
            </AtelierText>
          </AtelierPressable>
        )}

        {!isAdmin && (
          <AtelierPressable
            tone="surface"
            style={styles.menuItem}
            onPress={() => navigateTo('OrdersTab', 'OrdersList')}
          >
            <Ionicons
              name="receipt-outline"
              size={20}
              color={theme.colors.inkPrimary}
            />
            <AtelierText
              variant="bodyMedium"
              style={styles.menuLabel}
            >
              Orders
            </AtelierText>
          </AtelierPressable>
        )}

        <AtelierPressable
          tone="surface"
          style={styles.menuItem}
          onPress={() => navigateTo('UserTab', 'Profile')}
        >
          <Ionicons
            name="person-outline"
            size={20}
            color={theme.colors.inkPrimary}
          />
          <AtelierText
            variant="bodyMedium"
            style={styles.menuLabel}
          >
            Profile
          </AtelierText>
        </AtelierPressable>

        {isAdmin && (
          <>
            <View style={styles.menuSectionHeader}>
              <AtelierText
                variant="caption"
                color={theme.colors.goldText}
              >
                Admin
              </AtelierText>
            </View>

            <AtelierPressable
              tone="surface"
              style={styles.menuItem}
              onPress={() => navigateTo('AdminTab', 'AdminDashboard')}
            >
              <Ionicons
                name="grid-outline"
                size={20}
                color={theme.colors.inkPrimary}
              />
              <AtelierText
                variant="bodyMedium"
                style={styles.menuLabel}
              >
                Admin Console
              </AtelierText>
            </AtelierPressable>

            <AtelierPressable
              tone="surface"
              style={styles.menuItem}
              onPress={() => navigateTo('AdminProductsTab', 'AdminProducts')}
            >
              <Ionicons
                name="cube-outline"
                size={20}
                color={theme.colors.inkPrimary}
              />
              <AtelierText
                variant="bodyMedium"
                style={styles.menuLabel}
              >
                Manage Products
              </AtelierText>
            </AtelierPressable>

            <AtelierPressable
              tone="surface"
              style={styles.menuItem}
              onPress={() => navigateTo('AdminTab', 'AdminCategories')}
            >
              <Ionicons
                name="pricetags-outline"
                size={20}
                color={theme.colors.inkPrimary}
              />
              <AtelierText
                variant="bodyMedium"
                style={styles.menuLabel}
              >
                Manage Categories
              </AtelierText>
            </AtelierPressable>

            <AtelierPressable
              tone="surface"
              style={styles.menuItem}
              onPress={() => navigateTo('AdminTab', 'AdminBrands')}
            >
              <Ionicons
                name="bookmark-outline"
                size={20}
                color={theme.colors.inkPrimary}
              />
              <AtelierText
                variant="bodyMedium"
                style={styles.menuLabel}
              >
                Manage Brands
              </AtelierText>
            </AtelierPressable>

            <AtelierPressable
              tone="surface"
              style={styles.menuItem}
              onPress={() => navigateTo('AdminOrdersTab', 'AdminOrders')}
            >
              <Ionicons
                name="clipboard-outline"
                size={20}
                color={theme.colors.inkPrimary}
              />
              <AtelierText
                variant="bodyMedium"
                style={styles.menuLabel}
              >
                Manage Orders
              </AtelierText>
            </AtelierPressable>

            <AtelierPressable
              tone="surface"
              style={styles.menuItem}
              onPress={() => navigateTo('AdminTab', 'AdminPromotions')}
            >
              <Ionicons
                name="megaphone-outline"
                size={20}
                color={theme.colors.inkPrimary}
              />
              <AtelierText
                variant="bodyMedium"
                style={styles.menuLabel}
              >
                Send Promotions
              </AtelierText>
            </AtelierPressable>
          </>
        )}
      </ScrollView>

      <View style={styles.footerContainer}>
        <View style={styles.divider} />
        {user ? (
          <AtelierPressable
            tone="surface"
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Ionicons
              name="log-out-outline"
              size={20}
              color={theme.colors.error}
            />
            <AtelierText
              variant="button"
              color={theme.colors.error}
              style={styles.logoutLabel}
            >
              Sign Out
            </AtelierText>
          </AtelierPressable>
        ) : (
          <AtelierPressable
            tone="surface"
            style={styles.loginButton}
            onPress={() => navigateTo('UserTab', 'Login')}
          >
            <Ionicons
              name="log-in-outline"
              size={20}
              color={theme.colors.goldText}
            />
            <AtelierText
              variant="button"
              color={theme.colors.goldText}
              style={styles.logoutLabel}
            >
              Sign In
            </AtelierText>
          </AtelierPressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  brandBanner: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
  },
  profileHeader: {
    paddingTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBorder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.borderMedium,
    padding: 2,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileDetails: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  userName: {
    color: theme.colors.inkPrimary,
  },
  userEmail: {
    marginTop: 2,
  },
  badgeRow: {
    marginTop: theme.spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.lg,
  },
  menuContainer: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.sm,
    minHeight: theme.touchTarget.minHeight,
    overflow: 'hidden',
  },
  menuLabel: {
    marginLeft: theme.spacing.md,
    fontWeight: '500',
  },
  menuSectionHeader: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xs,
  },
  footerContainer: {
    paddingBottom: theme.spacing.hero,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    minHeight: theme.touchTarget.minHeight,
    overflow: 'hidden',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    minHeight: theme.touchTarget.minHeight,
    overflow: 'hidden',
  },
  logoutLabel: {
    marginLeft: theme.spacing.md,
  },
});

export default DrawerContent;
