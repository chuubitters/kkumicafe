const cache = new Map<string, HTMLImageElement>();
const listeners = new Set<() => void>();

export function onImageLoad(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function getImage(src: string): HTMLImageElement {
  let img = cache.get(src);
  if (!img) {
    img = new Image();
    img.decoding = 'async';
    img.onload = () => listeners.forEach((l) => l());
    img.src = src;
    cache.set(src, img);
  }
  return img;
}

export function preloadImages(srcs: string[]) {
  return Promise.all(srcs.map((s) => new Promise<void>((res) => {
    const img = getImage(s);
    if (img.complete && img.naturalWidth) return res();
    img.addEventListener('load', () => res(), { once: true });
    img.addEventListener('error', () => res(), { once: true });
  })));
}

/** Read a local file, downscale to maxSize and return a JPEG/PNG data URL. */
export function fileToDataUrl(file: File, maxSize = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const sc = Math.min(1, maxSize / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.88));
      };
      img.onerror = () => reject(new Error('Could not read that image'));
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
