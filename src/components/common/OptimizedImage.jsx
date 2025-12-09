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
  const [isInView, setIsInView] = React.useState(priority);
  const imgRef = React.useRef(null);

  // Intersection Observer para lazy loading agressivo
  React.useEffect(() => {
    if (priority) return; // Skip observer para imagens prioritárias

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: "200px", // Carregar 200px antes de entrar no viewport
        threshold: 0.01
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setError(true);
  };

  // Obter configurações de cache da estratégia
  const strategySettings = CACHE_STRATEGY[strategy] || CACHE_STRATEGY.lazy;
  
  // Otimizar URL com CDN
  const optimizedSrc = isInView || priority ? optimizeImageUrl(src, {
    width,
    height,
    quality: quality || strategySettings.quality,
    format: 'webp',
    fit: 'cover'
  }) : null;
  
  // Gerar srcset para imagens responsivas
  const srcSet = (isInView || priority) && src ? generateSrcSet(src, [320, 640, 960, 1280, 1920]) : null;

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
    <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
      {/* Placeholder enquanto carrega */}
      {!isLoaded && isInView && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 animate-pulse" />
      )}

      {/* Imagem real com CDN */}
      {isInView && optimizedSrc && (
        <img
          src={optimizedSrc}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
          style={{
            contentVisibility: "auto",
            containIntrinsicSize: width && height ? `${width}px ${height}px` : "auto"
          }}
          {...props}
        />
      )}
    </div>
  );
}