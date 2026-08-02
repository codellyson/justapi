import { Suspense } from "react";
import { AuthForm } from "@/src/auth/auth-form";
import { enabledSocialProviders } from "@/src/server/social-providers";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const providers = await enabledSocialProviders();
  return (
    <Suspense>
      <AuthForm initialMode="login" providers={providers} />
    </Suspense>
  );
}
