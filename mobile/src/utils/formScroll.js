import { Keyboard } from 'react-native';

export const scrollToFieldPosition = (
  scrollViewRef,
  yPositions,
  fieldName,
  extraOffset = 16
) => {
  const targetY = yPositions?.[fieldName];
  if (typeof targetY === 'number' && scrollViewRef?.current?.scrollTo) {
    Keyboard.dismiss();
    scrollViewRef.current.scrollTo({
      y: Math.max(0, targetY - extraOffset),
      animated: true,
    });
  }
};

export const submitFormWithScroll = async ({
  validateForm,
  setTouched,
  handleSubmit,
  scrollViewRef,
  yPositions,
  fieldOrder,
  onBeforeValidate,
}) => {
  const extraErrors = onBeforeValidate ? await onBeforeValidate() : {};
  const formErrors = await validateForm();
  const mergedErrors = { ...formErrors, ...(extraErrors || {}) };
  const firstErrorField = fieldOrder.find((key) => Boolean(mergedErrors[key]));

  if (firstErrorField) {
    const touchedMap = {};
    fieldOrder.forEach((key) => {
      if (formErrors[key]) {
        touchedMap[key] = true;
      }
    });
    if (Object.keys(touchedMap).length > 0 && setTouched) {
      await setTouched(touchedMap, false);
    }
    scrollToFieldPosition(scrollViewRef, yPositions, firstErrorField);
    return false;
  }

  handleSubmit();
  return true;
};
