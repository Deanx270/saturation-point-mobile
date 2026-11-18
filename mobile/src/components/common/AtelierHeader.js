import React, { useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContext } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import AtelierText from './AtelierText';
import AtelierPressable from './AtelierPressable';

export const AtelierHeader = ({
  title,
  centerComponent,
  leftType = 'back',
  onLeftPress,
  rightIcon,
  rightIconColor = theme.colors.inkPrimary,
  rightIconSize = 24,
  onRightPress,
  rightAccessibilityLabel,
  rightComponent,
  navigation: navigationProp,
  style,
}) => {
  const hookNavigation = useContext(NavigationContext);
  const navigation = navigationProp || hookNavigation;
  const insets = useSafeAreaInsets();

  const handleLeftAction = () => {
    if (onLeftPress) {
      onLeftPress();
      return;
    }
    if (leftType === 'drawer' && typeof navigation?.openDrawer === 'function') {
      navigation.openDrawer();
      return;
    }
    if (typeof navigation?.goBack === 'function') {
      navigation.goBack();
    }
  };

  const renderLeftSlot = () => {
    if (leftType === 'none') {
      return <View style={styles.iconButton} />;
    }
    const isDrawer = leftType === 'drawer';
    return (
      <AtelierPressable
        tone="subtle"
        borderlessRipple
        rippleRadius={theme.touchTarget.minHeight / 2}
        style={styles.iconButton}
        onPress={handleLeftAction}
        accessibilityLabel={isDrawer ? 'Open navigation menu' : 'Go back'}
      >
        <Ionicons
          name={isDrawer ? 'menu-outline' : 'arrow-back'}
          size={24}
          color={theme.colors.inkPrimary}
        />
      </AtelierPressable>
    );
  };

  const renderRightSlot = () => {
    if (rightComponent) {
      return rightComponent;
    }
    if (rightIcon && onRightPress) {
      return (
        <AtelierPressable
          tone="subtle"
          borderlessRipple
          rippleRadius={theme.touchTarget.minHeight / 2}
          style={styles.iconButton}
          onPress={onRightPress}
          accessibilityLabel={rightAccessibilityLabel}
        >
          <Ionicons
            name={rightIcon}
            size={rightIconSize}
            color={rightIconColor}
          />
        </AtelierPressable>
      );
    }
    return <View style={styles.iconButton} />;
  };

  return (
    <View
      style={[
        styles.header,
        { paddingTop: Math.max(insets.top, theme.spacing.lg) + theme.spacing.sm },
        style,
      ]}
    >
      {renderLeftSlot()}
      <View style={styles.centerSlot}>
        {centerComponent || (
          <AtelierText
            variant="title1"
            numberOfLines={1}
            style={styles.title}
          >
            {title}
          </AtelierText>
        )}
      </View>
      {renderRightSlot()}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.canvas,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  iconButton: {
    width: theme.touchTarget.minWidth,
    height: theme.touchTarget.minHeight,
    borderRadius: theme.touchTarget.minHeight / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  centerSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xs,
  },
  title: {
    textAlign: 'center',
  },
});

export default AtelierHeader;
