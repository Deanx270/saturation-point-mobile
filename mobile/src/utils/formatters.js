import { PixelRatio } from 'react-native';

export const formatPrice = (amount) => {
  const numericAmount = Number(amount) || 0;
  return `₱${numericAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatDate = (dateInput) => {
  if (!dateInput) {
    return '';
  }
  return new Date(dateInput).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const isValidRemoteOrLocalUri = (uri) => {
  if (!uri || typeof uri !== 'string') {
    return false;
  }
  return (
    uri.startsWith('http://') ||
    uri.startsWith('https://') ||
    uri.startsWith('file://') ||
    uri.startsWith('content://')
  );
};

export const formatOrderStatus = (status) => {
  if (!status || typeof status !== 'string') {
    return 'Pending';
  }
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};

export const resolveProductPricing = (
  product,
  fallbackDiscountPercent = 0,
  fallbackPromoTitle = ''
) => {
  const basePrice = Number(product?.price) || 0;
  const livePromo = product?.activePromotion;

  if (
    livePromo &&
    Number(livePromo.discountPercent) > 0 &&
    Number(livePromo.discountPercent) < 100
  ) {
    const discountPercent = Number(livePromo.discountPercent);
    const effectivePrice =
      Number(livePromo.discountedPrice) > 0
        ? Number(livePromo.discountedPrice)
        : Math.max(1, Math.round(basePrice * (1 - discountPercent / 100)));
    return {
      hasPromo: true,
      discountPercent,
      promoTitle: livePromo.title || fallbackPromoTitle || '',
      expiresAt: livePromo.expiresAt || null,
      basePrice,
      effectivePrice,
    };
  }

  const parsedFallback = Number(fallbackDiscountPercent) || 0;
  if (
    (!product || product.activePromotion === undefined) &&
    parsedFallback > 0 &&
    parsedFallback < 100
  ) {
    return {
      hasPromo: true,
      discountPercent: parsedFallback,
      promoTitle: fallbackPromoTitle || '',
      expiresAt: null,
      basePrice,
      effectivePrice:
        basePrice > 0
          ? Math.max(1, Math.round(basePrice * (1 - parsedFallback / 100)))
          : 0,
    };
  }

  return {
    hasPromo: false,
    discountPercent: 0,
    promoTitle: '',
    expiresAt: null,
    basePrice,
    effectivePrice: basePrice,
  };
};

const CLOUDINARY_UPLOAD_MARKER = '/image/upload/';

const getTargetPixelDimension = (logicalPx) => {
  const parsed = Number(logicalPx) || 0;
  if (parsed <= 0) {
    return 0;
  }
  const rawRatio = typeof PixelRatio?.get === 'function' ? PixelRatio.get() : 2;
  const clampedRatio = Math.min(Math.max(rawRatio || 2, 2), 3);
  const rawPixels = Math.round(parsed * clampedRatio);
  const bucketed = Math.ceil(rawPixels / 20) * 20;
  return Math.min(bucketed, 1400);
};

export const optimizeImageUrl = (
  uri,
  { width, height, crop = 'fill', gravity = 'auto' } = {}
) => {
  if (!uri || typeof uri !== 'string') {
    return uri;
  }
  if (uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('data:')) {
    return uri;
  }

  const targetWidth = getTargetPixelDimension(width);
  const targetHeight = getTargetPixelDimension(height);
  if (targetWidth <= 0) {
    return uri;
  }

  if (uri.includes('res.cloudinary.com') && uri.includes(CLOUDINARY_UPLOAD_MARKER)) {
    const markerIndex = uri.indexOf(CLOUDINARY_UPLOAD_MARKER);
    const prefix = uri.slice(0, markerIndex + CLOUDINARY_UPLOAD_MARKER.length);
    const suffix = uri.slice(markerIndex + CLOUDINARY_UPLOAD_MARKER.length);
    const firstSegment = suffix.split('/')[0] || '';
    const hasExistingTransforms =
      !/^v\d+$/.test(firstSegment) &&
      /(^|,)(w_|h_|c_|q_|f_|g_|dpr_)/.test(firstSegment);

    if (hasExistingTransforms) {
      return uri;
    }

    const transforms = ['f_auto', 'q_auto:good', `c_${crop}`];
    if (crop === 'fill' || crop === 'thumb') {
      transforms.push(`g_${gravity}`);
    }
    transforms.push(`w_${targetWidth}`);
    if (targetHeight > 0) {
      transforms.push(`h_${targetHeight}`);
    }

    return `${prefix}${transforms.join(',')}/${suffix}`;
  }

  if (uri.includes('images.unsplash.com')) {
    try {
      const parsedUrl = new URL(uri);
      parsedUrl.searchParams.set('w', String(targetWidth));
      if (!parsedUrl.searchParams.has('q')) {
        parsedUrl.searchParams.set('q', '80');
      }
      if (!parsedUrl.searchParams.has('auto')) {
        parsedUrl.searchParams.set('auto', 'format');
      }
      return parsedUrl.toString();
    } catch (e) {
      return uri;
    }
  }

  return uri;
};
