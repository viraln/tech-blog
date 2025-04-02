import { useState } from 'react';
import Image from 'next/image';

/**
 * ShimmerImage Component
 * 
 * Displays a shimmer loading effect while the image is loading
 * and smoothly transitions to the loaded image once it's ready.
 */
export default function ShimmerImage({ 
  src, 
  alt, 
  fill = false, 
  width, 
  height, 
  sizes, 
  className = "", 
  loading = "lazy", 
  priority = false,
  style = {},
  objectFit = "cover", // Default to cover
  quality = 75
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Common image props for both fill and non-fill modes
  const imageProps = {
    src,
    alt,
    loading,
    priority,
    quality,
    className: `${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`,
    onLoadingComplete: () => setIsLoaded(true),
    sizes,
    style: { ...style, objectFit: objectFit }
  };

  return (
    <div className="relative w-full h-full">
      {/* Shimmer placeholder */}
      <div 
        className={`absolute inset-0 ${isLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300 bg-gray-200 overflow-hidden`}
        style={{ ...style, zIndex: 1 }}
      >
        <div className="shimmer-effect"></div>
      </div>
      
      {/* Actual image */}
      {fill ? (
        <Image
          {...imageProps}
          fill={true}
        />
      ) : (
        <Image
          {...imageProps}
          width={width}
          height={height}
        />
      )}
    </div>
  );
} 