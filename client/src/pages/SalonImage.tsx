import React, { useState, useEffect } from "react";
import { buildImageUrl } from "../config/api";

interface SalonImageProps {
  filename?: string;
  alt: string;
  className?: string;
  fallback?: string;
}

const SalonImage: React.FC<SalonImageProps> = ({
  filename,
  alt,
  className,
  fallback = "/images/placeholder.jpg",
}) => {
  const [imgSrc, setImgSrc] = useState(() => buildImageUrl(filename) || fallback);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const url = buildImageUrl(filename);
    if (url && url !== imgSrc) {
      setImgSrc(url);
      setHasError(false);
    }
  }, [filename]);

  const handleError = () => {
    if (!hasError) {
      console.log(`Failed to load salon image: ${imgSrc}`);
      setHasError(true);
      setImgSrc(fallback);
    }
  };

  const handleLoad = () => {
    console.log(`Successfully loaded: ${imgSrc}`);
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={handleError}
      onLoad={handleLoad}
    />
  );
};

export default SalonImage;
