"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface LeaderboardUser {
  rank: number;
  id: string;
  username: string;
  avatar: string | null;
  coins: number;
  joinedAt: string;
}

type Timespan = "hour" | "day" | "week" | "month" | "year" | "all";

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [timespan, setTimespan] = useState<Timespan>("all");
  const [dinoImages, setDinoImages] = useState<string[]>([]);

  const timespanLabels = {
    hour: "Past Hour",
    day: "Past Day",
    week: "Past Week",
    month: "Past Month",
    year: "Past Year",
    all: "All Time",
  };

  // Fetch dinosaur images for users without avatars
  useEffect(() => {
    const fetchDinoImages = async () => {
      try {
        const response = await fetch("/api/dinosaurs");
        const data = await response.json();
        if (Array.isArray(data)) {
          const imageUrls = data
            .filter((item: any) => item.download_url)
            .map((item: any) => item.download_url);
          setDinoImages(imageUrls);
        }
      } catch (error) {
        console.error("Failed to fetch dinosaur images:", error);
      }
    };

    fetchDinoImages();
  }, []);

  // Fetch leaderboard data
  const fetchLeaderboard = async (selectedTimespan: Timespan) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/leaderboard?timespan=${selectedTimespan}&limit=50`
      );
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
      } else {
        console.error("Failed to fetch leaderboard");
        setLeaderboard([]);
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard(timespan);
  }, [timespan]);

  const handleTimespanChange = (newTimespan: Timespan) => {
    setTimespan(newTimespan);
  };

  const getAvatarUrl = (user: LeaderboardUser) => {
    if (user.avatar) {
      return user.avatar;
    }
    // Generate consistent random avatar based on user ID
    if (dinoImages.length > 0) {
      const hash = user.id.split("").reduce((a, b) => {
        a = (a << 5) - a + b.charCodeAt(0);
        return a & a;
      }, 0);
      const index = Math.abs(hash) % dinoImages.length;
      return dinoImages[index];
    }
    return null;
  };

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  return (
    <div className="min-h-screen bg-almond text-gunmetal">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-block mb-4 text-gunmetal hover:opacity-80 transition-opacity cursor-pointer"
          >
            ← Back to Home
          </Link>
          <h1 className="text-5xl font-bold font-mono mb-4">Leaderboard</h1>
          <p className="text-xl">See who's collected the most coins!</p>
        </div>

        {/* Timespan Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {(Object.keys(timespanLabels) as Timespan[]).map((ts) => (
            <button
              key={ts}
              onClick={() => handleTimespanChange(ts)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 cursor-pointer ${
                timespan === ts
                  ? "bg-gunmetal text-almond shadow-lg"
                  : "bg-almond-600 text-gunmetal hover:bg-gunmetal hover:text-almond border-2 border-gunmetal"
              }`}
            >
              {timespanLabels[ts]}
            </button>
          ))}
        </div>

        {/* Leaderboard Content */}
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gunmetal"></div>
              <p className="mt-4 text-lg">Loading leaderboard...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xl text-gunmetal-600">
                No users found for {timespanLabels[timespan].toLowerCase()}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center p-4 rounded-xl transition-all duration-200 hover:shadow-lg bg-almond-700 border-2 border-almond-500 hover:border-gunmetal-300"
                >
                  {/* Rank */}
                  <div className="w-16 text-center">
                    <span className="text-2xl font-bold">
                      {getRankDisplay(user.rank)}
                    </span>
                  </div>

                  {/* Avatar */}
                  <div className="w-16 h-16 mr-4 flex-shrink-0">
                    {getAvatarUrl(user) && (
                      <img
                        src={getAvatarUrl(user)!}
                        alt={`${user.username}'s avatar`}
                        className="w-full h-full object-cover rounded-full border-2 border-gunmetal"
                      />
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex-grow">
                    <h3 className="text-xl font-bold text-gunmetal">
                      {user.username}
                    </h3>
                    <p className="text-gunmetal-600">
                      Joined{" "}
                      {user.joinedAt
                        ? new Date(user.joinedAt).toLocaleDateString()
                        : new Date().toLocaleDateString()}
                    </p>
                  </div>

                  {/* Coins */}
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gunmetal flex items-center">
                      🪙 {user.coins.toLocaleString()}
                    </div>
                    <p className="text-sm text-gunmetal-600">
                      {timespan === "all"
                        ? "total coins"
                        : `in ${timespanLabels[timespan].toLowerCase()}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <Link
            href="/play"
            className="inline-block px-8 py-3 bg-gunmetal text-almond rounded-xl font-semibold hover:opacity-80 transition-opacity cursor-pointer"
          >
            Start Playing to Earn Coins!
          </Link>
        </div>
      </div>
    </div>
  );
}
