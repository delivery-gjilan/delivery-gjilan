import { getAuthToken } from './auth';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/graphql').replace(/\/graphql$/, '');

export async function uploadImage(file: File, folder: string): Promise<string | null> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('folder', folder);

    const token = getAuthToken();
    try {
        const response = await fetch(`${API_BASE}/api/upload/image`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
        });

        const data = await response.json();
        if (data.success && data.url) {
            return data.url;
        }
        throw new Error(data.error || 'Upload failed');
    } catch (error) {
        console.error('Image upload error:', error);
        return null;
    }
}

export async function deleteImage(imageUrl: string): Promise<void> {
    const token = getAuthToken();
    try {
        await fetch(`${API_BASE}/api/upload/image`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ imageUrl }),
        });
    } catch {
        console.warn('Failed to delete old image from S3:', imageUrl);
    }
}
