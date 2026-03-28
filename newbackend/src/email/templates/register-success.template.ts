export function registerSuccessTemplate(platformName: string, username: string, siteUrl: string = '#'): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to ${platformName}!</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #0a0d1a; color: #e2e8f0; }
    .wrapper { max-width: 600px; margin: 40px auto; padding: 0 16px; }
    .card { background: linear-gradient(135deg, #0f1628 0%, #151d35 100%); border: 1px solid #1e2d4a; border-radius: 20px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%); padding: 40px 40px 30px; text-align: center; }
    .logo { font-size: 28px; font-weight: 800; color: #fff; letter-spacing: -0.5px; }
    .header-title { font-size: 32px; margin: 16px 0 4px; }
    .header-sub { color: rgba(255,255,255,0.8); font-size: 15px; }
    .body { padding: 40px; }
    .greeting { font-size: 22px; font-weight: 700; color: #fff; margin-bottom: 12px; }
    .text { color: #94a3b8; font-size: 15px; line-height: 1.7; margin-bottom: 20px; }
    .features { display: flex; flex-direction: column; gap: 12px; margin: 24px 0; }
    .feature { display: flex; align-items: center; gap: 14px; background: rgba(255,255,255,0.03); border: 1px solid #1e2d4a; border-radius: 10px; padding: 14px 16px; }
    .feature-icon { font-size: 22px; flex-shrink: 0; }
    .feature-text { color: #cbd5e1; font-size: 14px; }
    .feature-text strong { color: #fff; display: block; font-size: 15px; margin-bottom: 2px; }
    .btn-wrap { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #059669, #047857); color: #fff !important; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-size: 16px; font-weight: 700; box-shadow: 0 8px 32px rgba(5,150,105,0.4); }
    .footer { text-align: center; padding: 24px 40px; background: rgba(0,0,0,0.2); }
    .footer-text { color: #475569; font-size: 12px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="logo">${platformName}</div>
        <div class="header-title">🎉</div>
        <div class="header-sub">Your account is ready!</div>
      </div>

      <div class="body">
        <div class="greeting">Welcome aboard, ${username}!</div>
        <p class="text">You've successfully joined <strong style="color:#34d399;">${platformName}</strong>. Your account is now active and ready to go. Here's what you can do next:</p>

        <div class="features">
          <div class="feature">
            <span class="feature-icon">💰</span>
            <div class="feature-text"><strong>Make Your First Deposit</strong>Instant UPI &amp; crypto deposits available 24/7.</div>
          </div>
          <div class="feature">
            <span class="feature-icon">🏆</span>
            <div class="feature-text"><strong>Place Sports Bets</strong>Live odds on cricket, football &amp; more.</div>
          </div>
          <div class="feature">
            <span class="feature-icon">🎰</span>
            <div class="feature-text"><strong>Explore Casino Games</strong>Hundreds of slots, live tables &amp; more.</div>
          </div>
          <div class="feature">
            <span class="feature-icon">🎁</span>
            <div class="feature-text"><strong>Claim Your Bonus</strong>Check the promotions page for your welcome offer.</div>
          </div>
        </div>

        <div class="btn-wrap">
          <a href="${siteUrl}" class="btn">🚀 Start Playing Now</a>
        </div>
      </div>

      <div class="footer">
        <p class="footer-text">© ${new Date().getFullYear()} ${platformName}. All rights reserved.<br/>Please gamble responsibly.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
