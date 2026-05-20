type OtpEmailTemplateOptions = {
  title: string;
  preheader: string;
  greeting?: string;
  intro: string;
  otp: string;
  expiresIn: string;
  note?: string;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export const createOtpEmailTemplate = ({
  title,
  preheader,
  greeting = 'Hello,',
  intro,
  otp,
  expiresIn,
  note = 'If you did not request this email, you can safely ignore it.',
}: OtpEmailTemplateOptions) => {
  const safeTitle = escapeHtml(title);
  const safePreheader = escapeHtml(preheader);
  const safeGreeting = escapeHtml(greeting);
  const safeIntro = escapeHtml(intro);
  const safeOtp = escapeHtml(otp);
  const safeExpiresIn = escapeHtml(expiresIn);
  const safeNote = escapeHtml(note);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>${safeTitle}</title>
  </head>
  <body style="margin:0;padding:0;background:#f2fbfa;font-family:Arial,Helvetica,sans-serif;color:#102322;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${safePreheader}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2fbfa;margin:0;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #cfe7e3;border-radius:18px;overflow:hidden;box-shadow:0 12px 32px rgba(8,89,83,0.10);">
            <tr>
              <td style="background:linear-gradient(135deg,#08998f 0%,#0f766e 100%);padding:28px 28px 24px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td>
                      <div style="display:inline-block;width:44px;height:44px;line-height:44px;text-align:center;border-radius:12px;background:rgba(255,255,255,0.16);color:#ffffff;font-size:22px;font-weight:800;">M</div>
                    </td>
                  </tr>
                </table>
                <h1 style="margin:18px 0 6px;color:#ffffff;font-size:26px;line-height:1.25;font-weight:800;">${safeTitle}</h1>
                <p style="margin:0;color:#d8fffb;font-size:14px;line-height:1.6;">Mess OS account security</p>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 28px 8px;">
                <p style="margin:0 0 12px;color:#102322;font-size:16px;line-height:1.6;font-weight:700;">${safeGreeting}</p>
                <p style="margin:0;color:#4a6764;font-size:15px;line-height:1.7;">${safeIntro}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;">
                <div style="background:#effaf8;border:1px dashed #0f9f95;border-radius:16px;padding:22px;text-align:center;">
                  <p style="margin:0 0 8px;color:#4a6764;font-size:12px;text-transform:uppercase;letter-spacing:1.8px;font-weight:800;">Your OTP Code</p>
                  <div style="font-size:36px;line-height:1;letter-spacing:10px;font-weight:900;color:#063f3b;">${safeOtp}</div>
                  <p style="margin:14px 0 0;color:#0f766e;font-size:13px;font-weight:700;">Expires in ${safeExpiresIn}</p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px;">
                <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;padding:14px 16px;">
                  <p style="margin:0;color:#9a3412;font-size:13px;line-height:1.6;">${safeNote}</p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;background:#f8fbfb;border-top:1px solid #e4efed;">
                <p style="margin:0 0 4px;color:#102322;font-size:13px;font-weight:800;">Mess OS</p>
                <p style="margin:0;color:#6b817f;font-size:12px;line-height:1.6;">This is an automated email. Please do not reply to this message.</p>
              </td>
            </tr>
          </table>
          <p style="margin:18px 0 0;color:#7b918f;font-size:12px;">© 2026 Mess OS. All rights reserved.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};
