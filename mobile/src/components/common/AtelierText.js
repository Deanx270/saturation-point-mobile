import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { theme } from '../../theme';

export const AtelierText = ({
  variant = 'bodyMedium',
  color,
  style,
  children,
  numberOfLines,
  ...props
}) => {
  const variantStyle = theme.typography[variant] || theme.typography.bodyMedium;
  const textColor = color || theme.colors.inkPrimary;

  return (
    <Text
      numberOfLines={numberOfLines}
      style={[styles.base, variantStyle, { color: textColor }, style]}
      {...props}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
  },
});

export default AtelierText;
