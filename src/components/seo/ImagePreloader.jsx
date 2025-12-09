import React from "react";

/**
 * Pré-carrega imagens dos próximos imóveis para melhorar performance
 */
export default function ImagePreloader({ images = [], priority = "low" }) {
  React.useEffect(() => {
    if (!images || images.length === 0) return;

    // Pré-carregar apenas as primeiras 3 imagens
    const imagesToPreload = images.slice(0, 3);

    imagesToPreload.forEach((src) => {
      if (!src) return;
      
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.as = "image";
      link.href = src;
      link.fetchPriority = priority;
      document.head.appendChild(link);
    });
  }, [images, priority]);

  return null;
}