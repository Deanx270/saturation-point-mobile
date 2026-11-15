import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CartScreen from '../screens/cart/CartScreen';
import CheckoutScreen from '../screens/cart/CheckoutScreen';
import OrderConfirmationScreen from '../screens/cart/OrderConfirmationScreen';

const Stack = createNativeStackNavigator();

export const CartNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="CartScreen"
        component={CartScreen}
      />
      <Stack.Screen
        name="Checkout"
        component={CheckoutScreen}
      />
      <Stack.Screen
        name="OrderConfirmation"
        component={OrderConfirmationScreen}
      />
    </Stack.Navigator>
  );
};

export default CartNavigator;
