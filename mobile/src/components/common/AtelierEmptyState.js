import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import AtelierText from './AtelierText';
import AtelierButton from './AtelierButton';

export const AtelierEmptyState = ({
  iconName = 'search-outline',
  title = 'Nothing Here Yet',
  description = 'No items to display right now.',
  actionTitle,
  onActionPress,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        <Ionicons
          name={iconName}
          size={36}
          color={theme.colors.inkSecondary}
        />
      </View>
      <AtelierText
        variant="title2"
        style={styles.title}
      >
        {title}
      </AtelierText>
      <AtelierText
        variant="bodyMedium"
        color={theme.colors.inkMuted}
        style={styles.description}
      >
        {description}
      </AtelierText>
      {actionTitle && onActionPress && (
        <AtelierButton
          title={actionTitle}
          onPress={onActionPress}
          variant="outline"
          style={styles.actionButton}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.hero,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  description: {
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
    marginBottom: theme.spacing.xl,
  },
  actionButton: {
    minWidth: 160,
  },
});

export default AtelierEmptyState;
