"use client";

import { useRouter } from "next/navigation";
import { CameraStep } from "@/components/CameraStep";
import { Pose, useScanStore } from "@/store/scan";
import React from "react";

const orientations = [
  "front",
  "3⁄₄-left",
  "side",
  "3⁄₄-right",
] as const;

export default function ScanStatePage({ params }: { params: { state: Pose } }) {
  const router = useRouter();
  const pose = params.state;
  const addPhoto = useScanStore((s) => s.addPhoto);
  const photos = useScanStore((s) => s.photos[pose]);

  const handleCapture = (blob: Blob) => {
    addPhoto(pose, blob);
    const count = useScanStore.getState().photos[pose].length;
    if (count === orientations.length) {
      if (pose === "stand") {
        router.push("/scan/lean");
      } else {
        const allPhotos = useScanStore.getState().photos;
        fetch("/api/mesha/begin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: "demo-user",
            photos: allPhotos,
            pose,
          }),
        });
      }
    }
  };

  const stepIndex = photos.length;

  if (stepIndex >= orientations.length) {
    return <p>Processing...</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold capitalize">
        {pose}: {orientations[stepIndex]}
      </h1>
      <CameraStep onCapture={handleCapture} />
    </div>
  );
}
