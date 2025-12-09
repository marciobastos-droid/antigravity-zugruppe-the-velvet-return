import React from "react";
import { Home } from "lucide-react";

export default function LazyImage({ 
  src, 
  alt, 
  className, 
  fallbackIcon = Home,
  onError,
  ...props 
}) {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [isInView, setIsInView] = React.useState(false);
  const imgRef = React.useRef(null);

  React.useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" } // Lazy loading agressivo: carregar 300px antes
    );

    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, []);

  const handleLoad = () => setIsLoaded(true);
  
  const handleError = () => {
    setError(true);
    onError?.();
  };

  const FallbackIcon = fallbackIcon;

  return (
    <div ref={imgRef} className={className}>
      {!isInView || error ? (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
          <FallbackIcon className="w-12 h-12 text-slate-300" />
        </div>
      ) : (
        <>
          {!isLoaded && (
            <div className="absolute inset-0 bg-slate-200 animate-pulse" />
          )}
          <img
            src={src}
            alt={alt}
            className={`${className} transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={handleLoad}
            onError={handleError}
            loading="lazy"
            {...props}
          />
        </>
      )}
    </div>
  );
}