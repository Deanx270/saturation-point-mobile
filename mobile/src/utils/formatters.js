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
