"use client";
import { Coins } from "lucide-react";
import WhiteToColorImage from "./WhiteImage";

type DinoPlayerProps = {
  imageUrl: string;
  coinValue: number;
  className?: string;
  imageClassName?: string;
  mirrored?: boolean;
};

export default function DinoPlayer({
  imageUrl,
  coinValue,
  className = "",
  imageClassName = "",
  mirrored = false,
}: DinoPlayerProps) {
  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* Coin display */}
      <div className="flex items-center gap-3 text-gunmetal">
        <Coins size={24} />
        <span className="text-2xl font-bold">{coinValue}</span>
      </div>

      {/* Dinosaur image */}
      <WhiteToColorImage
        imageUrl={imageUrl}
        className={`w-full h-full object-contain ${imageClassName}`}
        width={256}
        height={256}
        mirrored={mirrored}
      />
    </div>
  );
}
