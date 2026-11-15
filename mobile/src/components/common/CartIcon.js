import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { selectCartCount } from '../../redux/cartSlice';
import { theme } from '../../theme';
import AtelierText from './AtelierText';

export const CartIconBadge = () => {
  const count = useSelector(selectCartCount);

  if (count <= 0) {
    return null;
  }

  return (
    <View style={styles.badgeContainer}>
      <AtelierText
        variant="caption"
        color="#FFFFFF"
        style={styles.badgeText}
      >
        {count > 99 ? '99+' : count}
      </AtelierText>
    </View>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: theme.colors.gold,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: theme.colors.surface,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 11,
  },
});

export default CartIconBadge;
