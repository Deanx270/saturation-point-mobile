import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../theme';

export const AtelierCard = ({
  children,
  onPress,
  style,
  subtle = false,
  ...props
}) => {
  const CardComponent = onPress ? TouchableOpacity : View;

  return (
    <CardComponent
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.card,
        subtle ? styles.subtleBackground : styles.surfaceBackground,
        theme.shadows.subtle,
        style,
      ]}
      {...props}
    >
      {children}
    </CardComponent>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    overflow: 'hidden',
  },
  surfaceBackground: {
    backgroundColor: theme.colors.surface,
  },
  subtleBackground: {
    backgroundColor: theme.colors.surfaceSubtle,
  },
});

export default AtelierCard;
