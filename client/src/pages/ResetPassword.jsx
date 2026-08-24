import { useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { ArrowRight, LoaderCircle } from "lucide-react";

import AuthLayout from "../components/auth/AuthLayout";
import AuthInput from "../components/auth/AuthInput";
import { resetPassword } from "../api/auth";

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!token) {
      setError("Invalid or missing password reset token.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await resetPassword({
        token,
        newPassword: password,
      });

      setMessage(response.message);

      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Reset password"
      subtitle="Choose a new password for your account."
      footer={
        <p className="text-center text-sm text-white/35">
          Remember your password?{" "}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300">
            Back to login
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl border border-red-400/15 bg-red-400/8 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-xl border border-green-400/15 bg-green-400/8 px-4 py-3 text-sm text-green-300">
            {message}
          </div>
        )}

        <AuthInput
          label="New password"
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter new password"
          autoComplete="new-password"
        />

        <AuthInput
          label="Confirm password"
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Confirm new password"
          autoComplete="new-password"
        />

        <button
          type="submit"
          disabled={submitting}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-60"
        >
          {submitting ? (
            <LoaderCircle size={18} className="animate-spin" />
          ) : (
            <>
              Reset password
              <ArrowRight size={17} />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}

export default ResetPassword;
