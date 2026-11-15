import React from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '../../theme';
import AtelierText from './AtelierText';

export const AtelierBottomSheet = ({
  visible,
  onClose,
  title,
  subtitle,
  options = [],
  children,
}) => {
  const handleSelectOption = async (option) => {
    try {
      await Haptics.selectionAsync();
    } catch (e) {}
    if (onClose) {
      onClose();
    }
    if (option.onPress) {
      option.onPress();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.overlay}
        onPress={onClose}
      >
        <Pressable
          style={styles.sheet}
          onPress={() => {}}
        >
          <View style={styles.handleBar} />
          <View style={styles.header}>
            <View style={styles.headerText}>
              <AtelierText
                variant="title2"
                color={theme.colors.inkPrimary}
              >
                {title}
              </AtelierText>
              {subtitle ? (
                <AtelierText
                  variant="bodySmall"
                  color={theme.colors.inkMuted}
                  style={styles.subtitle}
                >
                  {subtitle}
                </AtelierText>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityLabel="Close sheet"
            >
              <Ionicons
                name="close"
                size={22}
                color={theme.colors.inkSecondary}
              />
            </TouchableOpacity>
          </View>

          {options.length > 0 ? (
            <View style={styles.optionsList}>
              {options.map((option, index) => (
                <TouchableOpacity
                  key={option.key || option.label || String(index)}
                  onPress={() => handleSelectOption(option)}
                  style={[
                    styles.optionRow,
                    option.selected && styles.optionRowSelected,
                  ]}
                  activeOpacity={0.75}
                >
                  <View style={styles.optionLeft}>
                    {option.icon ? (
                      <Ionicons
                        name={option.icon}
                        size={20}
                        color={
                          option.destructive
                            ? theme.colors.error
                            : option.selected
                            ? theme.colors.goldText
                            : theme.colors.inkPrimary
                        }
                        style={styles.optionIcon}
                      />
                    ) : null}
                    <AtelierText
                      variant="bodyMedium"
                      color={
                        option.destructive
                          ? theme.colors.error
                          : option.selected
                          ? theme.colors.goldText
                          : theme.colors.inkPrimary
                      }
                      style={option.selected ? styles.optionLabelSelected : undefined}
                    >
                      {option.label}
                    </AtelierText>
                  </View>
                  {option.selected ? (
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={theme.colors.goldText}
                    />
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(28, 25, 23, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.canvas,
    borderTopLeftRadius: theme.radii.md,
    borderTopRightRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.hero,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.borderMedium,
    alignSelf: 'center',
    marginBottom: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  headerText: {
    flex: 1,
    paddingRight: theme.spacing.sm,
  },
  subtitle: {
    marginTop: 2,
  },
  closeButton: {
    width: theme.touchTarget.minHeight,
    height: theme.touchTarget.minHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsList: {
    gap: theme.spacing.sm,
  },
  optionRow: {
    minHeight: theme.touchTarget.minHeight,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionRowSelected: {
    borderColor: theme.colors.gold,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    marginRight: theme.spacing.md,
  },
  optionLabelSelected: {
    fontWeight: '600',
  },
});

export default AtelierBottomSheet;
