import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, Pressable } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StackActions, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
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

const AtelierTabBarButton = ({
  children,
  onPress,
  onLongPress,
  style,
  accessibilityState,
  accessibilityLabel,
}) => (
  <Pressable
    onPress={onPress}
    onLongPress={onLongPress}
    accessibilityRole="button"
    accessibilityState={accessibilityState}
    accessibilityLabel={accessibilityLabel}
    style={({ pressed }) => [style, pressed && styles.tabButtonPressed]}
  >
    {children}
  </Pressable>
);

export const BottomTabNavigator = () => {
  const navigation = useNavigation();
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';
  const sessionKey = `${user?._id || 'guest'}_${user?.role || ''}`;
  const prevSessionRef = useRef(sessionKey);

  useEffect(() => {
    if (prevSessionRef.current === sessionKey) {
      return;
    }
    prevSessionRef.current = sessionKey;
    const tabState = navigation.getState?.();
    if (!tabState?.routes) {
      return;
    }
    tabState.routes.forEach((route) => {
      if (
        route.name !== 'UserTab' &&
        route.state?.key &&
        typeof route.state.index === 'number' &&
        route.state.index > 0
      ) {
        navigation.dispatch({
          ...StackActions.popToTop(),
          target: route.state.key,
        });
      }
    });
  }, [sessionKey, navigation]);

  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={{
        headerShown: false,
        animation: 'none',
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: theme.colors.goldText,
        tabBarInactiveTintColor: theme.colors.inkMuted,
        tabBarStyle: styles.tabBar,
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
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    ...theme.shadows.subtle,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  tabButtonPressed: {
    opacity: 0.68,
  },
});

export default BottomTabNavigator;
