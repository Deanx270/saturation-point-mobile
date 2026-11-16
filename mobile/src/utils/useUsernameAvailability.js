import { useState, useRef, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import { USERNAME_REGEX } from './validationSchemas';

export const buildSuggestedUsername = (email) => {
  const local = String(email || '').split('@')[0] || '';
  const sanitized = local
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (sanitized.length >= 3) {
    return sanitized.slice(0, 24);
  }
  return '';
};

export const sanitizeUsernameInput = (text) =>
  String(text || '').replace(/^@/, '').replace(/\s+/g, '');

export const getUsernameFeedback = (validationError, availabilityState) => ({
  helperText:
    availabilityState.status === 'available' ||
    availabilityState.status === 'checking'
      ? availabilityState.message
      : 'Letters, numbers, and underscores only (3–30 characters)',
  error:
    validationError ||
    (availabilityState.status === 'taken'
      ? availabilityState.message
      : undefined),
  isTaken: availabilityState.status === 'taken',
});

export const useUsernameAvailability = (initialUsername = '') => {
  const [availabilityState, setAvailabilityState] = useState({
    status: 'idle',
    message: '',
  });
  const checkTimerRef = useRef(null);
  const latestQueryRef = useRef('');

  const runUsernameCheck = useCallback((rawUsername) => {
    if (checkTimerRef.current) {
      clearTimeout(checkTimerRef.current);
    }
    const normalized = String(rawUsername || '')
      .trim()
      .replace(/^@/, '')
      .toLowerCase();

    if (!normalized || !USERNAME_REGEX.test(normalized)) {
      latestQueryRef.current = '';
      setAvailabilityState({ status: 'idle', message: '' });
      return;
    }

    latestQueryRef.current = normalized;
    setAvailabilityState({
      status: 'checking',
      message: 'Checking availability...',
    });

    checkTimerRef.current = setTimeout(async () => {
      try {
        const res = await apiClient.get('/users/check-username', {
          params: { username: normalized },
        });
        if (latestQueryRef.current !== normalized) {
          return;
        }
        if (res.data?.available) {
          setAvailabilityState({
            status: 'available',
            message: `@${normalized} is available`,
          });
        } else {
          setAvailabilityState({
            status: 'taken',
            message: 'That username is already taken',
          });
        }
      } catch (e) {
        if (latestQueryRef.current === normalized) {
          setAvailabilityState({ status: 'idle', message: '' });
        }
      }
    }, 350);
  }, []);

  useEffect(() => {
    if (initialUsername) {
      runUsernameCheck(initialUsername);
    }
    return () => {
      if (checkTimerRef.current) {
        clearTimeout(checkTimerRef.current);
      }
    };
  }, [initialUsername, runUsernameCheck]);

  const resetAvailability = useCallback(() => {
    if (checkTimerRef.current) {
      clearTimeout(checkTimerRef.current);
    }
    latestQueryRef.current = '';
    setAvailabilityState({ status: 'idle', message: '' });
  }, []);

  return {
    availabilityState,
    runUsernameCheck,
    resetAvailability,
  };
};
