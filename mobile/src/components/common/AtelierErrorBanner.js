import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import AtelierText from './AtelierText';
import AtelierPressable from './AtelierPressable';

const BANNER_TONES = {
  error: {
    bg: theme.colors.errorBg,
    border: theme.colors.errorBorder,
    text: theme.colors.error,
    icon: 'alert-circle-outline',
  },
  success: {
    bg: theme.colors.successBg,
    border: theme.colors.successBorder,
    text: theme.colors.success,
    icon: 'checkmark-circle-outline',
  },
  gold: {
    bg: theme.colors.goldLight,
    border: theme.colors.goldBorder,
    text: theme.colors.goldText,
    icon: 'mail-unread-outline',
  },
};

export const AtelierErrorBanner = ({
  message = 'Unable to connect to the server. Check your connection and try again.',
  tone = 'error',
  actionLabel = 'Retry',
  onRetry,
  style,
}) => {
  if (!message) {
    return null;
  }

  const palette = BANNER_TONES[tone] || BANNER_TONES.error;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
        },
        style,
      ]}
    >
      <View style={styles.row}>
        <Ionicons
          name={palette.icon}
          size={20}
          color={palette.text}
          style={styles.icon}
        />
        <AtelierText
          variant="bodySmall"
          color={palette.text}
          style={styles.messageText}
        >
          {message}
        </AtelierText>
        {onRetry && (
          <AtelierPressable
            tone="surface"
            hitSlop={6}
            onPress={onRetry}
            style={[
              styles.retryButton,
              { borderColor: palette.border },
            ]}
          >
            <AtelierText
              variant="caption"
              color={palette.text}
            >
              {actionLabel}
            </AtelierText>
          </AtelierPressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: theme.radii.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: theme.spacing.sm,
  },
  messageText: {
    flex: 1,
    lineHeight: 18,
  },
  retryButton: {
    minHeight: 36,
    paddingHorizontal: theme.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing.sm,
    borderWidth: 1,
    borderRadius: theme.radii.xs,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
});

export default AtelierErrorBanner;
