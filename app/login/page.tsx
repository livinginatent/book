import { LoginForm } from "@/components/auth/login-form";

interface LoginPageProps {
  searchParams:
    | Promise<{
        message?: string;
        error?: string;
        redirect?: string;
      }>
    | {
        message?: string;
        error?: string;
        redirect?: string;
      };
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  // Handle both sync and async searchParams (Next.js 15+)
  const params =
    searchParams instanceof Promise ? await searchParams : searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative">
      <LoginForm
        initialMessage={params.message}
        initialError={params.error}
        initialRedirect={params.redirect}
      />
    </div>
  );
}
