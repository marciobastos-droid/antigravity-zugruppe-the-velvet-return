import React from "react";

/**
 * Componente de imagem otimizada com suporte a WebP, lazy loading agressivo e preload
 */
export default function OptimizedImage({ 
  src, 
  alt, 
  className = "",
  width,
  height,
  priority = false,
  onLoad,
  fallbackIcon: FallbackIcon
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

  // Tentar converter URL para WebP se for de serviço compatível
  const getOptimizedSrc = (originalSrc) => {
    if (!originalSrc) return originalSrc;

    // Supabase - adicionar parâmetros de transformação
    if (originalSrc.includes('supabase.co/storage')) {
      return `${originalSrc}?format=webp&quality=85`;
    }

    // Unsplash - usar parâmetros de otimização
    if (originalSrc.includes('unsplash.com')) {
      const url = new URL(originalSrc);
      url.searchParams.set('fm', 'webp');
      url.searchParams.set('q', '85');
      if (width) url.searchParams.set('w', width);
      if (height) url.searchParams.set('h', height);
      url.searchParams.set('fit', 'crop');
      return url.toString();
    }

    return originalSrc;
  };

  const optimizedSrc = getOptimizedSrc(src);

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

      {/* Imagem real */}
      {isInView && (
        <img
          src={optimizedSrc}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
          style={{
            contentVisibility: "auto",
            containIntrinsicSize: width && height ? `${width}px ${height}px` : "auto"
          }}
        />
      )}
    </div>
  );
}