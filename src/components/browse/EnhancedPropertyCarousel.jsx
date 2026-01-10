import React from "react";
import { ChevronLeft, ChevronRight, Home as HomeIcon } from "lucide-react";
import OptimizedImage from "../common/OptimizedImage";
import { motion, AnimatePresence } from "framer-motion";

export default function EnhancedPropertyCarousel({ images = [], alt = "", className = "" }) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [direction, setDirection] = React.useState(0);
  const [isHovering, setIsHovering] = React.useState(false);
  const [touchStart, setTouchStart] = React.useState(null);
  const [loadedImages, setLoadedImages] = React.useState(new Set([0]));
  
  const imageList = images.length > 0 ? images : [];
  const hasMultipleImages = imageList.length > 1;
  
  // Preload adjacent images
  React.useEffect(() => {
    if (imageList.length === 0) return;
    
    const preloadImage = (index) => {
      if (loadedImages.has(index)) return;
      
      const img = new Image();
      img.src = imageList[index];
      img.onload = () => {
        setLoadedImages(prev => new Set([...prev, index]));
      };
    };
    
    // Preload current, next, and previous
    preloadImage(currentIndex);
    if (hasMultipleImages) {
      const nextIndex = (currentIndex + 1) % imageList.length;
      const prevIndex = (currentIndex - 1 + imageList.length) % imageList.length;
      preloadImage(nextIndex);
      preloadImage(prevIndex);
    }
  }, [currentIndex, imageList, hasMultipleImages, loadedImages]);
  
  const handlePrev = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setDirection(-1);
    setCurrentIndex((prev) => (prev === 0 ? imageList.length - 1 : prev - 1));
  };
  
  const handleNext = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setDirection(1);
    setCurrentIndex((prev) => (prev === imageList.length - 1 ? 0 : prev + 1));
  };
  
  // Touch handlers for mobile swipe
  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
  };
  
  const handleTouchEnd = (e) => {
    if (!touchStart) return;
    
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    
    setTouchStart(null);
  };
  
  const variants = {
    enter: (direction) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction) => ({
      x: direction > 0 ? '-100%' : '100%',
      opacity: 0
    })
  };
  
  return (
    <div 
      className={`relative overflow-hidden bg-slate-100 ${className}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {imageList.length > 0 ? (
        <>
          {/* Image Display with Animation */}
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
              className="absolute inset-0"
            >
              <OptimizedImage
                src={imageList[currentIndex]}
                alt={`${alt} - ${currentIndex + 1}`}
                className="w-full h-full object-cover"
                fallbackIcon={HomeIcon}
                priority={currentIndex === 0}
                quality={85}
              />
            </motion.div>
          </AnimatePresence>
          
          {/* Navigation Arrows - Desktop */}
          {hasMultipleImages && (
            <>
              <motion.button
                onClick={handlePrev}
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovering ? 1 : 0 }}
                transition={{ duration: 0.2 }}
                className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-all backdrop-blur-sm z-10"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-5 h-5" />
              </motion.button>
              
              <motion.button
                onClick={handleNext}
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovering ? 1 : 0 }}
                transition={{ duration: 0.2 }}
                className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-all backdrop-blur-sm z-10"
                aria-label="Next image"
              >
                <ChevronRight className="w-5 h-5" />
              </motion.button>
            </>
          )}
          
          {/* Dot Indicators - Mobile & Desktop */}
          {hasMultipleImages && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {imageList.slice(0, 8).map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDirection(i > currentIndex ? 1 : -1);
                    setCurrentIndex(i);
                  }}
                  className={`transition-all duration-300 rounded-full ${
                    i === currentIndex 
                      ? 'bg-white w-6 h-1.5' 
                      : 'bg-white/60 hover:bg-white/80 w-1.5 h-1.5'
                  }`}
                  aria-label={`Go to image ${i + 1}`}
                />
              ))}
              {imageList.length > 8 && (
                <span className="bg-white/60 px-1.5 py-0.5 rounded text-[10px] text-white font-medium">
                  +{imageList.length - 8}
                </span>
              )}
            </div>
          )}
          
          {/* Image Counter Badge */}
          {hasMultipleImages && (
            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-md text-xs font-medium z-10">
              {currentIndex + 1} / {imageList.length}
            </div>
          )}
          
          {/* Loading Progress Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20 z-10">
            <motion.div
              className="h-full bg-white"
              initial={{ width: "0%" }}
              animate={{ width: `${((loadedImages.size / imageList.length) * 100)}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
          <HomeIcon className="w-16 h-16 text-slate-300" />
        </div>
      )}
    </div>
  );
}