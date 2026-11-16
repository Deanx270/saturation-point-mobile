import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import OrdersListScreen from '../screens/orders/OrdersListScreen';
import OrderDetailsScreen from '../screens/orders/OrderDetailsScreen';

const Stack = createNativeStackNavigator();

export const OrdersNavigator = () => {
  const { user } = useSelector((state) => state.auth);
  const sessionKey = `${user?._id || 'guest'}_${user?.role || ''}`;

  return (
    <Stack.Navigator
      key={sessionKey}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="OrdersList"
        component={OrdersListScreen}
      />
      <Stack.Screen
        name="OrderDetails"
        component={OrderDetailsScreen}
      />
    </Stack.Navigator>
  );
};

export default OrdersNavigator;
