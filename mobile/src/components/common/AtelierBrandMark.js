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
        <Image
          source={LOGO_MARK}
          style={styles.drawerMark}
          resizeMode="contain"
        />
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
            Fine Writing Atelier
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
            The Saturation Point
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
  drawerMark: {
    width: 30,
    height: 30,
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
    letterSpacing: 0.4,
    fontSize: 11.5,
    lineHeight: 15,
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
    letterSpacing: 0.5,
    fontSize: 12,
  },
  authHeading: {
    marginBottom: theme.spacing.xs,
  },
  authSubheading: {
    lineHeight: 22,
  },
});

export default AtelierBrandMark;
