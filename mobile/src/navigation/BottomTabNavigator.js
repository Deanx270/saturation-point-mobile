import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import { StackActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme';
import HomeNavigator from './HomeNavigator';
import CartNavigator from './CartNavigator';
import OrdersNavigator from './OrdersNavigator';
import UserNavigator from './UserNavigator';
import AdminNavigator, {
  AdminProductsNavigator,
  AdminOrdersNavigator,
} from './AdminNavigator';
import CartIconBadge from '../components/common/CartIcon';

const Tab = createBottomTabNavigator();

const AtelierTabBarButton = (props) => (
  <PlatformPressable
    {...props}
    android_ripple={{
      color: 'rgba(202, 138, 4, 0.14)',
      borderless: false,
    }}
  />
);

export const BottomTabNavigator = () => {
  const insets = useSafeAreaInsets();
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';
  const bottomInset =
    Platform.OS === 'ios' ? Math.max(insets.bottom, 20) : insets.bottom;
  const tabBarBottomPadding = Math.max(bottomInset, 10);

  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={{
        headerShown: false,
        animation: 'none',
        freezeOnBlur: false,
        detachInactiveScreens: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: theme.colors.goldText,
        tabBarInactiveTintColor: theme.colors.inkMuted,
        tabBarStyle: [
          styles.tabBar,
          {
            height: 58 + tabBarBottomPadding,
            paddingBottom: tabBarBottomPadding,
          },
        ],
        tabBarItemStyle: styles.tabBarItem,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarButton: (props) => <AtelierTabBarButton {...props} />,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeNavigator}
        options={{
          tabBarLabel: 'Shop',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      {!isAdmin && (
        <Tab.Screen
          name="CartTab"
          component={CartNavigator}
          listeners={({ navigation, route }) => ({
            blur: () => {
              const subState = route?.state;
              const activeSubRoute =
                subState && typeof subState.index === 'number'
                  ? subState.routes?.[subState.index]?.name
                  : null;
              if (
                activeSubRoute === 'OrderConfirmation' &&
                subState?.type === 'stack' &&
                subState?.key &&
                subState.index > 0
              ) {
                navigation.dispatch({
                  ...StackActions.popToTop(),
                  target: subState.key,
                });
              }
            },
            tabPress: () => {
              const tabState = navigation.getState();
              const cartRoute = tabState?.routes?.find((r) => r.name === 'CartTab');
              const subState = cartRoute?.state;
              const activeSubRoute =
                subState && typeof subState.index === 'number'
                  ? subState.routes?.[subState.index]?.name
                  : null;
              if (
                activeSubRoute === 'OrderConfirmation' &&
                subState?.type === 'stack' &&
                subState?.key &&
                subState.index > 0
              ) {
                navigation.dispatch({
                  ...StackActions.popToTop(),
                  target: subState.key,
                });
              }
            },
          })}
          options={{
            tabBarLabel: 'Cart',
            tabBarIcon: ({ color, focused }) => (
              <View>
                <Ionicons
                  name={focused ? 'cart' : 'cart-outline'}
                  size={22}
                  color={color}
                />
                <CartIconBadge />
              </View>
            ),
          }}
        />
      )}

      {!isAdmin && (
        <Tab.Screen
          name="OrdersTab"
          component={OrdersNavigator}
          options={{
            tabBarLabel: 'Orders',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'receipt' : 'receipt-outline'}
                size={22}
                color={color}
              />
            ),
          }}
        />
      )}

      {isAdmin && (
        <Tab.Screen
          name="AdminProductsTab"
          component={AdminProductsNavigator}
          options={{
            tabBarLabel: 'Products',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'cube' : 'cube-outline'}
                size={22}
                color={color}
              />
            ),
          }}
        />
      )}

      {isAdmin && (
        <Tab.Screen
          name="AdminOrdersTab"
          component={AdminOrdersNavigator}
          options={{
            tabBarLabel: 'Orders',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'clipboard' : 'clipboard-outline'}
                size={22}
                color={color}
              />
            ),
          }}
        />
      )}

      {isAdmin && (
        <Tab.Screen
          name="AdminTab"
          component={AdminNavigator}
          options={{
            tabBarLabel: 'Admin',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'grid' : 'grid-outline'}
                size={22}
                color={color}
              />
            ),
          }}
        />
      )}

      <Tab.Screen
        name="UserTab"
        component={UserNavigator}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 6,
    ...theme.shadows.subtle,
  },
  tabBarItem: {
    borderRadius: theme.radii.sm,
    overflow: 'hidden',
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default BottomTabNavigator;
