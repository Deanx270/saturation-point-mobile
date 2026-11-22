import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import AtelierText from '../common/AtelierText';
import AtelierButton from '../common/AtelierButton';
import AtelierCard from '../common/AtelierCard';
import AtelierPressable from '../common/AtelierPressable';
import { formatCooldownTime } from '../../utils/useVerificationResend';

const getResendLabel = (resending, cooldownSeconds, compact) => {
  if (resending) {
    return 'Sending Link...';
  }
  if (cooldownSeconds > 0) {
    return `Resend in ${formatCooldownTime(cooldownSeconds)}`;
  }
  return compact ? 'Resend Confirmation Link' : 'Resend Confirmation Email';
};

export const EmailVerificationNotice = ({
  mode = 'inline',
  email,
  message,
  emailSent = true,
  resending = false,
  cooldownSeconds = 0,
  onResend,
  onProceedToSignIn,
  onEditEmail,
  style,
}) => {
  if (mode === 'screen') {
    const description = emailSent
      ? 'Open the confirmation link we sent to activate your account. Check your spam or promotions folder if it does not arrive shortly.'
      : 'Your account was created, but we could not deliver the confirmation email just yet. Tap resend below to send a new link.';

    return (
      <View style={[styles.screenContainer, style]}>
        <View style={styles.iconFrame}>
          <Ionicons
            name="mail-unread-outline"
            size={32}
            color={theme.colors.goldText}
          />
        </View>

        <AtelierText
          variant="overline"
          color={theme.colors.goldText}
          style={styles.screenEyebrow}
        >
          {emailSent ? 'Confirmation Sent' : 'Action Required'}
        </AtelierText>

        <AtelierText
          variant="title1"
          style={styles.screenTitle}
        >
          Check Your Inbox
        </AtelierText>

        <AtelierText
          variant="bodyMedium"
          color={theme.colors.inkSecondary}
          style={styles.screenDescription}
        >
          {description}
        </AtelierText>

        <AtelierCard style={styles.detailsCard}>
          <View style={styles.refRow}>
            <AtelierText
              variant="bodySmall"
              color={theme.colors.inkMuted}
              style={styles.detailLabel}
            >
              Sent to
            </AtelierText>
            <AtelierText
              variant="bodySmall"
              color={theme.colors.inkPrimary}
              style={styles.detailEmailValue}
            >
              {email}
            </AtelierText>
          </View>
          <View style={styles.refDivider} />
          <View style={styles.refRow}>
            <AtelierText
              variant="bodySmall"
              color={theme.colors.inkMuted}
              style={styles.detailLabel}
            >
              Link expires
            </AtelierText>
            <AtelierText
              variant="bodySmall"
              color={theme.colors.goldText}
              style={styles.detailValue}
            >
              24 hours
            </AtelierText>
          </View>
        </AtelierCard>

        <AtelierButton
          title="Proceed to Sign In"
          onPress={onProceedToSignIn}
          style={styles.primaryAction}
        />

        <AtelierButton
          title={getResendLabel(resending, cooldownSeconds, false)}
          variant="outline"
          loading={resending}
          disabled={cooldownSeconds > 0}
          onPress={onResend}
          style={styles.secondaryAction}
        />

        {onEditEmail ? (
          <AtelierPressable
            tone="subtle"
            hitSlop={8}
            onPress={onEditEmail}
            style={styles.editEmailLink}
          >
            <AtelierText
              variant="button"
              color={theme.colors.goldText}
            >
              Wrong email? Edit address
            </AtelierText>
          </AtelierPressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.inlineBanner, style]}>
      <View style={styles.inlineHeader}>
        <Ionicons
          name="mail-unread-outline"
          size={18}
          color={theme.colors.goldText}
          style={styles.inlineIcon}
        />
        <AtelierText
          variant="button"
          color={theme.colors.inkPrimary}
        >
          Email Verification Required
        </AtelierText>
      </View>

      <AtelierText
        variant="bodySmall"
        color={theme.colors.inkSecondary}
        style={styles.inlineBody}
      >
        {message}
      </AtelierText>

      {email ? (
        <AtelierText
          variant="bodySmall"
          color={theme.colors.inkPrimary}
          style={styles.inlineEmail}
        >
          {email}
        </AtelierText>
      ) : null}

      <AtelierButton
        title={getResendLabel(resending, cooldownSeconds, true)}
        variant="outline"
        loading={resending}
        disabled={cooldownSeconds > 0}
        onPress={onResend}
        style={styles.inlineButton}
      />

      {onProceedToSignIn ? (
        <AtelierPressable
          tone="subtle"
          hitSlop={8}
          onPress={onProceedToSignIn}
          style={styles.inlineSignInLink}
        >
          <AtelierText
            variant="button"
            color={theme.colors.goldText}
          >
            Go to Sign In
          </AtelierText>
        </AtelierPressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  inlineBanner: {
    backgroundColor: theme.colors.goldLight,
    borderColor: theme.colors.goldBorder,
    borderWidth: 1,
    borderRadius: theme.radii.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  inlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  inlineIcon: {
    marginRight: theme.spacing.xs,
  },
  inlineBody: {
    lineHeight: 18,
    marginBottom: theme.spacing.xs,
  },
  inlineEmail: {
    fontFamily: 'Montserrat_600SemiBold',
    lineHeight: 18,
    marginBottom: theme.spacing.md,
  },
  inlineButton: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.goldBorder,
  },
  inlineSignInLink: {
    minHeight: theme.touchTarget.minHeight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xs,
  },
  screenContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  iconFrame: {
    width: 72,
    height: 72,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  screenEyebrow: {
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  screenTitle: {
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  screenDescription: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xs,
  },
  detailsCard: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  refRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 42,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  detailLabel: {
    fontFamily: 'Montserrat_500Medium',
  },
  detailEmailValue: {
    fontFamily: 'Montserrat_600SemiBold',
    flexShrink: 1,
    textAlign: 'right',
  },
  detailValue: {
    fontFamily: 'Montserrat_600SemiBold',
  },
  refDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  primaryAction: {
    width: '100%',
    marginBottom: theme.spacing.md,
  },
  secondaryAction: {
    width: '100%',
    marginBottom: theme.spacing.sm,
  },
  editEmailLink: {
    minHeight: theme.touchTarget.minHeight,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
  },
});

export default EmailVerificationNotice;
