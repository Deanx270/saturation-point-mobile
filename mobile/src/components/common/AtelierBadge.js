import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../../theme';
import AtelierText from './AtelierText';

export const AtelierBadge = ({ label, status = 'default', style }) => {
  const getBadgeColors = () => {
    switch (status.toLowerCase()) {
      case 'delivered':
      case 'success':
        return {
          bg: theme.colors.successBg,
          text: theme.colors.success,
          border: theme.colors.successBorder,
        };
      case 'cancelled':
      case 'error':
        return {
          bg: theme.colors.errorBg,
          text: theme.colors.error,
          border: theme.colors.errorBorder,
        };
      case 'warning':
      case 'lowstock':
        return {
          bg: '#FEF7E6',
          text: '#B45309',
          border: '#F3D393',
        };
      case 'processing':
      case 'gold':
        return {
          bg: theme.colors.goldLight,
          text: theme.colors.goldText,
          border: 'rgba(161, 98, 7, 0.28)',
        };
      case 'shipped':
        return {
          bg: '#EFF5FA',
          text: '#1E4E79',
          border: '#BDD5EB',
        };
      case 'pending':
        return {
          bg: '#FEF7E6',
          text: '#92400E',
          border: '#F3D393',
        };
      case 'default':
      default:
        return {
          bg: theme.colors.surfaceSubtle,
          text: theme.colors.inkSecondary,
          border: theme.colors.border,
        };
    }
  };

  const colors = getBadgeColors();

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.bg, borderColor: colors.border },
        style,
      ]}
    >
      <AtelierText
        variant="caption"
        color={colors.text}
        style={styles.text}
      >
        {label}
      </AtelierText>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: theme.radii.badge,
    borderWidth: 1,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 10,
    letterSpacing: 0.6,
  },
});

export default AtelierBadge;
