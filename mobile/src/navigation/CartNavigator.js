import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import CartScreen from '../screens/cart/CartScreen';
import CheckoutScreen from '../screens/cart/CheckoutScreen';
import OrderConfirmationScreen from '../screens/cart/OrderConfirmationScreen';
import ProductDetailsScreen from '../screens/product/ProductDetailsScreen';

const Stack = createNativeStackNavigator();

export const CartNavigator = () => {
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
      <Stack.Screen
        name="ProductDetails"
        component={ProductDetailsScreen}
      />
    </Stack.Navigator>
  );
};

export default CartNavigator;
