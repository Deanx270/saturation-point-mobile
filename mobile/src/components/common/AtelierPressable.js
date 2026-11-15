import React from 'react';
import { Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '../../theme';

const DEFAULT_RIPPLE_COLORS = {
  solid: 'rgba(255, 255, 255, 0.16)',
  surface: 'rgba(28, 25, 23, 0.12)',
  subtle: 'rgba(28, 25, 23, 0.1)',
  none: 'rgba(28, 25, 23, 0.1)',
};

const TONE_PRESSED_STYLES = {
  solid: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  surface: {
    backgroundColor: '#EDEAE2',
    transform: [{ scale: 0.985 }],
  },
  subtle: {
    opacity: 0.72,
    transform: [{ scale: 0.97 }],
  },
  none: null,
};

export const AtelierPressable = ({
  children,
  onPress,
  disabled = false,
  tone = 'surface',
  haptic = 'none',
  stopPropagation = false,
  rippleColor,
  disableRipple = false,
  borderlessRipple = false,
  pressedStyle,
  style,
  hitSlop,
  ...props
}) => {
  const handlePress = async (event) => {
    if (stopPropagation) {
      event?.stopPropagation?.();
    }
    if (disabled) {
      return;
    }
    if (haptic === 'light') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {}
    } else if (haptic === 'selection') {
      try {
        await Haptics.selectionAsync();
      } catch (e) {}
    }
    if (onPress) {
      onPress(event);
    }
  };

  const resolvedRipple =
    disabled || disableRipple
      ? undefined
      : {
          color:
            rippleColor ||
            DEFAULT_RIPPLE_COLORS[tone] ||
            DEFAULT_RIPPLE_COLORS.surface,
          borderless: borderlessRipple,
        };

  const resolvedToneStyle = TONE_PRESSED_STYLES[tone];

  return (
    <Pressable
      onPress={onPress || stopPropagation ? handlePress : undefined}
      disabled={disabled}
      hitSlop={hitSlop}
      android_ripple={resolvedRipple}
      style={(state) => [
        typeof style === 'function' ? style(state) : style,
        state.pressed && !disabled && resolvedToneStyle,
        state.pressed && !disabled && pressedStyle,
      ]}
      {...props}
    >
      {children}
    </Pressable>
  );
};

export default AtelierPressable;
