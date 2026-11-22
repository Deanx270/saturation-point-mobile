import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { useDispatch } from 'react-redux';
import * as Haptics from 'expo-haptics';
import { resendVerification, showAuthNotice } from '../redux/authSlice';

export const formatCooldownTime = (seconds) => {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

export const useVerificationResend = () => {
  const dispatch = useDispatch();
  const [resending, setResending] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return undefined;
    }
    const timer = setTimeout(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [cooldownSeconds]);

  const startCooldown = useCallback((seconds = 60) => {
    setCooldownSeconds(Math.max(0, Math.ceil(Number(seconds) || 0)));
  }, []);

  const resetCooldown = useCallback(() => {
    setCooldownSeconds(0);
  }, []);

  const handleResend = useCallback(
    async (email) => {
      if (!email || resending || cooldownSeconds > 0) {
        return;
      }
      setResending(true);
      try {
        const result = await dispatch(resendVerification({ email }));
        if (resendVerification.fulfilled.match(result)) {
          startCooldown(result.payload?.cooldownSeconds || 60);
          dispatch(
            showAuthNotice({
              message: 'Confirmation link sent. Please check your inbox.',
              tone: 'success',
            })
          );
          if (Platform.OS !== 'web') {
            try {
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
            } catch (e) {}
          }
        } else {
          if (result.payload?.retryAfterSeconds) {
            startCooldown(result.payload.retryAfterSeconds);
          }
          const errorMessage =
            typeof result.payload === 'string'
              ? result.payload
              : result.payload?.message || 'Unable to send confirmation link.';
          dispatch(
            showAuthNotice({
              message: errorMessage,
              tone: 'error',
            })
          );
        }
      } finally {
        setResending(false);
      }
    },
    [dispatch, resending, cooldownSeconds, startCooldown]
  );

  return {
    resending,
    cooldownSeconds,
    startCooldown,
    resetCooldown,
    handleResend,
  };
};
