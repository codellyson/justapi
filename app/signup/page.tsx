import { Suspense } from "react";
import { AuthForm } from "@/src/auth/auth-form";
import { enabledSocialProviders } from "@/src/server/social-providers";

export const metadata = { title: "Create account" };
export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const providers = await enabledSocialProviders();
  return (
    <Suspense>
      <AuthForm initialMode="signup" providers={providers} />
    </Suspense>
  );
}
