/**
 * CDN Optimizer - Optimiza URLs de imagens para usar CDN e transformações
 */

// Supabase Storage CDN transformations
const SUPABASE_STORAGE_URL = 'qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public';

/**
 * Otimiza URL de imagem com parâmetros CDN
 * @param {string} url - URL original da imagem
 * @param {object} options - Opções de otimização
 * @returns {string} URL otimizada
 */
export function optimizeImageUrl(url, options = {}) {
  if (!url) return url;
  
  const {
    width = null,
    height = null,
    quality = 80,
    format = 'webp',
    fit = 'cover',
    blur = null
  } = options;
  
  // Supabase Storage - usar transformações nativas
  if (url.includes(SUPABASE_STORAGE_URL)) {
    const params = new URLSearchParams();
    if (width) params.append('width', width);
    if (height) params.append('height', height);
    if (quality) params.append('quality', quality);
    if (format) params.append('format', format);
    if (fit) params.append('resize', fit);
    
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${params.toString()}`;
  }
  
  // Unsplash - usar transformações nativas
  if (url.includes('unsplash.com')) {
    const params = new URLSearchParams();
    if (width) params.append('w', width);
    if (height) params.append('h', height);
    if (quality) params.append('q', quality);
    if (format === 'webp') params.append('fm', 'webp');
    if (fit) params.append('fit', fit);
    if (blur) params.append('blur', blur);
    params.append('auto', 'format,compress');
    
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${params.toString()}`;
  }
  
  // URLs externas - retornar como estão
  return url;
}

/**
 * Gera srcset para imagens responsivas
 */
export function generateSrcSet(url, widths = [320, 640, 960, 1280, 1920]) {
  if (!url) return '';
  
  return widths
    .map(w => `${optimizeImageUrl(url, { width: w })} ${w}w`)
    .join(', ');
}

/**
 * Preload de imagens críticas
 */
export function preloadImage(url, options = {}) {
  if (typeof window === 'undefined') return;
  
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = optimizeImageUrl(url, options);
  
  if (options.srcset) {
    link.imageSrcset = generateSrcSet(url, options.widths);
    link.imageSizes = options.sizes || '100vw';
  }
  
  document.head.appendChild(link);
}

/**
 * Cache strategy para imagens
 */
export const CACHE_STRATEGY = {
  // Imagens do hero/above-the-fold: cache agressivo
  critical: {
    quality: 85,
    format: 'webp',
    cacheTime: 31536000 // 1 ano
  },
  
  // Imagens visíveis na primeira tela
  visible: {
    quality: 80,
    format: 'webp',
    cacheTime: 2592000 // 30 dias
  },
  
  // Imagens abaixo do fold
  lazy: {
    quality: 75,
    format: 'webp',
    cacheTime: 604800 // 7 dias
  },
  
  // Thumbnails
  thumbnail: {
    quality: 70,
    format: 'webp',
    width: 400,
    cacheTime: 2592000 // 30 dias
  }
};

/**
 * Detectar formato de imagem suportado pelo browser
 */
export function getSupportedFormat() {
  if (typeof window === 'undefined') return 'webp';
  
  // Verificar suporte a WebP
  const canvas = document.createElement('canvas');
  if (canvas.getContext?.('2d')) {
    const webpSupport = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    if (webpSupport) return 'webp';
  }
  
  // Verificar suporte a AVIF
  const avifSupport = document.createElement('img');
  avifSupport.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=';
  if (avifSupport.complete && avifSupport.naturalWidth > 0) return 'avif';
  
  return 'webp';
}