import { AccountView } from "@/src/account/account-view";
import { enabledSocialProviders } from "@/src/server/social-providers";

export const metadata = { title: "Account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const providers = await enabledSocialProviders();
  return <AccountView providers={providers} />;
}
