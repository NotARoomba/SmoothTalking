"use client";
import React, { useEffect, useRef } from "react";

type Props = {
  imageUrl: string;
  replacementColor?: [number, number, number]; // RGB
  tolerance?: number;
  width?: number;
  height?: number;
  className?: string;
  mirrored?: boolean;
};

export default function WhiteToColorImage({
  imageUrl,
  replacementColor = [234, 224, 213],
  tolerance = 5,
  width,
  height,
  className,
  mirrored = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // needed for external URLs
    img.src = imageUrl;

    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const w = width || img.width;
      const h = height || img.height;
      canvas.width = w;
      canvas.height = h;

      if (mirrored) {
        // Flip horizontally by scaling and translating
        ctx.scale(-1, 1);
        ctx.drawImage(img, -w, 0, w, h);
      } else {
        ctx.drawImage(img, 0, 0, w, h);
      }

      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        if (
          Math.abs(r - 255) <= tolerance &&
          Math.abs(g - 255) <= tolerance &&
          Math.abs(b - 255) <= tolerance
        ) {
          data[i] = replacementColor[0];
          data[i + 1] = replacementColor[1];
          data[i + 2] = replacementColor[2];
        }
      }

      ctx.putImageData(imageData, 0, 0);
    };
  }, [imageUrl, replacementColor, tolerance, width, height, mirrored]);

  return <canvas ref={canvasRef} className={className} />;
}
