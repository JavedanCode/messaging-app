import { useEffect, useState } from "react";
import { ArrowRight, LoaderCircle, MailCheck } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import AuthLayout from "../components/auth/AuthLayout";
import { useAuth } from "../context/AuthContext";

function VerifyEmail() {
  const { verifyEmail, resendVerificationEmail } = useAuth();

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const email = searchParams.get("email") || "";

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!email) {
      navigate("/register", { replace: true });
    }
  }, [email, navigate]);

  function handleCodeChange(event) {
    const value = event.target.value.replace(/\D/g, "").slice(0, 6);

    setCode(value);
    setError("");
    setSuccess("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (code.length !== 6) {
      setError("Enter the 6-digit verification code.");
      return;
    }

    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      await verifyEmail({
        email,
        code,
      });

      navigate("/login", {
        replace: true,
        state: {
          message: "Your email has been verified. You can now sign in.",
        },
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError("");
    setSuccess("");
    setResending(true);

    try {
      const response = await resendVerificationEmail(email);
      setSuccess(response.message);
    } catch (error) {
      setError(error.message);
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthLayout
      title="Verify your email"
      subtitle="Enter the 6-digit code we sent to your email address."
      footer={
        <p className="text-center text-sm text-white/35">
          Already verified?{" "}
          <Link
            to="/login"
            className="font-medium text-indigo-400 transition hover:text-indigo-300"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <div className="mb-7 flex justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-400/10 text-indigo-400">
          <MailCheck size={26} />
        </div>
      </div>

      <div className="mb-7 text-center">
        <p className="text-sm text-white/40">Verification code sent to</p>

        <p className="mt-1 break-all text-sm font-medium text-white/80">
          {email}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl border border-red-400/15 bg-red-400/8 px-4 py-3 text-sm leading-5 text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/8 px-4 py-3 text-sm leading-5 text-emerald-300">
            {success}
          </div>
        )}

        <div>
          <label
            htmlFor="verification-code"
            className="mb-2 block text-sm font-medium text-white/75"
          >
            Verification code
          </label>

          <input
            id="verification-code"
            name="verification-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={handleCodeChange}
            placeholder="000000"
            maxLength={6}
            autoFocus
            className="h-14 w-full rounded-xl border border-white/10 bg-white/4 px-4 text-center text-2xl font-semibold tracking-[0.35em] text-white outline-none transition placeholder:text-white/15 focus:border-indigo-400/60 focus:bg-white/6 focus:ring-2 focus:ring-indigo-400/10"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || code.length !== 6}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <LoaderCircle size={18} className="animate-spin" />
          ) : (
            <>
              Verify email
              <ArrowRight size={17} />
            </>
          )}
        </button>
      </form>

      <div className="mt-7 text-center">
        <p className="text-sm text-white/30">Didn't receive the code?</p>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="mt-2 text-sm font-medium text-indigo-400 transition hover:text-indigo-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {resending ? "Sending..." : "Resend verification code"}
        </button>
      </div>
    </AuthLayout>
  );
}

export default VerifyEmail;
