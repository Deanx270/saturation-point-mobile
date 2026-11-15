import { Platform } from 'react-native';

export const isRemoteUri = (uri) =>
  typeof uri === 'string' && /^https?:\/\//i.test(uri.trim());

const inferMimeAndName = (uri, fallbackPrefix = 'upload', index = 0) => {
  const cleanUri = (uri || '').split('?')[0];
  const rawExt = cleanUri.includes('.') ? cleanUri.split('.').pop().toLowerCase() : 'jpg';
  const ext = ['jpg', 'jpeg', 'png', 'webp'].includes(rawExt) ? rawExt : 'jpg';
  const mime =
    ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  return {
    name: `${fallbackPrefix}_${Date.now()}_${index}.${ext}`,
    type: mime,
  };
};

export const appendImageToFormData = async (
  formData,
  fieldName,
  uri,
  index = 0,
  prefix = 'image'
) => {
  if (!uri) {
    return;
  }
  const { name, type } = inferMimeAndName(uri, prefix, index);

  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    const resolvedType =
      blob.type && blob.type.startsWith('image/') ? blob.type : type;
    const ext =
      resolvedType === 'image/png'
        ? 'png'
        : resolvedType === 'image/webp'
        ? 'webp'
        : 'jpg';
    const webFile =
      typeof File !== 'undefined'
        ? new File([blob], `${prefix}_${Date.now()}_${index}.${ext}`, { type: resolvedType })
        : blob;
    formData.append(fieldName, webFile, `${prefix}_${Date.now()}_${index}.${ext}`);
    return;
  }

  formData.append(fieldName, {
    uri,
    name,
    type,
  });
};
