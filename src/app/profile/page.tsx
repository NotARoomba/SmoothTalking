"use client";

import { redirect } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import Modal from "react-modal";
import Link from "next/link";

interface User {
  id: string;
  avatar: string;
  username: string;
  name: string;
  email: string;
}

interface Dinosaur {
  name: string;
  download_url: string;
  html_url: string;
}

export default function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(false);
  const [dinoAvatar, setDinoAvatar] = useState("");
  const [dinosaurs, setDinosaurs] = useState<Dinosaur[]>([]);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [saving, setSaving] = useState(false);
  const [emailChanged, setEmailChanged] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [displayedDinosaurs, setDisplayedDinosaurs] = useState<Dinosaur[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    avatar: "",
    username: "",
    email: "",
    otp: "",
  });

  useEffect(() => {
    // Initialize Modal for accessibility
    if (typeof window !== "undefined") {
      Modal.setAppElement(document.body);
    }

    const fetchUser = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/user");
        const data = await response.json();
        console.log("Fetched user data:", data);
        if (!response.ok) {
          setError(data.error || "Failed to fetch user data");
          setLoading(false);
          return;
        }

        // Fetch dinosaurs for avatar selection
        const dinosaurResponse = await fetch("/api/dinosaurs");
        const dinosaurData = await dinosaurResponse.json();
        // Filter out .gitignore and other non-image files
        const filteredDinosaurs = dinosaurData.filter(
          (dino: Dinosaur) =>
            dino.name.toLowerCase().endsWith(".jpg") ||
            dino.name.toLowerCase().endsWith(".jpeg") ||
            dino.name.toLowerCase().endsWith(".png") ||
            dino.name.toLowerCase().endsWith(".gif")
        );
        setDinosaurs(filteredDinosaurs);

        if (!data.user.avatar || data.user.avatar === "") {
          const randomDinosaur =
            filteredDinosaurs[
              Math.floor(Math.random() * filteredDinosaurs.length)
            ];
          setDinoAvatar(randomDinosaur.download_url);
        }

        setUser(data.user || null);
        setFormData({
          avatar: data.user.avatar || "",
          username: data.user.username || "",
          email: data.user.email || "",
          otp: "",
        });
        setLoading(false);
      } catch (err) {
        setError("Failed to fetch user data");
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const sendOTP = async () => {
    if (!formData.email || formData.email === user?.email) {
      setError("Please enter a new email address");
      return;
    }

    setSendingOtp(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to send OTP");
      } else {
        setMessage("OTP sent to your new email address!");
        setOtpSent(true);
      }
    } catch (err) {
      setError("Failed to send OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      setError("User information not available");
      return;
    }

    // Check if email changed and OTP is required
    if (emailChanged && (!formData.otp || !otpSent)) {
      setError("Please verify your new email address with OTP");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const requestBody: any = {
        id: user.id,
        avatar: formData.avatar,
        username: formData.username,
      };

      // Only include email and OTP if email was changed
      if (emailChanged) {
        requestBody.email = formData.email;
        requestBody.otp = formData.otp;
      }

      const response = await fetch("/api/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to update profile");
      } else {
        setMessage("Profile updated successfully!");
        setUser((prev) =>
          prev
            ? {
                ...prev,
                avatar: formData.avatar,
                username: formData.username,
                email: emailChanged ? formData.email : prev.email,
              }
            : null
        );
        setEditing(false);
        setEmailChanged(false);
        setOtpSent(false);
        setFormData((prev) => ({ ...prev, otp: "" }));
      }
    } catch (err) {
      setError("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        avatar: user.avatar || "",
        username: user.username || "",
        email: user.email || "",
        otp: "",
      });
    }
    setEditing(false);
    setShowAvatarSelector(false);
    setEmailChanged(false);
    setOtpSent(false);
    setError("");
    setMessage("");
  };

  const selectAvatar = (dinosaur: Dinosaur) => {
    setFormData((prev) => ({ ...prev, avatar: dinosaur.download_url }));
    setShowAvatarSelector(false);
  };

  const loadMoreDinosaurs = useCallback(() => {
    if (loadingMore) return;

    const itemsPerPage = 12;
    const nextPage = currentPage + 1;
    const startIndex = nextPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    if (startIndex < dinosaurs.length) {
      setLoadingMore(true);

      // Simulate loading delay for better UX
      setTimeout(() => {
        const newDinosaurs = dinosaurs.slice(startIndex, endIndex);
        setDisplayedDinosaurs((prev) => [...prev, ...newDinosaurs]);
        setCurrentPage(nextPage);
        setLoadingMore(false);
      }, 300);
    }
  }, [currentPage, dinosaurs, loadingMore]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

      // Load more when user is 100px from bottom
      if (scrollHeight - scrollTop <= clientHeight + 100) {
        loadMoreDinosaurs();
      }
    },
    [loadMoreDinosaurs]
  );

  const openAvatarSelector = () => {
    setShowAvatarSelector(true);
    // Reset to first 25 items when opening
    setDisplayedDinosaurs(dinosaurs.slice(0, 25));
    setCurrentPage(0);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setFormData((prev) => ({ ...prev, email: newEmail, otp: "" }));

    // Check if email has changed from original
    if (user && newEmail !== user.email) {
      setEmailChanged(true);
      setOtpSent(false);
    } else {
      setEmailChanged(false);
      setOtpSent(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 items-center justify-center min-h-screen bg-almond p-4">
      <div className="bg-almond border-6 border-gunmetal p-8 rounded-2xl shadow-md w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-gunmetal text-center">
          Profile
        </h1>

        {loading ? (
          <p className="text-gunmetal text-center">Loading...</p>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        ) : user ? (
          <div className="flex flex-col gap-4">
            {message && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                {message}
              </div>
            )}

            {/* Avatar Section */}
            <div className="flex flex-col items-center mb-4">
              <div className="relative group">
                <img
                  src={formData.avatar || user.avatar || dinoAvatar}
                  alt="Avatar"
                  className="w-32 h-32 rounded-full object-cover border-4 border-gunmetal cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => editing && openAvatarSelector()}
                  title={
                    !user.avatar
                      ? "Placeholder avatar - click to change when editing"
                      : "Click to change avatar when editing"
                  }
                />
                {!user.avatar && (
                  <div className="absolute inset-0 rounded-full bg-black bg-opacity-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-xs text-center px-2">
                      Placeholder Avatar
                    </span>
                  </div>
                )}
                {editing && (
                  <button
                    type="button"
                    className="absolute bottom-0 right-0 bg-gunmetal text-white rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-opacity-80 cursor-pointer"
                    onClick={() => openAvatarSelector()}
                  >
                    ✎
                  </button>
                )}
              </div>
            </div>

            {/* Avatar Selector Modal */}
            <Modal
              isOpen={showAvatarSelector}
              closeTimeoutMS={300}
              onRequestClose={() => setShowAvatarSelector(false)}
              shouldCloseOnOverlayClick={true}
              contentLabel="Avatar Selection Modal"
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-almond p-8 rounded-2xl outline-6 outline-gunmetal w-2/3 max-w-2xl h-3/4 max-h-[600px] duration-500 transition-opacity shadow-2xl"
              portalClassName={`duration-300 transition-all ${
                showAvatarSelector ? "opacity-100" : "opacity-0"
              }`}
              overlayClassName="bg-gunmetal/20 fixed top-0 left-0 w-full h-full flex items-center justify-center cursor-pointer"
            >
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-gunmetal font-mono">
                    Choose Your Avatar
                  </h3>
                  <button
                    type="button"
                    className="bg-gunmetal/10 hover:bg-gunmetal/20 text-gunmetal rounded-full w-10 h-10 flex items-center justify-center text-xl transition-colors duration-200 cursor-pointer"
                    onClick={() => setShowAvatarSelector(false)}
                  >
                    ×
                  </button>
                </div>

                <div
                  ref={scrollContainerRef}
                  className="flex-1 overflow-y-auto overflow-x-hidden pr-2"
                  onScroll={handleScroll}
                  style={{
                    scrollbarWidth: "thin",
                    scrollbarColor: "var(--color-gunmetal) var(--color-almond)",
                  }}
                >
                  <div className="grid grid-cols-4 gap-4 pb-4">
                    {displayedDinosaurs.map((dinosaur, index) => (
                      <div
                        key={`${dinosaur.name}-${index}`}
                        className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gunmetal/10 transition-colors cursor-pointer group"
                        onClick={() => selectAvatar(dinosaur)}
                      >
                        <img
                          src={dinosaur.download_url}
                          alt={dinosaur.name}
                          className="w-20 h-20 rounded-full object-cover border-3 border-gunmetal group-hover:border-khaki group-hover:scale-105 transition-all duration-200"
                        />
                        <span className="text-xs text-gunmetal/70 text-center font-mono truncate w-full">
                          {dinosaur.name.replace(/\.[^/.]+$/, "")}
                        </span>
                      </div>
                    ))}
                  </div>

                  {loadingMore && (
                    <div className="flex justify-center py-6">
                      <div className="flex items-center gap-2 text-gunmetal/60">
                        <div className="w-4 h-4 border-2 border-gunmetal/30 border-t-gunmetal rounded-full animate-spin"></div>
                        <span className="font-mono text-sm">
                          Loading more dinosaurs...
                        </span>
                      </div>
                    </div>
                  )}

                  {displayedDinosaurs.length >= dinosaurs.length && (
                    <div className="text-center py-4">
                      <span className="text-gunmetal/60 font-mono text-sm">
                        You've seen all {dinosaurs.length} dinosaurs! 🦕
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex gap-4">
                  <button
                    type="button"
                    className="flex-1 bg-gunmetal/10 hover:bg-gunmetal/20 text-gunmetal px-6 py-3 rounded-lg font-medium transition-colors duration-200 cursor-pointer"
                    onClick={() => setShowAvatarSelector(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </Modal>

            {/* Form Fields */}
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => e.preventDefault()}
            >
              <div>
                <label className="block text-gunmetal font-semibold mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                  disabled={!editing}
                  className={`w-full p-3 border-2 rounded-lg ${
                    editing
                      ? "border-gunmetal bg-almond"
                      : "border-gray-300 bg-gray-100"
                  } text-gunmetal `}
                />
              </div>

              <div>
                <label className="block text-gunmetal font-semibold mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={handleEmailChange}
                  disabled={!editing}
                  className={`w-full p-3 border-2 rounded-lg ${
                    editing
                      ? "border-gunmetal bg-almond"
                      : "border-gray-300 bg-gray-100"
                  } text-gunmetal`}
                />
                {editing && emailChanged && (
                  <div className="mt-2">
                    {!otpSent ? (
                      <button
                        type="button"
                        className="bg-gunmetal hover:bg-gunmetal/80 text-almond py-2 px-4 rounded-lg font-medium transition-colors duration-200 text-sm disabled:opacity-50 cursor-pointer"
                        onClick={sendOTP}
                        disabled={sendingOtp || !formData.email}
                      >
                        {sendingOtp
                          ? "Sending OTP..."
                          : "Send Verification Code"}
                      </button>
                    ) : (
                      <div className="text-sm text-green-600">
                        ✓ Verification code sent to {formData.email}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {editing && emailChanged && otpSent && (
                <div>
                  <label className="block text-gunmetal font-semibold mb-2">
                    Email Verification Code
                  </label>
                  <input
                    type="text"
                    value={formData.otp}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, otp: e.target.value }))
                    }
                    className="w-full p-3 border-2 border-gunmetal rounded-lg bg-almond text-gunmetal"
                    placeholder="Enter 6-digit code from email"
                    maxLength={6}
                    required
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 mt-6">
                {!editing ? (
                  <button
                    type="button"
                    className="flex-1 bg-gunmetal text-almond py-3 px-4 rounded-lg hover:bg-opacity-90 transition-colors font-semibold cursor-pointer"
                    onClick={() => {
                      setMessage("");
                      setEditing(true);
                    }}
                  >
                    Edit Profile
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="flex-1 bg-gunmetal/10 hover:bg-gunmetal/20 text-gunmetal py-3 px-4 rounded-lg font-medium transition-colors duration-200 cursor-pointer"
                      onClick={handleCancel}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="flex-1 bg-gunmetal text-almond py-3 px-4 rounded-lg hover:bg-opacity-90 transition-colors font-semibold disabled:opacity-50 cursor-pointer"
                      onClick={handleSave}
                      disabled={
                        saving || (emailChanged && (!otpSent || !formData.otp))
                      }
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </>
                )}
              </div>
              <div>
                <Link
                  href="/"
                  className="inline-block mb-4 text-gunmetal hover:opacity-80 transition-opacity cursor-pointer"
                >
                  ← Back to Home
                </Link>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}
