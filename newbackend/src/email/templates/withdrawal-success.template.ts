export function withdrawalSuccessTemplate(platformName: string, username: string, amount: string, currency: string = 'INR', siteUrl: string = '#'): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Withdrawal Processed — ${platformName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #0a0d1a; color: #e2e8f0; }
    .wrapper { max-width: 600px; margin: 40px auto; padding: 0 16px; }
    .card { background: linear-gradient(135deg, #0f1628 0%, #151d35 100%); border: 1px solid #1e2d4a; border-radius: 20px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%); padding: 40px; text-align: center; }
    .logo { font-size: 24px; font-weight: 800; color: #fff; margin-bottom: 16px; }
    .amount-badge { background: rgba(255,255,255,0.15); border-radius: 16px; display: inline-block; padding: 12px 32px; }
    .amount-label { color: rgba(255,255,255,0.7); font-size: 13px; text-transform: uppercase; letter-spacing: 1px; }
    .amount-value { font-size: 40px; font-weight: 900; color: #fff; margin-top: 4px; }
    .status-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.15); border-radius: 99px; padding: 6px 18px; margin-top: 16px; }
    .status-dot { width: 8px; height: 8px; background: #a5b4fc; border-radius: 50%; }
    .status-text { color: #fff; font-size: 13px; font-weight: 600; }
    .body { padding: 40px; }
    .greeting { font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 10px; }
    .text { color: #94a3b8; font-size: 15px; line-height: 1.7; margin-bottom: 20px; }
    .info-box { background: rgba(255,255,255,0.03); border: 1px solid #1e2d4a; border-radius: 12px; padding: 20px; margin: 24px 0; }
    .info-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #1e2d4a; }
    .info-row:last-child { border-bottom: none; padding-bottom: 0; }
    .info-label { color: #64748b; font-size: 13px; }
    .info-value { color: #e2e8f0; font-size: 14px; font-weight: 600; }
    .timeline { background: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.2); border-radius: 10px; padding: 16px 18px; margin: 16px 0; }
    .timeline-text { color: #a5b4fc; font-size: 13px; line-height: 1.7; }
    .btn-wrap { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #4f46e5, #4338ca); color: #fff !important; text-decoration: none; padding: 14px 44px; border-radius: 12px; font-size: 15px; font-weight: 700; box-shadow: 0 8px 32px rgba(79,70,229,0.35); }
    .footer { text-align: center; padding: 24px 40px; background: rgba(0,0,0,0.2); }
    .footer-text { color: #475569; font-size: 12px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="logo">${platformName}</div>
        <div class="amount-badge">
          <div class="amount-label">Amount Withdrawn</div>
          <div class="amount-value">${currency} ${amount}</div>
        </div>
        <div><div class="status-badge"><div class="status-dot"></div><span class="status-text">✓ Processed</span></div></div>
      </div>

      <div class="body">
        <div class="greeting">Withdrawal Processed! 💸</div>
        <p class="text">Hi <strong style="color:#e2e8f0;">${username}</strong>, your withdrawal request has been approved and processed successfully.</p>

        <div class="info-box">
          <div class="info-row">
            <span class="info-label">Amount</span>
            <span class="info-value" style="color:#818cf8;">${currency} ${amount}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Status</span>
            <span class="info-value" style="color:#818cf8;">✓ Approved &amp; Dispatched</span>
          </div>
          <div class="info-row">
            <span class="info-label">Date</span>
            <span class="info-value">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</span>
          </div>
        </div>

        <div class="timeline">
          <p class="timeline-text">⏱️ <strong style="color:#c7d2fe;">Expected Arrival:</strong> Funds are typically credited to your bank/UPI within a few hours. If you experience any delay beyond 24 hours, please contact our support team.</p>
        </div>

        <div class="btn-wrap">
          <a href="${siteUrl}" class="btn">🎮 Play Again</a>
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
