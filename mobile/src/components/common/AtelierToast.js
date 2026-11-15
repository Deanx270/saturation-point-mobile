import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import AtelierText from './AtelierText';
import AtelierPressable from './AtelierPressable';

export const AtelierToast = ({
  visible,
  toastKey,
  message,
  actionLabel,
  onActionPress,
  onDismiss,
  duration = 3000,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!visible) {
      return undefined;
    }

    opacity.setValue(0);
    translateY.setValue(16);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 12,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (onDismissRef.current) {
          onDismissRef.current();
        }
      });
    }, duration);

    return () => clearTimeout(timer);
  }, [visible, toastKey, message, duration, opacity, translateY]);

  if (!visible || !message) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.container}>
        <Ionicons
          name="checkmark-circle"
          size={18}
          color={theme.colors.gold}
          style={styles.icon}
        />
        <AtelierText
          variant="bodySmall"
          color="#FFFFFF"
          numberOfLines={2}
          style={styles.message}
        >
          {message}
        </AtelierText>
        {actionLabel && onActionPress ? (
          <AtelierPressable
            tone="solid"
            hitSlop={8}
            onPress={() => {
              if (onDismissRef.current) {
                onDismissRef.current();
              }
              onActionPress();
            }}
            style={styles.actionButton}
          >
            <AtelierText
              variant="caption"
              color={theme.colors.goldLight}
            >
              {actionLabel}
            </AtelierText>
          </AtelierPressable>
        ) : null}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    bottom: theme.spacing.lg,
    zIndex: 50,
  },
  container: {
    backgroundColor: theme.colors.inkPrimary,
    borderRadius: theme.radii.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadows.raised,
  },
  icon: {
    marginRight: theme.spacing.sm,
  },
  message: {
    flex: 1,
  },
  actionButton: {
    marginLeft: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.xs,
  },
});

export default AtelierToast;
