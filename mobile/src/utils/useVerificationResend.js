import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import * as Haptics from 'expo-haptics';
import {
  resendVerification,
  showAuthNotice,
  setVerificationCooldown,
} from '../redux/authSlice';

export const formatCooldownTime = (seconds) => {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

const normalizeKey = (email) =>
  typeof email === 'string' ? email.trim().toLowerCase() : '';

const computeRemaining = (expiresAt) =>
  expiresAt > Date.now() ? Math.ceil((expiresAt - Date.now()) / 1000) : 0;

export const useVerificationResend = (targetEmail = '') => {
  const dispatch = useDispatch();
  const [resending, setResending] = useState(false);
  const emailKey = normalizeKey(targetEmail);
  const cooldowns = useSelector((state) => state.auth.verificationCooldowns);
  const expiresAt = emailKey ? cooldowns?.[emailKey] || 0 : 0;

  const [cooldownSeconds, setCooldownSeconds] = useState(() =>
    computeRemaining(expiresAt)
  );

  useEffect(() => {
    const initial = computeRemaining(expiresAt);
    setCooldownSeconds(initial);
    if (initial <= 0) {
      return undefined;
    }
    const interval = setInterval(() => {
      const next = computeRemaining(expiresAt);
      setCooldownSeconds(next);
      if (next <= 0) {
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleResend = useCallback(
    async (emailOverride) => {
      const resolvedEmail =
        typeof emailOverride === 'string' && emailOverride.trim()
          ? emailOverride.trim()
          : targetEmail.trim();
      const key = normalizeKey(resolvedEmail);
      const activeExpiry = key ? cooldowns?.[key] || 0 : 0;
      if (!key || resending || computeRemaining(activeExpiry) > 0) {
        return;
      }
      setResending(true);
      try {
        const result = await dispatch(
          resendVerification({ email: resolvedEmail })
        );
        if (resendVerification.fulfilled.match(result)) {
          dispatch(
            setVerificationCooldown({
              email: resolvedEmail,
              seconds: result.payload?.cooldownSeconds || 60,
            })
          );
          dispatch(
            showAuthNotice({
              message: 'Confirmation link sent. Check your inbox.',
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
          if (result.payload?.retryAfterSeconds > 0) {
            dispatch(
              setVerificationCooldown({
                email: resolvedEmail,
                seconds: result.payload.retryAfterSeconds,
              })
            );
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
    [dispatch, targetEmail, cooldowns, resending]
  );

  return {
    resending,
    cooldownSeconds,
    handleResend,
  };
};
