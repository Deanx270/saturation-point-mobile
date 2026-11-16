import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminProductsScreen from '../screens/admin/AdminProductsScreen';
import AdminProductFormScreen from '../screens/admin/AdminProductFormScreen';
import AdminOrdersScreen from '../screens/admin/AdminOrdersScreen';
import AdminPromotionsScreen from '../screens/admin/AdminPromotionsScreen';
import AdminCategoriesScreen from '../screens/admin/AdminCategoriesScreen';
import AdminBrandsScreen from '../screens/admin/AdminBrandsScreen';
import OrderDetailsScreen from '../screens/orders/OrderDetailsScreen';

const Stack = createNativeStackNavigator();

const SHARED_SCREEN_OPTIONS = {
  headerShown: false,
  animation: 'slide_from_right',
};

export const AdminProductsNavigator = () => {
  return (
    <Stack.Navigator screenOptions={SHARED_SCREEN_OPTIONS}>
      <Stack.Screen
        name="AdminProducts"
        component={AdminProductsScreen}
      />
      <Stack.Screen
        name="AdminProductForm"
        component={AdminProductFormScreen}
      />
    </Stack.Navigator>
  );
};

export const AdminOrdersNavigator = () => {
  return (
    <Stack.Navigator screenOptions={SHARED_SCREEN_OPTIONS}>
      <Stack.Screen
        name="AdminOrders"
        component={AdminOrdersScreen}
      />
      <Stack.Screen
        name="OrderDetails"
        component={OrderDetailsScreen}
      />
    </Stack.Navigator>
  );
};

export const AdminNavigator = () => {
  return (
    <Stack.Navigator screenOptions={SHARED_SCREEN_OPTIONS}>
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
      />
      <Stack.Screen
        name="AdminProducts"
        component={AdminProductsScreen}
      />
      <Stack.Screen
        name="AdminProductForm"
        component={AdminProductFormScreen}
      />
      <Stack.Screen
        name="AdminOrders"
        component={AdminOrdersScreen}
      />
      <Stack.Screen
        name="OrderDetails"
        component={OrderDetailsScreen}
      />
      <Stack.Screen
        name="AdminPromotions"
        component={AdminPromotionsScreen}
      />
      <Stack.Screen
        name="AdminCategories"
        component={AdminCategoriesScreen}
      />
      <Stack.Screen
        name="AdminBrands"
        component={AdminBrandsScreen}
      />
    </Stack.Navigator>
  );
};

export default AdminNavigator;
