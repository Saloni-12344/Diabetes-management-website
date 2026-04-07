import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// During development Resend lets you send from onboarding@resend.dev
// to any address without domain verification.
// When you have a real domain, change this to e.g. noreply@glucofamily.com
const FROM = 'GlucoFamily <onboarding@resend.dev>';

export async function sendInviteEmail(params: {
  toEmail: string;
  ownerName: string;
  isExistingUser: boolean;
}): Promise<void> {
  const { toEmail, ownerName, isExistingUser } = params;

  const subject = `${ownerName} invited you to GlucoFamily`;

  const html = isExistingUser
    ? `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#F7F8FA;border-radius:12px;">
        <div style="text-align:center;margin-bottom:24px;">
          <span style="font-size:36px;">💊</span>
          <h1 style="margin:8px 0 0;font-size:22px;color:#0F172A;font-family:Georgia,serif;">GlucoFamily</h1>
        </div>
        <div style="background:#fff;border-radius:10px;padding:28px;border:1px solid #E2E8F0;">
          <h2 style="margin:0 0 12px;font-size:18px;color:#0F172A;">You have been invited!</h2>
          <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">
            <strong>${ownerName}</strong> has invited you to monitor their health on GlucoFamily.
            As a viewer, you can see their glucose readings, meal logs, and receive critical alerts in real time.
          </p>
          <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px;">
            Since you already have an account, simply log in and go to the <strong>Family</strong> tab to accept the invite.
          </p>
          <div style="text-align:center;">
            <a href="http://localhost:5173" style="display:inline-block;background:#2563EB;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;">
              Open GlucoFamily
            </a>
          </div>
        </div>
        <p style="text-align:center;color:#94A3B8;font-size:12px;margin-top:20px;">
          You received this because ${ownerName} invited you. If this was a mistake, you can ignore this email.
        </p>
      </div>
    `
    : `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#F7F8FA;border-radius:12px;">
        <div style="text-align:center;margin-bottom:24px;">
          <span style="font-size:36px;">💊</span>
          <h1 style="margin:8px 0 0;font-size:22px;color:#0F172A;font-family:Georgia,serif;">GlucoFamily</h1>
        </div>
        <div style="background:#fff;border-radius:10px;padding:28px;border:1px solid #E2E8F0;">
          <h2 style="margin:0 0 12px;font-size:18px;color:#0F172A;">You have been invited!</h2>
          <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">
            <strong>${ownerName}</strong> has invited you to monitor their health on GlucoFamily.
            As a viewer, you can see their glucose readings, meal logs, and receive critical health alerts in real time.
          </p>
          <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:16px;margin-bottom:24px;">
            <p style="margin:0;color:#1E40AF;font-size:14px;font-weight:600;">How to join:</p>
            <ol style="margin:8px 0 0;padding-left:20px;color:#1E40AF;font-size:13px;line-height:1.8;">
              <li>Click the button below to open GlucoFamily</li>
              <li>Register using <strong>${toEmail}</strong> as your email address</li>
              <li>You will be automatically linked to ${ownerName}'s family</li>
              <li>Go to the <strong>Family</strong> tab to accept the invite</li>
            </ol>
          </div>
          <div style="text-align:center;">
            <a href="http://localhost:5173" style="display:inline-block;background:#2563EB;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;">
              Join GlucoFamily
            </a>
          </div>
        </div>
        <p style="text-align:center;color:#94A3B8;font-size:12px;margin-top:20px;">
          You received this because ${ownerName} invited ${toEmail}. If this was a mistake, you can ignore this email.
        </p>
      </div>
    `;

  const { error } = await resend.emails.send({ from: FROM, to: toEmail, subject, html });

  if (error) {
    // Log but don't crash the invite flow — the in-app invite still works
    console.error('Resend email failed:', error);
    throw new Error(`Email delivery failed: ${error.message}`);
  }

  console.log(`Invite email sent to ${toEmail}`);
}
