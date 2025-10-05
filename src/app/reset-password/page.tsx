"use client";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 request, 2 reset

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get("token");
    const emailParam = urlParams.get("email");
    if (tokenParam) setToken(tokenParam);
    if (emailParam) setEmail(emailParam);
    if (!emailParam && !tokenParam) {
      setStep(1);
    } else if (tokenParam && emailParam) {
      setStep(2);
    }
  }, []);

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    if (step === 2 && newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        token,
        newPassword,
      }),
    });
    const data = await response.json();
    if (response.ok) {
      setMessage(data.message);
      if (step === 2) {
        redirect("/auth");
      }
    } else {
      setError(data.error || "An error occurred");
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-almond p-4">
      {step === 1 ? (
        <div className="bg-almond border-6 border-gunmetal p-8 rounded-2xl shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-center">
            Reset Password
          </h2>
          <form onSubmit={submitForm}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="email">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            {error && <p className="mb-4 text-red-600">{error}</p>}
            {message && <p className="mb-4 text-green-600">{message}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full cursor-pointer bg-gunmetal text-white py-2 rounded hover:bg-gunmetal/80 transition"
            >
              {loading ? "Loading..." : "Send Reset Link"}
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-almond border-6 border-gunmetal p-8 rounded-2xl shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-center">
            Set New Password
          </h2>
          <form onSubmit={submitForm}>
            <div className="mb-4">
              <label className="block text-gunmetal mb-2" htmlFor="newPassword">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded"
              />
              <label
                className="block text-gunmetal mb-2"
                htmlFor="confirmPassword"
              >
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            {message && <p className="mb-4 text-green-600">{message}</p>}
            {error && <p className="mb-4 text-red-600">{error}</p>}
            <button
              type="submit"
              className="w-full bg-gunmetal text-white py-2 rounded hover:bg-gunmetal/80 cursor-pointer transition"
            >
              Reset Password
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
