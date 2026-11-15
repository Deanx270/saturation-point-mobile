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
  const renderedRef = useRef(visible);
  renderedRef.current = rendered;
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const prevVisibleRef = useRef(false);
  const backdropProgress = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const sheetHeightRef = useRef(360);
  const closingRef = useRef(false);
  const hasOpenedRef = useRef(false);
  const pendingActionRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const backdropColor = backdropProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(28, 25, 23, 0)', 'rgba(28, 25, 23, 0.45)'],
    extrapolate: 'clamp',
  });

  const runOpenAnimation = useCallback(() => {
    if (hasOpenedRef.current) {
      return;
    }
    hasOpenedRef.current = true;
    const startOffset = Math.max(sheetHeightRef.current + 40, 320);
    backdropProgress.setValue(0);
    translateY.setValue(startOffset);

    Animated.parallel([
      Animated.timing(backdropProgress, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 24,
        stiffness: 260,
      }),
    ]).start();
  }, [backdropProgress, translateY]);

  const runCloseAnimation = useCallback(
    (onFinished) => {
      if (closingRef.current) {
        return;
      }
      closingRef.current = true;
      const targetOffset = Math.max(sheetHeightRef.current + 40, 320);

      Animated.parallel([
        Animated.timing(backdropProgress, {
          toValue: 0,
          duration: 160,
          useNativeDriver: false,
        }),
        Animated.timing(translateY, {
          toValue: targetOffset,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(() => {
        closingRef.current = false;
        hasOpenedRef.current = false;
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
    [backdropProgress, translateY]
  );

  const handleDismiss = useCallback(() => {
    runCloseAnimation(() => {
      if (onCloseRef.current) {
        onCloseRef.current();
      }
    });
  }, [runCloseAnimation]);

  const dismissRef = useRef(handleDismiss);
  dismissRef.current = handleDismiss;

  const dragResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        gestureState.dy > 4 &&
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
      onMoveShouldSetPanResponderCapture: (_, gestureState) =>
        gestureState.dy > 6 &&
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.2,
      onPanResponderGrant: () => {
        translateY.stopAnimation();
        backdropProgress.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        const dy = Math.max(0, gestureState.dy);
        translateY.setValue(dy);
        const travelHeight = Math.max(sheetHeightRef.current, 240);
        backdropProgress.setValue(Math.max(0, 1 - dy / travelHeight));
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 65 || gestureState.vy > 0.45) {
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
          Animated.timing(backdropProgress, {
            toValue: 1,
            duration: 140,
            useNativeDriver: false,
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
          Animated.timing(backdropProgress, {
            toValue: 1,
            duration: 140,
            useNativeDriver: false,
          }),
        ]).start();
      },
    })
  ).current;

  useEffect(() => {
    const wasVisible = prevVisibleRef.current;
    prevVisibleRef.current = visible;

    if (visible && !wasVisible) {
      closingRef.current = false;
      hasOpenedRef.current = false;
      pendingActionRef.current = null;
      backdropProgress.setValue(0);
      translateY.setValue(SCREEN_HEIGHT);
      setRendered(true);
      const fallbackTimer = setTimeout(() => {
        if (visibleRef.current) {
          runOpenAnimation();
        }
      }, 40);
      return () => clearTimeout(fallbackTimer);
    }
    if (!visible && wasVisible && renderedRef.current && !closingRef.current) {
      runCloseAnimation();
    }
    return undefined;
  }, [visible, backdropProgress, translateY, runOpenAnimation, runCloseAnimation]);

  const handleSelectOption = (option) => {
    pendingActionRef.current = option.onPress || null;
    handleDismiss();
  };

  const sheetPanProps = children ? {} : dragResponder.panHandlers;

  return (
    <Modal
      visible={rendered}
      transparent
      statusBarTranslucent
      animationType="none"
      onShow={runOpenAnimation}
      onRequestClose={handleDismiss}
    >
      {rendered ? (
        <View
          collapsable={false}
          style={styles.modalRoot}
        >
          <Animated.View
            collapsable={false}
            pointerEvents="none"
            style={[styles.backdrop, { backgroundColor: backdropColor }]}
          />
          <Pressable
            style={styles.backdropPress}
            onPress={handleDismiss}
            accessibilityLabel="Close dialog backdrop"
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            pointerEvents="box-none"
            style={styles.positioner}
          >
            <Animated.View
              collapsable={false}
              {...sheetPanProps}
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
                collapsable={false}
                {...dragResponder.panHandlers}
                style={styles.dragZone}
              >
                <View
                  collapsable={false}
                  style={styles.handleHitArea}
                >
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
      ) : null}
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
    zIndex: 1,
  },
  backdropPress: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  positioner: {
    justifyContent: 'flex-end',
    zIndex: 3,
    elevation: 16,
  },
  sheet: {
    backgroundColor: theme.colors.canvas,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.hero,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
    elevation: 16,
  },
  dragZone: {
    backgroundColor: 'transparent',
    paddingBottom: theme.spacing.xs,
  },
  handleHitArea: {
    backgroundColor: 'transparent',
    paddingTop: 12,
    paddingBottom: 10,
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
