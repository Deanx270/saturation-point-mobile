import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import AtelierText from './AtelierText';
import AtelierButton from './AtelierButton';

export const AtelierEmptyState = ({
  iconName = 'search-outline',
  iconShape = 'square',
  title = 'Nothing Here Yet',
  description = 'No items to display right now.',
  actionTitle,
  onActionPress,
  actionVariant = 'outline',
  secondaryActionTitle,
  onSecondaryActionPress,
  secondaryActionVariant = 'outline',
  centered = true,
  fullWidthActions = false,
  style,
}) => {
  return (
    <View style={[styles.container, centered && styles.centered, style]}>
      <View
        style={[
          styles.iconFrame,
          iconShape === 'circle' && styles.circleIconFrame,
        ]}
      >
        <Ionicons
          name={iconName}
          size={36}
          color={theme.colors.inkSecondary}
        />
      </View>
      <AtelierText
        variant="title1"
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
      {actionTitle && onActionPress ? (
        <View style={[styles.actionsWrapper, fullWidthActions && styles.actionsFullWidth]}>
          <AtelierButton
            title={actionTitle}
            onPress={onActionPress}
            variant={actionVariant}
            style={[
              fullWidthActions ? styles.fullWidthButton : styles.compactButton,
              secondaryActionTitle ? styles.primaryButtonSpacing : null,
            ]}
          />
          {secondaryActionTitle && onSecondaryActionPress ? (
            <AtelierButton
              title={secondaryActionTitle}
              onPress={onSecondaryActionPress}
              variant={secondaryActionVariant}
              style={fullWidthActions ? styles.fullWidthButton : styles.compactButton}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: theme.spacing.hero,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
  },
  iconFrame: {
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
  circleIconFrame: {
    borderRadius: 36,
  },
  title: {
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  description: {
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
    marginBottom: theme.spacing.xl,
  },
  actionsWrapper: {
    alignItems: 'center',
  },
  actionsFullWidth: {
    width: '100%',
  },
  compactButton: {
    minWidth: 180,
  },
  fullWidthButton: {
    width: '100%',
  },
  primaryButtonSpacing: {
    marginBottom: theme.spacing.md,
  },
});

export default AtelierEmptyState;
