import React from 'react';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import RootDrawerNavigator from './RootDrawerNavigator';

export const navigationRef = createNavigationContainerRef();

export const navigateFromNotification = (data) => {
  if (!data || !navigationRef.isReady()) {
    return false;
  }

  if (data.screen === 'OrderDetails' && data.orderId) {
    navigationRef.navigate('MainTabs', {
      screen: 'OrdersTab',
      params: {
        screen: 'OrderDetails',
        params: { orderId: data.orderId },
      },
    });
    return true;
  }

  if (data.screen === 'ProductDetails' && data.productId) {
    navigationRef.navigate('MainTabs', {
      screen: 'HomeTab',
      params: {
        screen: 'ProductDetails',
        params: { productId: data.productId },
      },
    });
    return true;
  }

  return false;
};

const linking = {
  prefixes: ['saturationpoint://', 'exp://'],
  config: {
    screens: {
      MainTabs: {
        screens: {
          HomeTab: {
            screens: {
              ProductList: 'products',
              ProductDetails: 'product/:productId',
            },
          },
          OrdersTab: {
            screens: {
              OrdersList: 'orders',
              OrderDetails: 'order/:orderId',
            },
          },
          CartTab: {
            screens: {
              CartScreen: 'cart',
              Checkout: 'checkout',
            },
          },
          UserTab: {
            screens: {
              Profile: 'profile',
              Login: 'login',
            },
          },
        },
      },
    },
  },
};

export const AppNavigator = () => {
  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
    >
      <RootDrawerNavigator />
    </NavigationContainer>
  );
};

export default AppNavigator;
