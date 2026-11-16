import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
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

export const BottomTabNavigator = () => {
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';

  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: theme.colors.goldText,
        tabBarInactiveTintColor: theme.colors.inkMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
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
});

export default BottomTabNavigator;
