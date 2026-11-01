"use client";

import { useEffect, useRef, useState } from "react";

export default function ProfileAvatar({
  name = "Guest",
  image = null,
  userId = null,
}) {
  const key = `minipay_avatar_${userId ?? "guest"}`;

  const [src, setSrc] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    try {
      setSrc(localStorage.getItem(key));
    } catch {
      setSrc(null);
    }
  }, [key]);

  const shown = src || image;

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2 MB.");
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setSrc(reader.result);
      try {
        localStorage.setItem(key, reader.result);
      } catch {
        setError("Could not save the image.");
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="relative flex items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        title="Change photo"
        className="group relative h-12 w-12 overflow-hidden rounded-full bg-blue-100 text-lg font-semibold text-blue-900 ring-2 ring-transparent transition hover:ring-blue-500"
      >
        {shown ? (
          <img
            src={shown}
            alt={name}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        ) : (
          <span>{name.charAt(0).toUpperCase()}</span>
        )}
        <span className="absolute inset-0 hidden items-center justify-center bg-black/50 text-[10px] font-medium text-white group-hover:flex">
          Change
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />

      <span className="font-semibold text-slate-900">{name}</span>

      {error && (
        <span className="absolute right-0 top-14 whitespace-nowrap text-xs text-red-600">
          {error}
        </span>
      )}
    </div>
  );
}