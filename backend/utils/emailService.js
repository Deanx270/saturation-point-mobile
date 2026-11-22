const nodemailer = require('nodemailer');
const path = require('path');

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'sandbox.smtp.mailtrap.io',
    port: Number(process.env.EMAIL_PORT) || 2525,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const sendVerificationEmail = async (toEmail, verificationUrl, displayName = '') => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('EMAIL_USER or EMAIL_PASS is missing in environment. Email not sent.');
      return false;
    }

    const transporter = getTransporter();
    const rawName = typeof displayName === 'string' ? displayName.trim() : '';
    const escapedName = rawName ? escapeHtml(rawName) : '';
    const escapedUrl = escapeHtml(verificationUrl);
    const logoPath = path.join(__dirname, '../assets/logo-mark.png');

    const greetingHtml = escapedName
      ? `<p style="font-size: 14.5px; line-height: 1.65; color: #1C1917; font-weight: 500; margin: 0 0 10px 0;">Hello ${escapedName},</p>`
      : '';

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your Email - The Saturation Point</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Lora:wght@600&family=Montserrat:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    @media only screen and (max-width: 480px) {
      .card-cell {
        padding: 28px 20px !important;
      }
      .cta-btn {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
        text-align: center !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF9F6; font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1C1917;">
  <span style="display: none; font-size: 1px; color: #FAF9F6; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">Confirm your email address to activate your Saturation Point account.</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FAF9F6; width: 100%; margin: 0; padding: 36px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 540px; width: 100%; background-color: #FFFFFF; border-radius: 8px; border: 1px solid #E7E5E4; border-top: 2px solid #CA8A04; box-shadow: 0 1px 4px rgba(28, 25, 23, 0.04); overflow: hidden;">
          <tr>
            <td class="card-cell" style="padding: 36px 36px 32px 36px; text-align: left;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="28" style="padding-right: 12px; vertical-align: middle;">
                    <img src="cid:satpoint-logo" alt="The Saturation Point" width="28" height="28" style="display: block; border: 0; outline: none; text-decoration: none;" />
                  </td>
                  <td style="vertical-align: middle;">
                    <p style="font-family: 'Lora', Georgia, 'Times New Roman', serif; font-size: 17px; font-weight: 600; color: #1C1917; line-height: 22px; margin: 0;">The Saturation Point</p>
                    <p style="font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 600; color: #A16207; letter-spacing: 0.6px; line-height: 15px; margin: 0;">Fine Writing Atelier</p>
                  </td>
                </tr>
              </table>

              <div style="height: 1px; background-color: #E7E5E4; width: 100%; margin: 24px 0 28px 0;"></div>

              <h1 style="font-family: 'Lora', Georgia, 'Times New Roman', serif; font-size: 22px; font-weight: 600; color: #1C1917; letter-spacing: -0.2px; line-height: 28px; margin: 0 0 14px 0;">Confirm Your Email</h1>
              ${greetingHtml}
              <p style="font-size: 14.5px; line-height: 1.65; color: #44403C; margin: 0 0 24px 0;">Thank you for creating an account with The Saturation Point. Confirm your email address below to activate your account, track orders, and write product reviews.</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left">
                    <a href="${escapedUrl}" target="_blank" class="cta-btn" style="display: inline-block; background-color: #1C1917; color: #FFFFFF; font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 600; letter-spacing: 0.2px; text-decoration: none; padding: 14px 28px; border-radius: 6px;">Confirm Email Address</a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 12.5px; line-height: 1.5; color: #57534E; margin: 14px 0 26px 0;">This confirmation link expires in 24 hours.</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F4F2EC; border: 1px solid #E7E5E4; border-radius: 6px; margin: 0 0 24px 0;">
                <tr>
                  <td style="padding: 14px 16px; text-align: left;">
                    <p style="font-size: 12px; line-height: 1.5; color: #57534E; margin: 0 0 6px 0; font-weight: 500;">Button not working? Copy and paste this link into your browser:</p>
                    <p style="font-size: 12px; line-height: 1.5; margin: 0; word-break: break-all;"><a href="${escapedUrl}" style="color: #A16207; text-decoration: underline;">${escapedUrl}</a></p>
                  </td>
                </tr>
              </table>

              <div style="height: 1px; background-color: #E7E5E4; width: 100%; margin: 0 0 18px 0;"></div>
              <p style="font-size: 12px; line-height: 1.55; color: #57534E; margin: 0 0 4px 0;">If you did not create an account with The Saturation Point, you can safely ignore this email.</p>
              <p style="font-size: 11.5px; line-height: 1.5; color: #78716C; margin: 0;">The Saturation Point &middot; Fine Writing Atelier</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const textLines = [];
    if (rawName) {
      textLines.push(`Hello ${rawName},`, '');
    }
    textLines.push(
      'Thank you for creating an account with The Saturation Point. Confirm your email address below to activate your account, track orders, and write product reviews.',
      '',
      'Confirm Email Address:',
      verificationUrl,
      '',
      'This confirmation link expires in 24 hours.',
      '',
      'If you did not create an account with The Saturation Point, you can safely ignore this email.',
      'The Saturation Point · Fine Writing Atelier'
    );

    const mailOptions = {
      from: '"The Saturation Point" <no-reply@thesaturationpoint.com>',
      to: toEmail,
      subject: 'Confirm Your Email — The Saturation Point',
      text: textLines.join('\n'),
      html: htmlContent,
      attachments: [
        {
          filename: 'logo-mark.png',
          path: logoPath,
          cid: 'satpoint-logo',
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${toEmail} (Message ID: ${info.messageId})`);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
};

module.exports = {
  sendVerificationEmail,
};
