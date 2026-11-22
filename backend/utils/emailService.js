const nodemailer = require('nodemailer');
const path = require('path');

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
    const safeName = displayName && displayName.trim() ? displayName.trim() : 'Valued Patron';
    const logoPath = path.join(__dirname, '../assets/logo-mark.png');

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your Email - The Saturation Point</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF9F6; font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1C1917;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FAF9F6; width: 100%; margin: 0; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; width: 100%; background-color: #FFFFFF; border-radius: 8px; border: 1px solid #E7E5E4; border-top: 3px solid #CA8A04; box-shadow: 0 4px 12px rgba(28, 25, 23, 0.04); overflow: hidden;">
          <tr>
            <td style="padding: 40px 36px 32px 36px; text-align: center;">
              <img src="cid:satpoint-logo" alt="The Saturation Point" width="46" height="46" style="display: block; margin: 0 auto 14px auto; border: 0; outline: none; text-decoration: none;" />
              <h1 style="font-family: 'Lora', Georgia, 'Times New Roman', serif; font-size: 20px; font-weight: 600; color: #1C1917; letter-spacing: 2.2px; text-transform: uppercase; margin: 0 0 6px 0;">THE SATURATION POINT</h1>
              <p style="font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10.5px; font-weight: 600; color: #A16207; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 28px 0;">FINE WRITING ATELIER</p>
              <div style="height: 1px; background-color: #E7E5E4; width: 100%; margin: 0 0 32px 0;"></div>
              
              <h2 style="font-family: 'Lora', Georgia, serif; font-size: 22px; font-weight: 600; color: #1C1917; margin: 0 0 16px 0; letter-spacing: -0.3px;">Confirm Your Email</h2>
              <p style="font-size: 14.5px; line-height: 1.7; color: #44403C; margin: 0 0 16px 0; text-align: left;">Dear ${safeName},</p>
              <p style="font-size: 14px; line-height: 1.7; color: #57534E; margin: 0 0 28px 0; text-align: left;">Thank you for registering with The Saturation Point. To complete your account activation and access your orders, saved collection, and reviews, please confirm your email address by selecting the button below.</p>
              
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 28px 0;">
                <tr>
                  <td align="center">
                    <a href="${verificationUrl}" target="_blank" style="display: inline-block; background-color: #1C1917; color: #FFFFFF; font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; text-decoration: none; padding: 15px 36px; border-radius: 4px; box-shadow: 0 2px 6px rgba(28, 25, 23, 0.16);">CONFIRM EMAIL ADDRESS</a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 12px; line-height: 1.6; color: #78716C; margin: 0 0 24px 0;">This confirmation link is valid for 24 hours.</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FAF9F6; border: 1px solid #E7E5E4; border-radius: 4px; margin: 0 0 28px 0;">
                <tr>
                  <td style="padding: 14px 16px; text-align: left;">
                    <p style="font-size: 11.5px; line-height: 1.5; color: #78716C; margin: 0 0 6px 0; font-weight: 500;">If the button does not work, copy and paste this link into your browser:</p>
                    <p style="font-size: 11.5px; line-height: 1.5; margin: 0; word-break: break-all;"><a href="${verificationUrl}" style="color: #A16207; text-decoration: underline;">${verificationUrl}</a></p>
                  </td>
                </tr>
              </table>

              <div style="height: 1px; background-color: #E7E5E4; width: 100%; margin: 0 0 24px 0;"></div>
              <p style="font-size: 11px; line-height: 1.6; color: #A8A29E; margin: 0 0 4px 0;">If you did not request an account with The Saturation Point, you can safely disregard this message.</p>
              <p style="font-size: 11px; line-height: 1.6; color: #A8A29E; margin: 0;">This is an automated notification • Please do not reply directly.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const mailOptions = {
      from: '"The Saturation Point" <no-reply@thesaturationpoint.com>',
      to: toEmail,
      subject: 'Confirm Your Email — The Saturation Point',
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
