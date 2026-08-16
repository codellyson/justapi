import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthForm } from "@/src/auth/auth-form";
import { enabledSocialProviders } from "@/src/server/social-providers";
import { getPageSession, safeNext } from "@/src/server/session";

export const metadata = { title: "Create account" };
export const dynamic = "force-dynamic";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getPageSession();
  if (session?.user) redirect(safeNext((await searchParams).next));

  const providers = await enabledSocialProviders();
  return (
    <Suspense>
      <AuthForm initialMode="signup" providers={providers} />
    </Suspense>
  );
}
