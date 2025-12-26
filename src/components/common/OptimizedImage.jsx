import React from "react";

/**
 * Componente de imagem otimizada com WebP, lazy loading, blur placeholder e responsive sizing
 */
export default function OptimizedImage({
  src,
  alt,
  className = "",
  width,
  height,
  priority = false,
  quality = 80,
  strategy = "lazy",
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  fallbackIcon: FallbackIcon = null,
  blur = true,
  onLoad
}) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);
  const [isInView, setIsInView] = React.useState(priority);
  const imgRef = React.useRef(null);

  // CDN Optimization with WebP and responsive sizing
  const optimizeSrc = (url, w = width, q = quality) => {
    if (!url) return "";
    
    // Se já for WebP, otimizar tamanho
    if (url.includes('.webp')) {
      if (url.includes('supabase.co/storage')) {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}width=${w}&quality=${q}`;
      }
      return url;
    }
    
    // Para URLs do Supabase, converter para WebP e otimizar
    if (url.includes('supabase.co/storage')) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}width=${w}&quality=${q}&format=webp`;
    }
    
    // Para URLs externas, tentar adicionar parâmetros de otimização se suportado
    if (url.includes('unsplash.com')) {
      return `${url}?w=${w}&q=${q}&fm=webp&auto=format`;
    }
    
    // Para outras URLs, retornar original
    return url;
  };

  // Generate srcset for responsive images (mobile, tablet, desktop)
  const generateSrcSet = () => {
    if (!src) return "";
    
    const widths = [320, 640, 768, 1024, 1280, 1536, 1920];
    const applicableWidths = width ? widths.filter(w => w <= width * 2) : widths;
    
    return applicableWidths
      .map(w => `${optimizeSrc(src, w, quality)} ${w}w`)
      .join(", ");
  };

  // Generate blur placeholder (tiny 10px version)
  const blurDataURL = React.useMemo(() => {
    if (!blur || !src) return null;
    return optimizeSrc(src, 10, 20);
  }, [src, blur]);

  const handleLoadEvent = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // Advanced Intersection Observer with dynamic rootMargin
  React.useEffect(() => {
    if (priority || strategy !== "lazy") {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: "100px", // Start loading 100px before entering viewport
        threshold: 0.01
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [priority, strategy]);

  // Render error fallback
  if (hasError && FallbackIcon) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 ${className}`}>
        <FallbackIcon className="w-12 h-12 text-slate-300" />
      </div>
    );
  }

  const optimizedSrc = optimizeSrc(src, width, quality);
  const srcSet = generateSrcSet();

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
      {/* Blur placeholder */}
      {blur && isLoading && blurDataURL && (
        <img
          src={blurDataURL}
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-xl scale-110"
          aria-hidden="true"
        />
      )}
      
      {/* Loading skeleton */}
      {isLoading && !blur && (
        <div className="absolute inset-0 bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 animate-pulse" />
      )}
      
      {/* Main image - only render when in view */}
      {isInView && (
        <img
          src={optimizedSrc}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          width={width}
          height={height}
          onLoad={handleLoadEvent}
          onError={handleError}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchpriority={priority ? "high" : "auto"}
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          style={{
            aspectRatio: width && height ? `${width}/${height}` : undefined
          }}
        />
      )}
    </div>
  );
}