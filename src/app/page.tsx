"use client";

import { useEffect, useState } from "react";
import WhiteToColorImage from "@/components/WhiteImage";
import Link from "next/link";

export default function Home() {
  const [dinoImage, setDinoImage] = useState<string | null>(null);
  const [dinoImages, setDinoImages] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Check if user is logged in
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const response = await fetch("/api/user", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        if (response.ok) {
          setLoggedIn(true);
        } else {
          setLoggedIn(false);
        }
      } catch (error) {
        console.error("Error checking login status:", error);
        setLoggedIn(false);
      } finally {
        setAuthLoading(false);
      }
    };

    checkLoginStatus();
  }, []);

  useEffect(() => {
    // Fetch the dinosaur images
    const fetchDinoImages = async () => {
      try {
        const response = await fetch("/api/dinosaurs");
        const data = await response.json();
        if (Array.isArray(data)) {
          const imageUrls = data
            .filter((item: any) => item.download_url)
            .map((item: any) => item.download_url);
          setDinoImages(imageUrls);
          // Set initial image
          if (imageUrls.length > 0) {
            const initialImage =
              imageUrls[Math.floor(Math.random() * imageUrls.length)];
            setDinoImage(initialImage);
            // Fade in after a short delay
            setTimeout(() => {
              setIsVisible(true);
            }, 100);
          }
        } else {
          console.error("No dinosaur images found");
        }
      } catch (error) {
        console.error("Failed to fetch dinosaur images:", error);
      }
    };

    fetchDinoImages();
  }, []);

  useEffect(() => {
    if (dinoImages.length === 0) return;

    const interval = setInterval(() => {
      // Fade out
      setIsVisible(false);

      // After fade out, change image and fade in
      setTimeout(() => {
        const randomImage =
          dinoImages[Math.floor(Math.random() * dinoImages.length)];
        setDinoImage(randomImage);
        console.log(randomImage);

        // Fade in
        setTimeout(() => {
          setIsVisible(true);
        }, 50);
      }, 300);
    }, 3000);

    return () => clearInterval(interval);
  }, [dinoImages]);

  return (
    <div className="flex flex-col w-screen h-full justify-center gap-4 items-center py-10 px-10">
      <div className="w-72 h-72 flex items-center justify-center">
        {dinoImage && (
          <WhiteToColorImage
            key={dinoImage}
            className={`w-full h-full object-contain transition-opacity duration-500 ${
              isVisible ? "opacity-100" : "opacity-0"
            }`}
            width={288}
            height={288}
            imageUrl={dinoImage}
          />
        )}
      </div>
      <p className="text-6xl font-bold font-mono">smooth talking</p>
      <p className="text-2xl text-center">
        the game where you have to debate a talking dinosaur to get your coins
        back
      </p>
      <Link
        href="/play"
        className="text-xl font-semibold w-48 text-center px-8 py-2 rounded-xl hover:opacity-80 transition-opacity duration-300 bg-gunmetal text-almond"
      >
        start talking
      </Link>
      <Link
        href="/leaderboard"
        className="text-xl font-semibold w-48 text-center px-8 py-2 rounded-xl hover:opacity-80 transition-opacity duration-300 bg-gunmetal text-almond"
      >
        leaderboard
      </Link>
      {loggedIn ? (
        <Link
          href="/profile"
          className={`text-xl font-semibold w-48 text-center px-8 py-2 rounded-xl hover:opacity-80 transition-opacity duration-300 bg-gunmetal text-almond block ${
            authLoading ? "opacity-0" : "opacity-100"
          }`}
        >
          profile
        </Link>
      ) : (
        <Link
          href="/auth"
          className={`text-xl font-semibold w-48 text-center px-8 py-2 rounded-xl hover:opacity-80 transition-opacity duration-300 bg-gunmetal text-almond block ${
            authLoading ? "opacity-0" : "opacity-100"
          }`}
        >
          login / sign up
        </Link>
      )}
    </div>
  );
}
