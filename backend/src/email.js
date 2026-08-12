// Sends transactional email (currently just password reset codes) through
// Gmail's own SMTP server. Cloudflare Workers cannot use Node's net module or
// nodemailer directly, so this goes through worker-mailer, which speaks SMTP
// over Workers' TCP sockets (needs "nodejs_compat" in wrangler.jsonc). Auth
// is an app password (env.GMAIL_APP_PASSWORD, set with `wrangler secret
// put`), never the real Gmail account password.

import { WorkerMailer } from 'worker-mailer';

const GMAIL_ADDRESS = 'mymitzvahsapp@gmail.com';

export async function sendPasswordResetEmail(env, toEmail, code) {
  await WorkerMailer.send(
    {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      startTls: true,
      credentials: {
        username: GMAIL_ADDRESS,
        password: env.GMAIL_APP_PASSWORD,
      },
      authType: 'plain',
    },
    {
      from: { name: 'My Mitzvahs', email: GMAIL_ADDRESS },
      to: toEmail,
      subject: 'Your My Mitzvahs password reset code',
      text: `Your password reset code is ${code}\n\nEnter this in the app to set a new password. It expires in 30 minutes.\n\nIf you didn't request this, you can ignore this email.`,
    }
  );
}
