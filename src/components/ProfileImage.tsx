"use client";

import Image from "next/image";
import { useState } from "react";

interface Props {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
}

export default function ProfileImage({ src, alt, width, height, className, priority }: Props) {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
    console.warn(`Profile image not found: ${src}`);
  };

  if (imageError) {
    return (
      <div 
        className={`${className} bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-lg flex items-center justify-center border`}
        style={{ width, height }}
      >
        <div className="text-center">
          <div className="text-4xl font-bold text-gray-600 dark:text-gray-300 mb-2">
            👨‍💻
          </div>
          <div className="text-xs text-muted-foreground">
            Vansh
          </div>
        </div>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      onError={handleImageError}
    />
  );
} 