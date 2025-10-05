"use client";
import { redirect } from "next/navigation";
import { useState } from "react";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [otp, setOtp] = useState("");
  const [sentOTP, setSentOTP] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    setLoading(true);
    setError("");
    setMessage("");
    e.preventDefault();

    if (isLogin) {
      // Login flow
      console.log(password);
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage("Login successful! Redirecting...");
        //redirect to home page
        redirect("/");
      } else {
        setError(data.error || "An error occurred during login.");
        setLoading(false);
      }
    } else {
      // Signup flow
      if (!sentOTP) {
        // Send OTP
        const response = await fetch("/api/otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await response.json();
        if (response.ok) {
          setSentOTP(true);
          setMessage("OTP sent to your email.");
          setError("");
          setLoading(false);
        } else {
          setError(data.error || "An error occurred while sending OTP.");
          setLoading(false);
        }
      } else {
        // Verify OTP and create account
        const response = await fetch("/api/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            otp,
          }),
        });
        const data = await response.json();
        if (response.ok) {
          setMessage("Signup successful! Redirecting to login...");
          setIsLogin(true);
          setSentOTP(false);
          setOtp("");
          setError("");
          redirect("/");

          setLoading(false);
        } else {
          setError(data.error || "An error occurred during signup.");
          setLoading(false);
        }
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 items-center justify-center min-h-screen bg-almond p-4">
      <p
        className={`font-mono text-gunmetal text-5xl pb-2 text-center mx-auto opacity-100`}
      >
        smooth talking
      </p>
      <div className="border-6 rounded-2xl border-gunmetal  p-6  shadow-md w-full max-w-sm">
        <h1 className="text-xl font-semibold mb-4">
          {isLogin ? "Login" : "Sign Up"}
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col ">
          <div className="mb-4">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              required
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              required
            />
          </div>
          {!isLogin && sentOTP && (
            <div className="mb-4">
              <label
                htmlFor="otp"
                className="block text-sm font-medium text-gray-700"
              >
                OTP
              </label>
              <input
                type="text"
                id="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                required
              />
            </div>
          )}

          {message && <p className="text-green-600">{message}</p>}
          {error && <p className="text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gunmetal hover:bg-gunmetal/80 cursor-pointer transition-all duration-300 text-white p-2 rounded-md mt-4"
          >
            {loading
              ? "Loading..."
              : isLogin
              ? "Login"
              : !sentOTP
              ? "Verify Email"
              : "Sign Up"}
          </button>
        </form>
        <div className="mt-4">
          <button
            onClick={() => redirect("/reset-password")}
            className="text-gunmetal-700 font-semibold underline cursor-pointer"
          >
            Forgot Password?
          </button>
        </div>
        <p className="mt-4 text-sm">
          {isLogin ? "New here?" : "Already have an account?"}{" "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-gunmetal-700 font-semibold underline cursor-pointer"
          >
            {isLogin ? "Sign Up" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
}
