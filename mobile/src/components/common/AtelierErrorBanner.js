import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import AtelierText from './AtelierText';
import AtelierPressable from './AtelierPressable';

export const AtelierErrorBanner = ({
  message = 'Unable to connect to the server. Check your connection and try again.',
  onRetry,
  style,
}) => {
  if (!message) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.row}>
        <Ionicons
          name="alert-circle-outline"
          size={20}
          color={theme.colors.error}
          style={styles.icon}
        />
        <AtelierText
          variant="bodySmall"
          color={theme.colors.error}
          style={styles.messageText}
        >
          {message}
        </AtelierText>
        {onRetry && (
          <AtelierPressable
            tone="surface"
            hitSlop={6}
            onPress={onRetry}
            style={styles.retryButton}
          >
            <AtelierText
              variant="caption"
              color={theme.colors.error}
            >
              Retry
            </AtelierText>
          </AtelierPressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.errorBg,
    borderWidth: 1,
    borderColor: theme.colors.errorBorder,
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
    borderColor: theme.colors.errorBorder,
    borderRadius: theme.radii.xs,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
});

export default AtelierErrorBanner;
