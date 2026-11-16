export const ORDER_STATUS_TRANSITIONS = {
  pending: [
    { key: 'processing', label: 'Mark as Processing', icon: 'construct-outline' },
    {
      key: 'cancelled',
      label: 'Cancel Order',
      icon: 'close-circle-outline',
      destructive: true,
    },
  ],
  processing: [
    { key: 'shipped', label: 'Mark as Shipped', icon: 'airplane-outline' },
    {
      key: 'cancelled',
      label: 'Cancel Order',
      icon: 'close-circle-outline',
      destructive: true,
    },
  ],
  shipped: [
    {
      key: 'delivered',
      label: 'Mark as Delivered',
      icon: 'checkmark-done-circle-outline',
    },
  ],
  delivered: [],
  cancelled: [],
};
