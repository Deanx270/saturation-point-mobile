import * as Yup from 'yup';

export const EMAIL_TLD_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

export const emailSchemaField = Yup.string()
  .trim()
  .email('Invalid email address')
  .matches(EMAIL_TLD_REGEX, 'Enter a valid email address (e.g. name@example.com)')
  .required('Email is required');

export const identifierSchemaField = Yup.string()
  .trim()
  .test(
    'email-or-username',
    'Enter a valid email address or username (3–30 characters)',
    (value) => {
      if (!value) {
        return false;
      }
      const clean = value.trim().replace(/^@/, '');
      if (clean.includes('@')) {
        return EMAIL_TLD_REGEX.test(clean);
      }
      return USERNAME_REGEX.test(clean);
    }
  )
  .required('Email or username is required');

export const usernameSchemaField = Yup.string()
  .trim()
  .transform((value) => (value ? value.replace(/^@/, '') : value))
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be 30 characters or fewer')
  .matches(/^[a-zA-Z0-9_]+$/, 'Use only letters, numbers, and underscores')
  .required('Username is required');

export const passwordSchemaField = Yup.string()
  .min(6, 'Minimum 6 characters')
  .required('Password is required');

export const loginPasswordSchemaField = Yup.string()
  .required('Password is required');

export const displayNameSchemaField = Yup.string()
  .trim()
  .min(2, 'Display name must be at least 2 characters')
  .required('Display name is required');
