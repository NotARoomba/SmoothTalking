"use client";

import { useEffect, useState } from "react";
import DinoPlayer from "@/components/DinoPlayer";
import Link from "next/link";

export default function Play() {
  const [dino1, setDino1] = useState<string | null>(null);
  const [dino2, setDino2] = useState<string | null>(null);
  const [dinoImages, setDinoImages] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(false);

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
          // Set initial images
          if (imageUrls.length > 0) {
            const randomIndex1 = Math.floor(Math.random() * imageUrls.length);
            let randomIndex2 = Math.floor(Math.random() * imageUrls.length);

            // Ensure dino2 is different from dino1
            while (randomIndex2 === randomIndex1 && imageUrls.length > 1) {
              randomIndex2 = Math.floor(Math.random() * imageUrls.length);
            }

            setDino1(imageUrls[randomIndex1]);
            setDino2(imageUrls[randomIndex2]);

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

  // Remove the interval - dinosaurs will be static

  return (
    <div className="flex flex-row w-screen h-screen">
      <div className="w-1/3 flex flex-col items-center justify-center px-10 gap-4">
        {dino1 && (
          <div className="flex flex-col items-center gap-4">
            <DinoPlayer
              key={dino1}
              imageUrl={dino1}
              coinValue={Math.floor(Math.random() * 100) + 10}
              className="opacity-100"
            />
            <h2 className="text-4xl font-bold font-mono text-gunmetal">
              Orpheus
            </h2>
          </div>
        )}
      </div>
      <div className="w-1/3 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold font-mono mb-4">VS</h1>
          <Link
            href="/"
            className="text-lg font-semibold px-6 py-2 rounded-xl hover:opacity-80 transition-opacity duration-300 bg-gunmetal text-almond"
          >
            Back to Home
          </Link>
        </div>
      </div>
      <div className="w-1/3 flex flex-col items-center justify-center px-10 gap-4">
        {dino2 && (
          <div className="flex flex-col items-center gap-4">
            <DinoPlayer
              key={dino2}
              imageUrl={dino2}
              coinValue={Math.floor(Math.random() * 100) + 10}
              className="opacity-100"
              mirrored={true}
            />
            <h2 className="text-4xl font-bold font-mono text-gunmetal">You</h2>
          </div>
        )}
      </div>
    </div>
  );
}
