/**
 * High-Res Zoomable Image Compression Utility
 * Optimized for retina clarity (1600px max dimension, 0.84 quality)
 * Target output size: ~180KB - 250KB per photo with preserved color gamut
 */

export interface ImageCompressionOptions {
  maxDimension?: number;
  quality?: number;
  preferredMimeType?: 'image/webp' | 'image/jpeg';
}

const DEFAULT_MAX_DIMENSION = 1600;
const DEFAULT_QUALITY = 0.84;

/**
 * Compresses an image File to a crisp HD Data URL (Base64).
 * Preserves native aspect ratio, color gamut, and high-frequency details for pinch-to-zoom.
 *
 * @param file The original image File from an input or drop zone
 * @param options Optional overrides for maxDimension and quality
 * @returns Promise resolving to the compressed image Data URL string
 */
export const compressImage = (
  file: File,
  options?: ImageCompressionOptions
): Promise<string> => {
  const maxDim = options?.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options?.quality ?? DEFAULT_QUALITY;
  const preferredType = options?.preferredMimeType ?? 'image/webp';

  return new Promise((resolve, reject) => {
    // If not an image file, reject early
    if (!file.type.startsWith('image/')) {
      return reject(new Error(`Selected file is not an image: ${file.type}`));
    }

    const reader = new FileReader();

    reader.onload = (readerEvent) => {
      const img = new window.Image();

      img.onload = () => {
        // Calculate new dimensions preserving exact aspect ratio
        let { width, height } = img;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        // Initialize high-precision canvas with sRGB color gamut preservation
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        // Try getting sRGB context to prevent color shifting or gamut flattening
        let ctx: CanvasRenderingContext2D | null = null;
        try {
          ctx = canvas.getContext('2d', {
            colorSpace: 'srgb',
            willReadFrequently: false,
          }) as CanvasRenderingContext2D | null;
        } catch {
          ctx = canvas.getContext('2d');
        }

        if (!ctx) {
          // Fallback to original data URL if 2D context unavailable
          return resolve(readerEvent.target?.result as string);
        }

        // Enable high-quality bicubic/bilinear smoothing for retina sharpness
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw image directly onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Try preferred format (WebP for superior size/retina quality ratio)
        let dataUrl: string;
        try {
          dataUrl = canvas.toDataURL(preferredType, quality);
          // If browser doesn't support requested type, it defaults to image/png
          if (!dataUrl.startsWith(`data:${preferredType}`)) {
            // Fallback to JPEG
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
        } catch {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(dataUrl);
      };

      img.onerror = (err) => reject(err);
      img.src = readerEvent.target?.result as string;
    };

    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

/**
 * Alias for backwards compatibility with existing SellerDashboard callers
 */
export const compressImageToDataUrl = compressImage;

/**
 * Compresses an image and returns a native File object (e.g. for direct FormData or storage upload).
 */
export const compressImageToFile = async (
  file: File,
  filename?: string,
  options?: ImageCompressionOptions
): Promise<File> => {
  const dataUrl = await compressImage(file, options);
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const name = filename || file.name.replace(/\.[^.]+$/, '') + '.webp';
  return new File([blob], name, { type: blob.type });
};
