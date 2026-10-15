import { signIn } from "@/auth";

export default function Login() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F3F6FB] p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xl">
        <h1 className="text-3xl font-bold text-slate-900">MiniPay</h1>
        <p className="mt-2 text-slate-500">Sign in to manage your wallet.</p>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
          className="mt-8"
        >
          <button
            type="submit"
            className="w-full rounded-xl border border-slate-300 bg-white py-3 font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Continue with Google
          </button>
        </form>
      </div>
    </div>
  );
}