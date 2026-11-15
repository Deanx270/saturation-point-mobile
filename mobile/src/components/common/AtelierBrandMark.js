import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { theme } from '../../theme';
import AtelierText from './AtelierText';

const LOGO_MARK = require('../../../assets/brand/logo-mark.png');

export const AtelierBrandMark = ({
  variant = 'header',
  title,
  subtitle,
  style,
}) => {
  if (variant === 'drawer') {
    return (
      <View style={[styles.drawerContainer, style]}>
        <View style={styles.drawerMarkFrame}>
          <Image
            source={LOGO_MARK}
            style={styles.drawerMark}
            resizeMode="contain"
          />
        </View>
        <View style={styles.drawerTextGroup}>
          <AtelierText
            variant="title2"
            numberOfLines={1}
            style={styles.drawerWordmark}
          >
            The Saturation Point
          </AtelierText>
          <AtelierText
            variant="caption"
            color={theme.colors.goldText}
            style={styles.drawerTagline}
          >
            FINE WRITING ATELIER
          </AtelierText>
        </View>
      </View>
    );
  }

  if (variant === 'auth') {
    return (
      <View style={[styles.authContainer, style]}>
        <View style={styles.authBrandRow}>
          <Image
            source={LOGO_MARK}
            style={styles.authMark}
            resizeMode="contain"
          />
          <AtelierText
            variant="caption"
            color={theme.colors.goldText}
            style={styles.authBrandLabel}
          >
            THE SATURATION POINT
          </AtelierText>
        </View>
        {title ? (
          <AtelierText
            variant="display"
            style={styles.authHeading}
          >
            {title}
          </AtelierText>
        ) : null}
        {subtitle ? (
          <AtelierText
            variant="bodyLarge"
            color={theme.colors.inkSecondary}
            style={styles.authSubheading}
          >
            {subtitle}
          </AtelierText>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.headerContainer, style]}>
      <Image
        source={LOGO_MARK}
        style={styles.headerMark}
        resizeMode="contain"
      />
      <AtelierText
        variant="title1"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.82}
        style={styles.headerWordmark}
      >
        The Saturation Point
      </AtelierText>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 1,
    gap: 6,
  },
  headerMark: {
    width: 24,
    height: 24,
  },
  headerWordmark: {
    textAlign: 'center',
    letterSpacing: -0.1,
    flexShrink: 1,
  },
  drawerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  drawerMarkFrame: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerMark: {
    width: 26,
    height: 26,
  },
  drawerTextGroup: {
    flex: 1,
  },
  drawerWordmark: {
    fontSize: 17,
    lineHeight: 22,
    color: theme.colors.inkPrimary,
  },
  drawerTagline: {
    letterSpacing: 1.2,
    fontSize: 10,
    marginTop: 2,
  },
  authContainer: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  authBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  authMark: {
    width: 28,
    height: 28,
  },
  authBrandLabel: {
    letterSpacing: 1.6,
  },
  authHeading: {
    marginBottom: theme.spacing.xs,
  },
  authSubheading: {
    lineHeight: 22,
  },
});

export default AtelierBrandMark;
