import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import AtelierText from './AtelierText';
import { isValidRemoteOrLocalUri, optimizeImageUrl } from '../../utils/formatters';

export const AtelierAvatar = ({
  uri,
  name = '',
  size = 48,
  style,
}) => {
  const [imageFailed, setImageFailed] = useState(false);

  const hasValidUri = !imageFailed && isValidRemoteOrLocalUri(uri);
  const optimizedUri = hasValidUri
    ? optimizeImageUrl(uri, { width: size, height: size, crop: 'fill' })
    : '';

  useEffect(() => {
    setImageFailed(false);
  }, [uri]);

  const radius = size / 2;
  const cleanInitial = String(name || '').trim().charAt(0).toUpperCase();
  const fontSize = Math.max(12, Math.round(size * 0.4));
  const iconSize = Math.max(15, Math.round(size * 0.48));
  const webImageProps =
    Platform.OS === 'web' ? { referrerPolicy: 'no-referrer' } : {};

  if (hasValidUri) {
    return (
      <View
        style={[
          styles.frame,
          { width: size, height: size, borderRadius: radius },
          style,
        ]}
      >
        <Image
          source={{ uri: optimizedUri }}
          {...webImageProps}
          onError={() => setImageFailed(true)}
          style={{ width: size, height: size, borderRadius: radius }}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: radius },
        style,
      ]}
    >
      {cleanInitial ? (
        <AtelierText
          variant="title2"
          color={theme.colors.goldText}
          style={{ fontSize, lineHeight: Math.round(fontSize * 1.2) }}
        >
          {cleanInitial}
        </AtelierText>
      ) : (
        <Ionicons
          name="person-outline"
          size={iconSize}
          color={theme.colors.inkMuted}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  frame: {
    backgroundColor: theme.colors.surfaceSubtle,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallback: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AtelierAvatar;
