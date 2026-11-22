import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useId,
} from 'react';
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
  BackHandler,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import AtelierText from './AtelierText';
import AtelierPressable from './AtelierPressable';

const SCREEN_HEIGHT = Dimensions.get('window').height;

const SheetPortalContext = createContext(null);

const AtelierSheetOutlet = ({ api }) => {
  const [, setTick] = useState(0);

  useEffect(() => api.subscribe(() => setTick((prev) => prev + 1)), [api]);

  const entries = api.getSnapshot();
  if (entries.length === 0) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={styles.outletLayer}
    >
      {entries.map(([id, element]) => (
        <React.Fragment key={id}>{element}</React.Fragment>
      ))}
    </View>
  );
};

export const AtelierSheetProvider = ({ children }) => {
  const listenersRef = useRef(new Set());
  const portalsRef = useRef(new Map());

  const api = useMemo(
    () => ({
      mount(id, element) {
        portalsRef.current.set(id, element);
        listenersRef.current.forEach((listener) => listener());
      },
      unmount(id) {
        if (portalsRef.current.has(id)) {
          portalsRef.current.delete(id);
          listenersRef.current.forEach((listener) => listener());
        }
      },
      subscribe(listener) {
        listenersRef.current.add(listener);
        return () => {
          listenersRef.current.delete(listener);
        };
      },
      getSnapshot() {
        return Array.from(portalsRef.current.entries());
      },
    }),
    []
  );

  return (
    <SheetPortalContext.Provider value={api}>
      <View style={styles.providerRoot}>
        <View style={styles.appLayer}>{children}</View>
        <AtelierSheetOutlet api={api} />
      </View>
    </SheetPortalContext.Provider>
  );
};

const AtelierBottomSheetContent = ({
  visible,
  onClose,
  onExited,
  title,
  subtitle,
  options = [],
  footer,
  maxHeight,
  showCloseButton = true,
  children,
}) => {
  const insets = useSafeAreaInsets();
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(320)).current;
  const sheetHeightRef = useRef(320);
  const closingRef = useRef(false);
  const hasOpenedRef = useRef(false);
  const hasClosedRef = useRef(false);
  const pendingActionRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const onExitedRef = useRef(onExited);
  onExitedRef.current = onExited;

  const runCloseAnimation = useCallback(
    (onFinished) => {
      if (closingRef.current) {
        return;
      }
      closingRef.current = true;
      const targetOffset = Math.max(sheetHeightRef.current + 32, 280);

      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 150,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start();

      Animated.timing(translateY, {
        toValue: targetOffset,
        duration: 160,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: false,
      }).start(({ finished }) => {
        closingRef.current = false;
        hasOpenedRef.current = false;
        if (!finished && visibleRef.current) {
          return;
        }
        hasClosedRef.current = true;
        const queuedAction = pendingActionRef.current;
        pendingActionRef.current = null;
        if (onFinished) {
          onFinished();
        }
        if (queuedAction) {
          queuedAction();
        }
        if (onExitedRef.current) {
          onExitedRef.current();
        }
      });
    },
    [backdropOpacity, translateY]
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

  const snapSheetOpen = useCallback(() => {
    Animated.timing(translateY, {
      toValue: 0,
      duration: 160,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    Animated.timing(backdropOpacity, {
      toValue: 1,
      duration: 140,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [backdropOpacity, translateY]);

  const snapSheetOpenRef = useRef(snapSheetOpen);
  snapSheetOpenRef.current = snapSheetOpen;

  const dragResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        gestureState.dy > 10 &&
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.5,
      onMoveShouldSetPanResponderCapture: (_, gestureState) =>
        gestureState.dy > 14 &&
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.5,
      onPanResponderGrant: () => {
        translateY.stopAnimation();
        backdropOpacity.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        const dy = Math.max(0, gestureState.dy);
        translateY.setValue(dy);
        const travelHeight = Math.max(sheetHeightRef.current, 240);
        backdropOpacity.setValue(Math.max(0, 1 - dy / travelHeight));
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 65 || gestureState.vy > 0.45) {
          dismissRef.current();
          return;
        }
        snapSheetOpenRef.current();
      },
      onPanResponderTerminate: () => {
        snapSheetOpenRef.current();
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      closingRef.current = false;
      hasOpenedRef.current = false;
      hasClosedRef.current = false;
      pendingActionRef.current = null;
      backdropOpacity.stopAnimation();
      translateY.stopAnimation();
      backdropOpacity.setValue(0);
      const startOffset = Math.min(Math.max(sheetHeightRef.current, 240), SCREEN_HEIGHT * 0.75);
      translateY.setValue(startOffset);
      const frameId = requestAnimationFrame(() => {
        if (!visibleRef.current || hasOpenedRef.current) {
          return;
        }
        hasOpenedRef.current = true;
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
      });
      return () => cancelAnimationFrame(frameId);
    }
    if (!visible && !closingRef.current && !hasClosedRef.current) {
      runCloseAnimation();
    }
    return undefined;
  }, [visible, backdropOpacity, translateY, runCloseAnimation]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      dismissRef.current();
      return true;
    });
    return () => subscription.remove();
  }, []);

  const handleSelectOption = (option) => {
    if (option.immediate) {
      pendingActionRef.current = null;
      handleDismiss();
      if (option.onPress) {
        option.onPress();
      }
      return;
    }
    pendingActionRef.current = option.onPress || null;
    handleDismiss();
  };

  const bottomPadding = Math.max(insets.bottom + theme.spacing.lg, theme.spacing.hero);

  return (
    <View
      collapsable={false}
      style={styles.modalRoot}
    >
      <Animated.View
        collapsable={false}
        pointerEvents="none"
        style={[styles.backdropLayer, { opacity: backdropOpacity }]}
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
          onLayout={(event) => {
            sheetHeightRef.current = event.nativeEvent.layout.height;
          }}
          style={[
            styles.sheet,
            { paddingBottom: bottomPadding },
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
                  borderlessRipple
                  rippleRadius={theme.touchTarget.minHeight / 2}
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
  );
};

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
  const portal = useContext(SheetPortalContext);
  const sheetId = useId();
  const [rendered, setRendered] = useState(Boolean(visible));

  useEffect(() => {
    if (visible) {
      setRendered(true);
    }
  }, [visible]);

  const handleExited = useCallback(() => {
    setRendered(false);
  }, []);

  useEffect(() => {
    if (!portal) {
      return undefined;
    }
    if (rendered || visible) {
      portal.mount(
        sheetId,
        <AtelierBottomSheetContent
          visible={Boolean(visible)}
          onClose={onClose}
          onExited={handleExited}
          title={title}
          subtitle={subtitle}
          options={options}
          footer={footer}
          maxHeight={maxHeight}
          showCloseButton={showCloseButton}
        >
          {children}
        </AtelierBottomSheetContent>
      );
    } else {
      portal.unmount(sheetId);
    }
    return undefined;
  }, [
    portal,
    sheetId,
    rendered,
    visible,
    onClose,
    handleExited,
    title,
    subtitle,
    options,
    footer,
    maxHeight,
    showCloseButton,
    children,
  ]);

  useEffect(() => {
    return () => {
      if (portal) {
        portal.unmount(sheetId);
      }
    };
  }, [portal, sheetId]);

  if (portal) {
    return null;
  }

  if (!rendered && !visible) {
    return null;
  }

  return (
    <Modal
      visible={rendered || Boolean(visible)}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={onClose}
    >
      <AtelierBottomSheetContent
        visible={Boolean(visible)}
        onClose={onClose}
        onExited={handleExited}
        title={title}
        subtitle={subtitle}
        options={options}
        footer={footer}
        maxHeight={maxHeight}
        showCloseButton={showCloseButton}
      >
        {children}
      </AtelierBottomSheetContent>
    </Modal>
  );
};

const styles = StyleSheet.create({
  providerRoot: {
    flex: 1,
  },
  appLayer: {
    flex: 1,
    zIndex: 1,
    elevation: 0,
  },
  outletLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 9999,
    elevation: 24,
  },
  modalRoot: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
  },
  backdropLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(28, 25, 23, 0.45)',
    zIndex: 1,
  },
  backdropPress: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 2,
  },
  positioner: {
    flex: 1,
    justifyContent: 'flex-end',
    zIndex: 3,
  },
  sheet: {
    backgroundColor: theme.colors.canvas,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xs,
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
    borderRadius: theme.touchTarget.minHeight / 2,
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
