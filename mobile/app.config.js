module.exports = ({ config }) => {
  const existingSchemes = Array.isArray(config.android?.scheme)
    ? config.android.scheme
    : config.android?.scheme
      ? [config.android.scheme]
      : [];
  const facebookAppId = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;
  const oauthSchemes = [
    'com.saturationpoint.mobile',
    ...(facebookAppId ? [`fb${facebookAppId}`] : []),
  ];
  const androidSchemes = Array.from(
    new Set([...existingSchemes, ...oauthSchemes])
  );

  return {
    ...config,
    android: {
      ...config.android,
      scheme: androidSchemes,
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON || './google-services.json',
    },
  };
};
