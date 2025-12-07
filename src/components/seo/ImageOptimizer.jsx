import React from 'react';

/**
 * Optimized Image Component with lazy loading and error handling
 */
export default function ImageOptimizer({ 
  src, 
  alt, 
  className = "", 
  priority = false,
  fallbackIcon: FallbackIcon,
  aspectRatio = "4/3",
  ...props 
}) {
  const [imgError, setImgError] = React.useState(false);
  const [isLoaded, setIsLoaded] = React.useState(false);

  if (imgError || !src) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 ${className}`}>
        {FallbackIcon && <FallbackIcon className="w-12 h-12 text-slate-300" />}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-200 animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${!isLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => setImgError(true)}
        {...props}
      />
    </div>
  );
}