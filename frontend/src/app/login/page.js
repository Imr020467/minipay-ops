
import { signIn } from "@/auth";
import {
  Wallet,
  ShieldCheck,
  Zap,
  LockKeyhole,
  ArrowRight,
  
} from "lucide-react";

export default function LoginPage() {
  async function handleGoogleSignIn() {
    "use server";
    await signIn("google", { redirectTo: "/" });
  }
  async function handleGitHubSignIn(){
    "use server";
    await signIn("github",{redirectTo: "/"});
  }

  return (
    <main
      className="relative flex min-h-screen items-center justify-center
        overflow-hidden bg-slate-50 bg-cover bg-center px-4 py-10"
      style={{
        backgroundImage: "url('/finance-background.svg')",
      }}
    >
      {/* Soft overlay keeps the login card readable */}
      <div className="absolute inset-0 bg-white/20" />

      {/* Login card */}
      <section
        className="relative z-10 w-full max-w-md rounded-[2rem]
          border border-white/80 bg-white/90 px-7 py-9
          shadow-2xl backdrop-blur-xl sm:px-10 sm:py-11"
      >
        {/* MiniPay logo */}
        <div className="mb-5 flex flex-col items-center">
          <div
            className="mb-4 flex h-16 w-16 items-center justify-center
              rounded-2xl bg-gradient-to-br from-teal-400
              to-blue-600 text-white shadow-lg shadow-blue-200"
          >
            <Wallet size={34} strokeWidth={1.8} />
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
            Mini<span className="text-blue-600">Pay</span>
          </h1>

          <p className="mt-3 text-center text-slate-500">
            Sign in to manage your wallet.
          </p>
        </div>

        {/* Google sign-in */}
        <form action={handleGoogleSignIn} className="mt-8">
          <button
            type="submit"
            className="group flex w-full items-center justify-between
              rounded-2xl bg-gradient-to-r from-sky-500
              via-blue-600 to-indigo-600 px-5 py-4
              font-semibold text-white shadow-lg
              shadow-blue-200 transition duration-200
              hover:-translate-y-0.5 hover:shadow-xl
              hover:shadow-blue-300 focus-visible:outline-none
              focus-visible:ring-4 focus-visible:ring-blue-300
              active:translate-y-0"
          >
            {/* Google logo */}
            <span className="flex h-9 w-9 items-center justify-center
              rounded-full bg-white text-xl font-bold">
              <svg
                viewBox="0 0 48 48"
                width="24"
                height="24"
                aria-hidden="true"
              >
                <path
                  fill="#4285F4"
                  d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11
                    c-.5 2.5-1.9 4.6-4.1 6v5.1h6.7
                    c3.9-3.6 6-8.8 6-14.8Z"
                />
                <path
                  fill="#34A853"
                  d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.7-5.1
                    c-1.8 1.2-4.1 2-6.8 2-5.3 0-9.8-3.6-11.4-8.4H5.7v5.2
                    C9.1 39.5 16 44 24 44Z"
                />
                <path
                  fill="#FBBC05"
                  d="M12.6 27.7a12 12 0 0 1 0-7.4v-5.2H5.7
                    a20 20 0 0 0 0 17.8l6.9-5.2Z"
                />
                <path
                  fill="#EA4335"
                  d="M24 11.9c3 0 5.7 1 7.8 3.1l5.9-5.9
                    C34.1 5.8 29.5 4 24 4 16 4 9.1 8.5 5.7 15.1l6.9
                    5.2c1.6-4.8 6.1-8.4 11.4-8.4Z"
                />
              </svg>
            </span>

            <span className="flex-1 text-center">
              Continue with Google
            </span>

            <ArrowRight
              size={21}
              className="transition-transform group-hover:translate-x-1"
            />
          </button>
        </form>

        {/* GitHub sign-in */}
<form action={handleGitHubSignIn} className="mt-3">
  <button
    type="submit"
    className="group flex w-full items-center justify-between
      rounded-2xl bg-slate-900 px-5 py-4
      font-semibold text-white shadow-lg
      transition duration-200
      hover:-translate-y-0.5 hover:bg-slate-800
      hover:shadow-xl focus-visible:outline-none
      focus-visible:ring-4 focus-visible:ring-slate-300
      active:translate-y-0"
  >
    <span
      className="flex h-9 w-9 items-center justify-center
        rounded-full bg-white text-slate-900"
    >
      <svg
  viewBox="0 0 24 24"
  width="23"
  height="23"
  fill="currentColor"
  aria-hidden="true"
>
  <path d="M12 .297a12 12 0 0 0-3.79 23.385c.6.111.82-.261.82-.577v-2.234c-3.338.726-4.043-1.416-4.043-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.729.083-.729 1.205.084 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.776.418-1.305.762-1.605-2.665-.3-5.466-1.333-5.466-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.301 1.23a11.49 11.49 0 0 1 6.004 0c2.291-1.552 3.297-1.23 3.297-1.23.655 1.652.243 2.873.12 3.176.77.84 1.235 1.91 1.235 3.221 0 4.61-2.806 5.628-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.216.694.825.576A12.001 12.001 0 0 0 12 .297" />
</svg>
    </span>

    <span className="flex-1 text-center">
      Continue with GitHub
    </span>

    <ArrowRight
      size={21}
      className="transition-transform group-hover:translate-x-1"
    />
  </button>
</form>

        {/* Feature separator */}
        <div className="my-8 flex items-center gap-4">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-sm font-medium text-slate-400">
            Simple. Secure. Fast.
          </span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        {/* Security features */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center
              rounded-2xl bg-blue-50 text-blue-600">
              <ShieldCheck size={23} />
            </div>
            <span className="text-xs font-medium text-slate-600">
              Secure Login
            </span>
          </div>

          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center
              rounded-2xl bg-emerald-50 text-emerald-600">
              <Zap size={23} />
            </div>
            <span className="text-xs font-medium text-slate-600">
              Quick Access
            </span>
          </div>

          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center
              rounded-2xl bg-violet-50 text-violet-600">
              <LockKeyhole size={23} />
            </div>
            <span className="text-xs font-medium text-slate-600">
              Privacy
            </span>
          </div>
        </div>

        <p className="mt-8 text-center text-xs leading-5 text-slate-400">
          Securely access your personal MiniPay wallet.
        </p>
      </section>
    </main>
  );
}
