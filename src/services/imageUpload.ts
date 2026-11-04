
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

interface CloudinaryResponse {
    secure_url?: string;
    error?: {
        message?: string;
    };
}

export const uploadImageToHost = async (file: File): Promise<string> => {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
        throw new Error('Cloudinary configuration is missing.');
    }

    const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
    ];

    if (!allowedTypes.includes(file.type)) {
        throw new Error('Only JPG, PNG and WEBP images are allowed.');
    }

    if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image size must be less than 5 MB.');
    }

    const formData = new FormData();

    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    // Generate a unique ID for every uploaded image
    formData.append(
        'public_id',
        `linkup_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    );

    const uploadURL =
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

    try {
        const response = await fetch(uploadURL, {
            method: 'POST',
            body: formData,
        });

        const result: CloudinaryResponse = await response.json();

        if (!response.ok || !result.secure_url) {
            throw new Error(
                result.error?.message || 'Image upload failed.',
            );
        }

        return result.secure_url;
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }

        throw new Error('Could not connect to Cloudinary.');
    }
};
