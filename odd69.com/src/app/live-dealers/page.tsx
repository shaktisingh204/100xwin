import { redirect } from "next/navigation";

// `/live-dealers` reuses the casino lobby UI, pre-filtered to live games.
// Anything that needs to diverge later should live in this file or fork
// the casino page rather than re-implementing the chrome from scratch.
export default function LiveDealersPage() {
  redirect("/casino?category=live");
}
