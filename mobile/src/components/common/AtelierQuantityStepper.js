import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import AtelierPressable from './AtelierPressable';

export const AtelierQuantityStepper = ({
  value,
  onChange,
  min = 1,
  max,
  allowDecrementBelowMin = false,
  disabled = false,
  compact = false,
  onLimitReached,
  haptic = 'selection',
  decrementLabel = 'Decrease quantity',
  incrementLabel = 'Increase quantity',
  inputLabel = 'Quantity',
  style,
}) => {
  const inputRef = useRef(null);
  const [draft, setDraft] = useState(String(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDraft(String(value));
    }
  }, [value, isFocused]);

  const hasMax = typeof max === 'number' && max > 0;

  const clampValue = (numericValue) => {
    let next = numericValue;
    if (Number.isNaN(next) || next < min) {
      next = min;
    }
    if (hasMax && next > max) {
      next = max;
      if (onLimitReached) {
        onLimitReached(max);
      }
    }
    return next;
  };

  const commitDraft = (rawText) => {
    const cleaned = String(rawText).replace(/[^0-9]/g, '');
    if (!cleaned) {
      setDraft(String(min));
      if (value !== min) {
        onChange(min);
      }
      return;
    }
    const next = clampValue(parseInt(cleaned, 10));
    setDraft(String(next));
    if (next !== value) {
      onChange(next);
    }
  };

  const handleChangeText = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (!cleaned) {
      setDraft('');
      return;
    }
    const parsed = parseInt(cleaned, 10);
    if (hasMax && parsed > max) {
      setDraft(String(max));
      if (value !== max) {
        onChange(max);
      }
      if (onLimitReached) {
        onLimitReached(max);
      }
      return;
    }
    setDraft(cleaned);
    if (parsed >= min && parsed !== value) {
      onChange(parsed);
    }
  };

  const handleStep = (delta) => {
    inputRef.current?.blur?.();
    const parsed = parseInt(draft, 10);
    const base = Number.isNaN(parsed) ? value : parsed;
    const rawNext = base + delta;

    if (delta < 0 && allowDecrementBelowMin && rawNext < min) {
      onChange(0);
      return;
    }

    if (delta > 0 && hasMax && base >= max) {
      if (onLimitReached) {
        onLimitReached(max);
      }
      return;
    }

    const next = clampValue(rawNext);
    setDraft(String(next));
    if (next !== value) {
      onChange(next);
    }
  };

  const isDecrementDisabled =
    disabled || (!allowDecrementBelowMin && value <= min);
  const isIncrementDisabled = disabled || (hasMax && value >= max);

  const buttonStyle = compact ? styles.compactButton : styles.regularButton;
  const inputStyle = compact ? styles.compactInput : styles.regularInput;
  const iconSize = compact ? 16 : 18;
  const hitSlop = compact ? 6 : undefined;

  return (
    <View style={[styles.container, compact && styles.compactContainer, style]}>
      <AtelierPressable
        tone="surface"
        haptic={haptic}
        hitSlop={hitSlop}
        disabled={isDecrementDisabled}
        style={buttonStyle}
        onPress={() => handleStep(-1)}
        accessibilityLabel={decrementLabel}
      >
        <Ionicons
          name="remove"
          size={iconSize}
          color={
            isDecrementDisabled ? theme.colors.inkMuted : theme.colors.inkPrimary
          }
          style={isDecrementDisabled && styles.disabledIcon}
        />
      </AtelierPressable>

      <TextInput
        ref={inputRef}
        value={draft}
        onChangeText={handleChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          commitDraft(draft);
        }}
        onSubmitEditing={() => commitDraft(draft)}
        editable={!disabled}
        keyboardType="number-pad"
        returnKeyType="done"
        selectTextOnFocus
        maxLength={4}
        style={[styles.inputBase, inputStyle, disabled && styles.disabledText]}
        accessibilityLabel={inputLabel}
      />

      <AtelierPressable
        tone="surface"
        haptic={haptic}
        hitSlop={hitSlop}
        disabled={isIncrementDisabled}
        style={buttonStyle}
        onPress={() => handleStep(1)}
        accessibilityLabel={incrementLabel}
      >
        <Ionicons
          name="add"
          size={iconSize}
          color={
            isIncrementDisabled ? theme.colors.inkMuted : theme.colors.inkPrimary
          }
          style={isIncrementDisabled && styles.disabledIcon}
        />
      </AtelierPressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    borderWidth: 1,
    borderColor: theme.colors.borderMedium,
    borderRadius: theme.radii.xs,
    backgroundColor: theme.colors.surfaceSubtle,
    overflow: 'hidden',
  },
  compactContainer: {
    borderColor: theme.colors.borderMedium,
  },
  regularButton: {
    width: theme.touchTarget.minWidth,
    height: theme.touchTarget.minHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactButton: {
    width: 34,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledIcon: {
    opacity: 0.38,
  },
  inputBase: {
    textAlign: 'center',
    color: theme.colors.inkPrimary,
    backgroundColor: theme.colors.surface,
    paddingVertical: 0,
    paddingHorizontal: 4,
    includeFontPadding: false,
  },
  regularInput: {
    width: 48,
    minWidth: 48,
    height: theme.touchTarget.minHeight,
    fontFamily: theme.typography.title2.fontFamily,
    fontSize: theme.typography.title2.fontSize,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: theme.colors.border,
  },
  compactInput: {
    width: 36,
    minWidth: 36,
    height: 36,
    fontFamily: theme.typography.bodyMedium.fontFamily,
    fontSize: theme.typography.bodyMedium.fontSize,
    fontWeight: '600',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  disabledText: {
    color: theme.colors.inkMuted,
  },
});

export default AtelierQuantityStepper;
