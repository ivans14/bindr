import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { Card } from "@/components/ui/card";
import { BrandMark } from "@/components/brand-mark";

export default function SignupPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
      <Link href="/" className="mb-6 flex items-center gap-2.5">
        <BrandMark className="size-9" />
        <span className="font-display text-2xl font-bold tracking-tight">bindr</span>
      </Link>
      <Card className="w-full p-7">
        <h1 className="mb-1 text-2xl">Create your account</h1>
        <p className="mb-6 text-sm text-muted-foreground">Start building binders for free.</p>
        <AuthForm mode="signup" />
      </Card>
    </div>
  );
}
