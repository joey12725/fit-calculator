"use client";

import React, { useEffect, useRef } from "react";

export async function takePhoto(video: HTMLVideoElement): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(video, 0, 0);
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b as Blob), "image/jpeg");
  });
}

interface CameraStepProps {
  onCapture: (blob: Blob) => void;
}

export function CameraStep({ onCapture }: CameraStepProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let stream: MediaStream;
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch(() => {});
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video) return;
    const blob = await takePhoto(video);
    onCapture(blob);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <video ref={videoRef} autoPlay playsInline className="w-full" />
      <button
        type="button"
        onClick={handleCapture}
        className="bg-brand text-white p-2"
      >
        Capture
      </button>
    </div>
  );
}
