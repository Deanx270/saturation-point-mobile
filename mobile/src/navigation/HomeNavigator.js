import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import ProductListScreen from '../screens/product/ProductListScreen';
import ProductDetailsScreen from '../screens/product/ProductDetailsScreen';

const Stack = createNativeStackNavigator();

export const HomeNavigator = () => {
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
        name="ProductList"
        component={ProductListScreen}
      />
      <Stack.Screen
        name="ProductDetails"
        component={ProductDetailsScreen}
      />
    </Stack.Navigator>
  );
};

export default HomeNavigator;
