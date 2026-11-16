import * as Yup from 'yup';

export const EMAIL_TLD_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const emailSchemaField = Yup.string()
  .trim()
  .email('Invalid email address')
  .matches(EMAIL_TLD_REGEX, 'Enter a valid email address (e.g. name@example.com)')
  .required('Email is required');

export const passwordSchemaField = Yup.string()
  .min(6, 'Minimum 6 characters')
  .required('Password is required');

export const loginPasswordSchemaField = Yup.string()
  .required('Password is required');
