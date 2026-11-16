import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { theme } from '../../theme';
import AtelierText from './AtelierText';
import AtelierPressable from './AtelierPressable';

export const AtelierButton = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  singleLine = false,
  icon,
  iconAlign = 'inline',
  style,
  textStyle,
}) => {
  const isSolid = variant === 'primary' || variant === 'gold' || variant === 'danger';

  const getContainerStyle = () => {
    switch (variant) {
      case 'gold':
        return styles.goldContainer;
      case 'secondary':
        return styles.secondaryContainer;
      case 'outline':
        return styles.outlineContainer;
      case 'danger':
        return styles.dangerContainer;
      case 'primary':
      default:
        return styles.primaryContainer;
    }
  };

  const getTextColor = () => {
    if (disabled) {
      return theme.colors.inkMuted;
    }
    switch (variant) {
      case 'outline':
        return theme.colors.inkPrimary;
      case 'secondary':
        return theme.colors.inkPrimary;
      case 'danger':
        return theme.colors.surface;
      case 'gold':
        return '#FFFFFF';
      case 'primary':
      default:
        return '#FFFFFF';
    }
  };

  return (
    <AtelierPressable
      tone={isSolid ? 'solid' : 'surface'}
      haptic="light"
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        getContainerStyle(),
        disabled && styles.disabledContainer,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={getTextColor()}
        />
      ) : iconAlign === 'left' && icon ? (
        <View style={styles.leftAlignedRow}>
          <View style={styles.leftIconSlot}>{icon}</View>
          <AtelierText
            variant="button"
            color={getTextColor()}
            numberOfLines={singleLine ? 1 : undefined}
            adjustsFontSizeToFit={singleLine}
            style={[styles.buttonLabel, styles.flexLabel, textStyle]}
          >
            {title}
          </AtelierText>
          <View style={styles.rightBalanceSlot} />
        </View>
      ) : (
        <View style={styles.contentRow}>
          {icon && <View style={styles.iconMargin}>{icon}</View>}
          <AtelierText
            variant="button"
            color={getTextColor()}
            numberOfLines={singleLine ? 1 : undefined}
            adjustsFontSizeToFit={singleLine}
            style={[styles.buttonLabel, textStyle]}
          >
            {title}
          </AtelierText>
        </View>
      )}
    </AtelierPressable>
  );
};

const styles = StyleSheet.create({
  base: {
    minHeight: theme.touchTarget.minHeight,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  primaryContainer: {
    backgroundColor: theme.colors.inkPrimary,
  },
  secondaryContainer: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  goldContainer: {
    backgroundColor: theme.colors.gold,
  },
  outlineContainer: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.inkPrimary,
  },
  dangerContainer: {
    backgroundColor: theme.colors.error,
  },
  disabledContainer: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderColor: theme.colors.border,
    opacity: 0.6,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftAlignedRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftIconSlot: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexLabel: {
    flex: 1,
    paddingHorizontal: theme.spacing.sm,
  },
  rightBalanceSlot: {
    width: 24,
  },
  iconMargin: {
    marginRight: theme.spacing.sm,
  },
  buttonLabel: {
    textAlign: 'center',
  },
});

export default AtelierButton;
