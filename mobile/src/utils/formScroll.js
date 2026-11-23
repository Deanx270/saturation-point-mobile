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

const extractValidationErrors = (err) => {
  const mapped = {};
  if (Array.isArray(err?.inner) && err.inner.length > 0) {
    err.inner.forEach((issue) => {
      if (issue.path && !mapped[issue.path]) {
        mapped[issue.path] = issue.message;
      }
    });
  } else if (err?.path) {
    mapped[err.path] = err.message;
  }
  return mapped;
};

export const submitFormWithScroll = ({
  schema,
  values,
  setErrors,
  validateForm,
  setTouched,
  setSubmitting,
  resetForm,
  onSubmit,
  handleSubmit,
  scrollViewRef,
  yPositions,
  fieldOrder = [],
  onBeforeValidate,
}) => {
  const runSubmission = (formErrors, extraErrors) => {
    const mergedErrors = { ...formErrors, ...(extraErrors || {}) };
    const order =
      fieldOrder.length > 0 ? fieldOrder : Object.keys(mergedErrors);
    const firstErrorField = order.find((key) => Boolean(mergedErrors[key]));

    if (firstErrorField) {
      if (schema && setErrors) {
        setErrors(formErrors);
      }
      const touchedMap = {};
      Object.keys(formErrors).forEach((key) => {
        touchedMap[key] = true;
      });
      if (Object.keys(touchedMap).length > 0 && setTouched) {
        setTouched(touchedMap, false);
      }
      scrollToFieldPosition(scrollViewRef, yPositions, firstErrorField);
      return false;
    }

    if (onSubmit) {
      Keyboard.dismiss();
      if (setSubmitting) {
        setSubmitting(true);
      }
      Promise.resolve(
        onSubmit(values, {
          resetForm,
          setErrors,
          setTouched,
          setSubmitting,
        })
      ).finally(() => {
        if (setSubmitting) {
          setSubmitting(false);
        }
      });
      return true;
    }

    if (handleSubmit) {
      handleSubmit();
    }
    return true;
  };

  const extraResult = onBeforeValidate ? onBeforeValidate() : {};

  if (schema && values !== undefined) {
    let syncErrors = {};
    try {
      schema.validateSync(values, { abortEarly: false });
    } catch (err) {
      syncErrors = extractValidationErrors(err);
    }
    if (extraResult && typeof extraResult.then === 'function') {
      return extraResult.then((resolvedExtra) =>
        runSubmission(syncErrors, resolvedExtra)
      );
    }
    return runSubmission(syncErrors, extraResult);
  }

  return Promise.all([
    Promise.resolve(extraResult),
    validateForm ? validateForm() : {},
  ]).then(([resolvedExtra, asyncErrors]) =>
    runSubmission(asyncErrors || {}, resolvedExtra)
  );
};
