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
