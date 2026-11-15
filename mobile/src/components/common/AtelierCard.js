import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../../theme';
import AtelierPressable from './AtelierPressable';

export const AtelierCard = ({
  children,
  onPress,
  style,
  subtle = false,
  ...props
}) => {
  const cardStyles = [
    styles.card,
    subtle ? styles.subtleBackground : styles.surfaceBackground,
    theme.shadows.subtle,
    style,
  ];

  if (!onPress) {
    return (
      <View
        style={cardStyles}
        {...props}
      >
        {children}
      </View>
    );
  }

  return (
    <AtelierPressable
      tone="none"
      onPress={onPress}
      pressedStyle={styles.cardPressed}
      style={cardStyles}
      {...props}
    >
      {children}
    </AtelierPressable>
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
  cardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  surfaceBackground: {
    backgroundColor: theme.colors.surface,
  },
  subtleBackground: {
    backgroundColor: theme.colors.surfaceSubtle,
  },
});

export default AtelierCard;
