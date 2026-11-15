import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export const pickImagesFromGallery = async ({
  allowsMultipleSelection = false,
  allowsEditing = false,
  aspect,
} = {}) => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Permission Required', 'Gallery access is needed to select photos.');
    return [];
  }

  const options = {
    mediaTypes: ['images'],
    allowsMultipleSelection,
    allowsEditing,
    quality: 0.8,
  };
  if (allowsEditing && aspect) {
    options.aspect = aspect;
  }

  const result = await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets?.length) {
    return [];
  }
  return result.assets.map((asset) => asset.uri).filter(Boolean);
};

export const captureImageWithCamera = async ({
  allowsEditing = false,
  aspect,
} = {}) => {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Permission Required', 'Camera access is needed to take a photo.');
    return null;
  }

  const options = {
    allowsEditing,
    quality: 0.8,
  };
  if (allowsEditing && aspect) {
    options.aspect = aspect;
  }

  const result = await ImagePicker.launchCameraAsync(options);
  if (result.canceled || !result.assets?.length) {
    return null;
  }
  return result.assets[0].uri || null;
};
