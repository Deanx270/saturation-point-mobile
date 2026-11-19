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
    const rootState = navigationRef.getRootState();
    const drawerRoute = rootState?.routes?.[0];
    const tabRouteNames = drawerRoute?.state?.routeNames || [];
    const targetTab =
      tabRouteNames.includes('AdminOrdersTab') && !tabRouteNames.includes('OrdersTab')
        ? 'AdminOrdersTab'
        : 'OrdersTab';

    navigationRef.navigate('MainTabs', {
      screen: targetTab,
      params: {
        screen: 'OrderDetails',
        initial: false,
        params: { orderId: data.orderId },
      },
    });
    return true;
  }

  if (data.screen === 'ProductList' && data.productIds) {
    const promoProductIds = Array.isArray(data.productIds)
      ? data.productIds.map((id) => String(id).trim()).filter(Boolean)
      : String(data.productIds)
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);

    if (promoProductIds.length > 0) {
      navigationRef.navigate('MainTabs', {
        screen: 'HomeTab',
        params: {
          screen: 'ProductList',
          params: {
            promoProductIds,
            promotionId: data.promotionId || '',
            discountPercent: Number(data.discountPercent) || 0,
            promoTitle: data.promoTitle || '',
          },
        },
      });
      return true;
    }
  }

  if (data.screen === 'ProductDetails' && data.productId) {
    navigationRef.navigate('MainTabs', {
      screen: 'HomeTab',
      params: {
        screen: 'ProductDetails',
        initial: false,
        params: {
          productId: data.productId,
          discountPercent: Number(data.discountPercent) || 0,
          promoTitle: data.promoTitle || '',
        },
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
              Register: 'register',
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
