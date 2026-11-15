import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminProductsScreen from '../screens/admin/AdminProductsScreen';
import AdminProductFormScreen from '../screens/admin/AdminProductFormScreen';
import AdminOrdersScreen from '../screens/admin/AdminOrdersScreen';
import AdminPromotionsScreen from '../screens/admin/AdminPromotionsScreen';

const Stack = createNativeStackNavigator();

export const AdminNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
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
        name="AdminPromotions"
        component={AdminPromotionsScreen}
      />
    </Stack.Navigator>
  );
};

export default AdminNavigator;
