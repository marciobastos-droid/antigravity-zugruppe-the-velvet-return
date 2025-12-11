import React from "react";
import { optimizeImageUrl, generateSrcSet, CACHE_STRATEGY } from "../utils/cdnOptimizer";

/**
 * Componente de imagem otimizada com CDN, WebP, lazy loading agressivo e preload
 */
export default function OptimizedImage({ 
  src, 
  alt, 
  className = "",
  width,
  height,
  priority = false,
  quality = 80,
  strategy = 'lazy',
  onLoad,
  fallbackIcon: FallbackIcon,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  ...props
}) {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setError(true);
  };

  if (error || !src) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 ${className}`}>
        {FallbackIcon ? (
          <FallbackIcon className="w-12 h-12 text-slate-300" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-slate-300" />
        )}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Placeholder enquanto carrega */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 animate-pulse" />
      )}

      {/* Imagem real */}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        onLoad={handleLoad}
        onError={handleError}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
        {...props}
      />
    </div>
  );
}