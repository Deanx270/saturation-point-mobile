import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import AtelierText from './AtelierText';

export const AtelierInput = ({
  label,
  value,
  onChangeText,
  onBlur,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  error,
  touched,
  multiline = false,
  numberOfLines = 1,
  style,
  inputStyle,
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
          multiline && { minHeight: 90, alignItems: 'flex-start' },
        ]}
      >
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
            multiline && { textAlignVertical: 'top', paddingTop: theme.spacing.sm },
            inputStyle,
          ]}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={theme.colors.inkMuted}
            />
          </TouchableOpacity>
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
  focusedContainer: {
    borderColor: theme.colors.borderFocused,
  },
  errorContainer: {
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.errorBg,
  },
  textInput: {
    flex: 1,
    fontSize: theme.typography.bodyMedium.fontSize,
    color: theme.colors.inkPrimary,
    minHeight: theme.touchTarget.minHeight,
  },
  eyeIcon: {
    padding: theme.spacing.xs,
  },
  errorText: {
    marginTop: theme.spacing.xs,
  },
});

export default AtelierInput;
