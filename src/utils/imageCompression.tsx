export interface CompressionOptions {
    targetWidth?: number;
    maxWidth?: number;
    maxHeight?: number;
    targetSizeBytes?: number;
}

const DEFAULTS = {
    MAX_WIDTH: 1920,
    MAX_HEIGHT: 1080,
    TARGET_SIZE_BYTES: 100 * 1024, // 100 KB
    MIN_QUALITY: 0.3,
    INITIAL_QUALITY: 0.9,
    QUALITY_STEP: 0.1,
    SCALE_STEP: 0.85,
    MAX_ATTEMPTS: 30,
};


const isDataUrl = (value: string): boolean => /^data:image\//i.test(value.trim());

const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result !== 'string') {
                reject(new Error('Failed to read file as data URL.'));
                return;
            }
            resolve(reader.result);
        };
        reader.onerror = () => reject(reader.error || new Error('Failed to read file.'));
        reader.readAsDataURL(file);
    });
};

const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Failed to load image for compression.'));
        image.src = src;
    });
};

const getTargetDimensions = (imgWidth: number, imgHeight: number, options: CompressionOptions) => {
    const aspectRatio = imgWidth / imgHeight;

    if (options.targetWidth) {
        return {
            width: options.targetWidth,
            height: Math.round(options.targetWidth / aspectRatio),
        };
    }

    let targetWidth = imgWidth;
    let targetHeight = imgHeight;
    const maxWidth = options.maxWidth ?? DEFAULTS.MAX_WIDTH;
    const maxHeight = options.maxHeight ?? DEFAULTS.MAX_HEIGHT;

    if (targetWidth > maxWidth || targetHeight > maxHeight) {
        const widthRatio = maxWidth / targetWidth;
        const heightRatio = maxHeight / targetHeight;
        const ratio = Math.min(widthRatio, heightRatio);
        targetWidth = Math.floor(targetWidth * ratio);
        targetHeight = Math.floor(targetHeight * ratio);
    }

    return { width: targetWidth, height: targetHeight };
};

const canvasToBlob = (canvas: HTMLCanvasElement, quality: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(new Error('Canvas compression failed to produce a blob.'));
                    return;
                }
                resolve(blob);
            },
            'image/jpeg',
            quality,
        );
    });
};

const blobToDataUrl = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result !== 'string') {
                reject(new Error('Failed to convert blob to data URL.'));
                return;
            }
            resolve(reader.result);
        };
        reader.onerror = () => reject(reader.error || new Error('Failed to read compressed blob.'));
        reader.readAsDataURL(blob);
    });
};

/**
 * Compresses an image to JPEG to be under a target file size.
 * Accepts either a File object or an existing data URL string.
 * Allows specifying a target width for the output image.
 */
export const compressImage = async (input: File | string, options: CompressionOptions = {}): Promise<string> => {
    const sourceDataUrl = typeof input === 'string'
        ? (isDataUrl(input) ? input : (() => { throw new Error('String input must be a data URL starting with data:image/'); })())
        : await readFileAsDataUrl(input);

    const image = await loadImage(sourceDataUrl);
    
    let { width: currentWidth, height: currentHeight } = getTargetDimensions(image.width, image.height, options);

    let currentQuality = DEFAULTS.INITIAL_QUALITY;
    const targetSizeBytes = options.targetSizeBytes ?? DEFAULTS.TARGET_SIZE_BYTES;

    const canvas = document.createElement('canvas');

    for (let attempt = 0; attempt < DEFAULTS.MAX_ATTEMPTS; attempt++) {
        canvas.width = Math.max(1, Math.round(currentWidth));
        canvas.height = Math.max(1, Math.round(currentHeight));
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Could not acquire canvas context for compression.');
        }
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        const blob = await canvasToBlob(canvas, currentQuality);
        if (blob.size <= targetSizeBytes) {
            return blobToDataUrl(blob);
        }

        // If width is fixed, we can only reduce quality.
        if (options.targetWidth) {
            if (currentQuality <= DEFAULTS.MIN_QUALITY) {
                // Can't reduce further, break and throw error.
                break;
            }
            currentQuality = Math.max(DEFAULTS.MIN_QUALITY, currentQuality - DEFAULTS.QUALITY_STEP);
        } else {
            // If width is flexible, we can reduce quality or dimensions.
            if (currentQuality > DEFAULTS.MIN_QUALITY + 0.01) {
                currentQuality = Math.max(DEFAULTS.MIN_QUALITY, currentQuality - DEFAULTS.QUALITY_STEP);
            } else {
                currentWidth = Math.max(1, Math.floor(currentWidth * DEFAULTS.SCALE_STEP));
                currentHeight = Math.max(1, Math.floor(currentHeight * DEFAULTS.SCALE_STEP));
                currentQuality = DEFAULTS.INITIAL_QUALITY;
            }
        }
    }

    throw new Error(`Unable to compress image below ${targetSizeBytes / 1024}KB after multiple attempts.`);
};