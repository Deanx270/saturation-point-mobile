import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  Animated,
  PanResponder,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import AtelierText from './AtelierText';
import AtelierPressable from './AtelierPressable';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export const AtelierBottomSheet = ({
  visible,
  onClose,
  title,
  subtitle,
  options = [],
  footer,
  maxHeight,
  showCloseButton = true,
  children,
}) => {
  const [rendered, setRendered] = useState(visible);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const sheetHeightRef = useRef(360);
  const closingRef = useRef(false);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const pendingActionRef = useRef(null);

  const runCloseAnimation = useCallback(
    (onFinished) => {
      if (closingRef.current) {
        return;
      }
      closingRef.current = true;
      const targetOffset = Math.max(sheetHeightRef.current + 40, 320);

      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: targetOffset,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(() => {
        closingRef.current = false;
        setRendered(false);
        const queuedAction = pendingActionRef.current;
        pendingActionRef.current = null;
        if (onFinished) {
          onFinished();
        }
        if (queuedAction) {
          queuedAction();
        }
      });
    },
    [backdropOpacity, translateY]
  );

  const handleDismiss = useCallback(() => {
    runCloseAnimation(() => {
      if (onClose) {
        onClose();
      }
    });
  }, [runCloseAnimation, onClose]);

  const dismissRef = useRef(handleDismiss);
  dismissRef.current = handleDismiss;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        gestureState.dy > 6 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.2,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
          const progress = Math.max(0, 1 - gestureState.dy / Math.max(sheetHeightRef.current, 240));
          backdropOpacity.setValue(progress);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 80 || gestureState.vy > 0.6) {
          dismissRef.current();
          return;
        }
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 22,
            stiffness: 260,
          }),
          Animated.timing(backdropOpacity, {
            toValue: 1,
            duration: 120,
            useNativeDriver: true,
          }),
        ]).start();
      },
      onPanResponderTerminate: () => {
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 22,
            stiffness: 260,
          }),
          Animated.timing(backdropOpacity, {
            toValue: 1,
            duration: 120,
            useNativeDriver: true,
          }),
        ]).start();
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      closingRef.current = false;
      pendingActionRef.current = null;
      setRendered(true);
      backdropOpacity.setValue(0);
      translateY.setValue(Math.max(sheetHeightRef.current + 40, 320));
      requestAnimationFrame(() => {
        if (!visibleRef.current) {
          return;
        }
        Animated.parallel([
          Animated.timing(backdropOpacity, {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
          }),
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 24,
            stiffness: 260,
          }),
        ]).start();
      });
    } else if (rendered && !closingRef.current) {
      runCloseAnimation();
    }
  }, [visible, rendered, backdropOpacity, translateY, runCloseAnimation]);

  const handleSelectOption = (option) => {
    pendingActionRef.current = option.onPress || null;
    handleDismiss();
  };

  if (!rendered) {
    return null;
  }

  return (
    <Modal
      visible={rendered}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <View style={styles.modalRoot}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable
            style={styles.backdropPress}
            onPress={handleDismiss}
            accessibilityLabel="Close dialog backdrop"
          />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none"
          style={styles.positioner}
        >
          <Animated.View
            onLayout={(event) => {
              sheetHeightRef.current = event.nativeEvent.layout.height;
            }}
            style={[
              styles.sheet,
              maxHeight ? { maxHeight } : null,
              { transform: [{ translateY }] },
            ]}
          >
            <View
              {...panResponder.panHandlers}
              style={styles.dragZone}
            >
              <View style={styles.handleHitArea}>
                <View style={styles.handleBar} />
              </View>
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
                {showCloseButton ? (
                  <AtelierPressable
                    tone="subtle"
                    onPress={handleDismiss}
                    style={styles.closeButton}
                    accessibilityLabel="Close sheet"
                  >
                    <Ionicons
                      name="close"
                      size={22}
                      color={theme.colors.inkSecondary}
                    />
                  </AtelierPressable>
                ) : null}
              </View>
            </View>

            {options.length > 0 ? (
              <View style={styles.optionsList}>
                {options.map((option, index) => (
                  <AtelierPressable
                    key={option.key || option.label || String(index)}
                    tone="surface"
                    haptic="selection"
                    onPress={() => handleSelectOption(option)}
                    style={[
                      styles.optionRow,
                      option.selected && styles.optionRowSelected,
                    ]}
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
                  </AtelierPressable>
                ))}
              </View>
            ) : null}

            {children}

            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(28, 25, 23, 0.45)',
  },
  backdropPress: {
    flex: 1,
  },
  positioner: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.canvas,
    borderTopLeftRadius: theme.radii.md,
    borderTopRightRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.hero,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
  dragZone: {
    paddingBottom: theme.spacing.xs,
  },
  handleHitArea: {
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.borderMedium,
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
    borderRadius: theme.radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
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
    overflow: 'hidden',
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
  footer: {
    paddingTop: theme.spacing.md,
  },
});

export default AtelierBottomSheet;
