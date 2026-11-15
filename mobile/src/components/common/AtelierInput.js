import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import AtelierText from './AtelierText';
import AtelierPressable from './AtelierPressable';

export const AtelierInput = ({
  label,
  value,
  onChangeText,
  onBlur,
  placeholder,
  prefix,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  error,
  touched,
  multiline = false,
  numberOfLines = 1,
  style,
  inputStyle,
  ...inputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const hasError = touched && error;

  return (
    <View style={[styles.wrapper, style]}>
      {label && (
        <AtelierText
          variant="caption"
          color={theme.colors.inkSecondary}
          style={styles.label}
        >
          {label}
        </AtelierText>
      )}
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.focusedContainer,
          hasError && styles.errorContainer,
          multiline && styles.multilineContainer,
        ]}
      >
        {prefix ? (
          <AtelierText
            variant="bodyMedium"
            color={theme.colors.inkMuted}
            style={styles.prefixText}
          >
            {prefix}
          </AtelierText>
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onBlur={(e) => {
            setIsFocused(false);
            if (onBlur) {
              onBlur(e);
            }
          }}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.inkMuted}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          numberOfLines={numberOfLines}
          style={[
            styles.textInput,
            multiline ? styles.multilineInput : styles.singleLineInput,
            inputStyle,
          ]}
          {...inputProps}
        />
        {secureTextEntry && (
          <AtelierPressable
            tone="subtle"
            hitSlop={8}
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={theme.colors.inkMuted}
            />
          </AtelierPressable>
        )}
      </View>
      {hasError && (
        <AtelierText
          variant="bodySmall"
          color={theme.colors.error}
          style={styles.errorText}
        >
          {error}
        </AtelierText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    marginBottom: theme.spacing.xs,
  },
  inputContainer: {
    minHeight: theme.touchTarget.minHeight,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.sm,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  multilineContainer: {
    minHeight: 90,
    alignItems: 'flex-start',
  },
  focusedContainer: {
    borderColor: theme.colors.borderFocused,
  },
  errorContainer: {
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.errorBg,
  },
  prefixText: {
    marginRight: theme.spacing.xs,
    includeFontPadding: false,
  },
  textInput: {
    flex: 1,
    fontFamily: theme.typography.bodyMedium.fontFamily,
    fontSize: theme.typography.bodyMedium.fontSize,
    color: theme.colors.inkPrimary,
    includeFontPadding: false,
    paddingVertical: 0,
  },
  singleLineInput: {
    height: theme.touchTarget.minHeight,
    textAlignVertical: 'center',
  },
  multilineInput: {
    minHeight: 88,
    textAlignVertical: 'top',
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  eyeIcon: {
    padding: theme.spacing.xs,
  },
  errorText: {
    marginTop: theme.spacing.xs,
  },
});

export default AtelierInput;
