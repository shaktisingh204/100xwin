// ──────────────────────────────────────────────────────────────────────────────
// DEPRECATED — Sports syncing has been moved to the NestJS backend.
//
// All three cron jobs (sports, events, odds) are now handled by:
//   newbackend/src/sports/turnkey-sync.service.ts
//
// This binary is intentionally a no-op. Stop and delete this PM2 process:
//   pm2 stop sports-sync-rust
//   pm2 delete sports-sync-rust
// ──────────────────────────────────────────────────────────────────────────────

fn main() {
    println!("⚠️  sports-sync-rust is DEPRECATED.");
    println!("   Syncing is now handled by NestJS TurnkeySyncService.");
    println!("   Run: pm2 stop sports-sync-rust && pm2 delete sports-sync-rust");
    std::process::exit(0);
}
