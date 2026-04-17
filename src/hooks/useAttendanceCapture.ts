import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

interface CaptureResult {
  photoUrl: string;
  location: Location;
}

export const useAttendanceCapture = () => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    setIsCapturing(true);
    setCameraError(null);
    setCapturedImage(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (error) {
      console.error("Camera error:", error);
      setCameraError("Camera access denied. Please allow camera permission.");
      setIsCapturing(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  }, []);

  const capturePhoto = useCallback((): string | null => {
    if (!videoRef.current) return null;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedImage(dataUrl);
    stopCamera();
    return dataUrl;
  }, [stopCamera]);

  const getLocation = useCallback(async (): Promise<Location | null> => {
    setLocationError(null);

    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setLocationError("Geolocation is not supported by your browser");
        resolve(null);
        return;
      }

      // Check permission first
      if (navigator.permissions) {
        navigator.permissions.query({ name: "geolocation" }).then((result) => {
          if (result.state === "denied") {
            setLocationError("Location permission denied. Please enable it in browser settings.");
            resolve(null);
            return;
          }
          fetchLocation();
        }).catch(() => {
          // Fallback if permissions API not available
          fetchLocation();
        });
      } else {
        fetchLocation();
      }

      function fetchLocation() {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const loc: Location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };

            // Try to get address from coordinates (reverse geocoding)
            try {
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.latitude}&lon=${loc.longitude}`
              );
              const data = await response.json();
              loc.address = data.display_name || undefined;
            } catch (e) {
              console.log("Could not fetch address:", e);
            }

            setLocation(loc);
            resolve(loc);
          },
          (error) => {
            console.error("Location error:", error);
            let errorMsg = "Location access denied. Please allow location permission.";
            
            if (error.code === 1) {
              errorMsg = "Location permission denied. Enable in browser settings.";
            } else if (error.code === 2) {
              errorMsg = "Location unavailable. Check GPS/network connection.";
            } else if (error.code === 3) {
              errorMsg = "Location request timed out. Please retry.";
            }
            
            // In preview/sandbox mode, geolocation may not work
            if (window.location.hostname.includes("lovableproject.com")) {
              errorMsg = "Location unavailable in preview. Open in new tab to test.";
            }
            
            setLocationError(errorMsg);
            resolve(null);
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 60000,
          }
        );
      }
    });
  }, []);

  const uploadPhoto = useCallback(
    async (dataUrl: string, userId: string): Promise<string | null> => {
      try {
        // Convert data URL to blob
        const response = await fetch(dataUrl);
        const blob = await response.blob();

        const fileName = `${userId}/${Date.now()}.jpg`;
        const { data, error } = await supabase.storage
          .from("attendance-photos")
          .upload(fileName, blob, {
            contentType: "image/jpeg",
            upsert: true,
          });

        if (error) throw error;

        // Get signed URL (bucket is private for security)
        const { data: urlData, error: signedUrlError } = await supabase.storage
          .from("attendance-photos")
          .createSignedUrl(data.path, 7200); // 2 hours

        if (signedUrlError || !urlData?.signedUrl) {
          console.error("Signed URL error:", signedUrlError);
          return null;
        }

        return urlData.signedUrl;
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("Failed to upload photo");
        return null;
      }
    },
    []
  );

  const captureAndUpload = useCallback(
    async (userId: string): Promise<CaptureResult | null> => {
      const photo = capturePhoto();
      if (!photo) {
        toast.error("Failed to capture photo");
        return null;
      }

      const loc = await getLocation();
      if (!loc) {
        toast.error("Failed to get location");
        return null;
      }

      const photoUrl = await uploadPhoto(photo, userId);
      if (!photoUrl) return null;

      return { photoUrl, location: loc };
    },
    [capturePhoto, getLocation, uploadPhoto]
  );

  const reset = useCallback(() => {
    stopCamera();
    setCapturedImage(null);
    setLocation(null);
    setCameraError(null);
    setLocationError(null);
  }, [stopCamera]);

  return {
    videoRef,
    isCapturing,
    capturedImage,
    location,
    cameraError,
    locationError,
    startCamera,
    stopCamera,
    capturePhoto,
    getLocation,
    uploadPhoto,
    captureAndUpload,
    reset,
  };
};
