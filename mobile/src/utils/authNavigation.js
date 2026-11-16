import { useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { CommonActions } from '@react-navigation/native';

export const resetToProfile = (navigation) => {
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: 'Profile' }],
    })
  );
};

export const useRedirectIfAuthenticated = (navigation) => {
  const { user } = useSelector((state) => state.auth);
  const isCompletedUser = Boolean(
    user && (user.username || user.profileCompleted)
  );

  const navigateToProfile = useCallback(() => {
    resetToProfile(navigation);
  }, [navigation]);

  useEffect(() => {
    if (isCompletedUser) {
      navigateToProfile();
    }
  }, [isCompletedUser, navigateToProfile]);

  return navigateToProfile;
};
