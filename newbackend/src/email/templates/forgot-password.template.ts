export function forgotPasswordTemplate(platformName: string, resetLink: string, username: string = 'User'): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Your Password — ${platformName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #0a0d1a; color: #e2e8f0; }
    .wrapper { max-width: 600px; margin: 40px auto; padding: 0 16px; }
    .card { background: linear-gradient(135deg, #0f1628 0%, #151d35 100%); border: 1px solid #1e2d4a; border-radius: 20px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #1a237e 0%, #0d47a1 50%, #1565c0 100%); padding: 40px 40px 30px; text-align: center; }
    .logo { font-size: 28px; font-weight: 800; color: #fff; letter-spacing: -0.5px; }
    .logo span { color: #64b5f6; }
    .header-icon { width: 64px; height: 64px; background: rgba(255,255,255,0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 20px auto 0; font-size: 28px; }
    .body { padding: 40px; }
    .greeting { font-size: 22px; font-weight: 700; color: #fff; margin-bottom: 12px; }
    .text { color: #94a3b8; font-size: 15px; line-height: 1.7; margin-bottom: 20px; }
    .btn-wrap { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #1565c0, #0d47a1); color: #fff !important; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-size: 16px; font-weight: 700; letter-spacing: 0.3px; box-shadow: 0 8px 32px rgba(21,101,192,0.4); }
    .divider { border: none; border-top: 1px solid #1e2d4a; margin: 28px 0; }
    .note { background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2); border-radius: 10px; padding: 14px 18px; }
    .note-text { color: #fbbf24; font-size: 13px; line-height: 1.6; }
    .link-box { background: #0a0d1a; border: 1px solid #1e2d4a; border-radius: 8px; padding: 12px 16px; margin-top: 20px; word-break: break-all; }
    .link-text { color: #64b5f6; font-size: 12px; font-family: monospace; }
    .footer { text-align: center; padding: 24px 40px; background: rgba(0,0,0,0.2); }
    .footer-text { color: #475569; font-size: 12px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="logo">${platformName.split('').slice(0, -1).join('')}<span>${platformName.slice(-1)}</span></div>
        <div class="header-icon" style="background:rgba(255,255,255,0.15);width:64px;height:64px;border-radius:50%;margin:20px auto 0;display:table;">
          <div style="display:table-cell;vertical-align:middle;text-align:center;font-size:28px;">🔑</div>
        </div>
      </div>

      <div class="body">
        <div class="greeting">Password Reset Request</div>
        <p class="text">Hi <strong style="color:#e2e8f0;">${username}</strong>,</p>
        <p class="text">We received a request to reset the password for your <strong style="color:#64b5f6;">${platformName}</strong> account. Click the button below to set a new password.</p>

        <div class="btn-wrap">
          <a href="${resetLink}" class="btn">🔐 Reset My Password</a>
        </div>

        <div class="note">
          <p class="note-text">⏰ <strong>This link expires in 1 hour.</strong> If you didn't request this, you can safely ignore this email — your account remains secure.</p>
        </div>

        <hr class="divider" />
        <p class="text" style="font-size:13px;">If the button above doesn't work, copy and paste this link into your browser:</p>
        <div class="link-box">
          <span class="link-text">${resetLink}</span>
        </div>
      </div>

      <div class="footer">
        <p class="footer-text">© ${new Date().getFullYear()} ${platformName}. All rights reserved.<br/>This is an automated message, please do not reply.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
