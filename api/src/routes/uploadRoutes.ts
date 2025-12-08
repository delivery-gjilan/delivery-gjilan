import { Router, Request, Response } from 'express';
import { uploadMiddleware } from '../lib/middleware/uploadMiddleware';
import S3Service from '../services/S3Service';

const router = Router();

/**
 * POST /api/upload/image
 * Upload an image to S3
 *
 * Body (multipart/form-data):
 * - image: File (required)
 * - folder: 'businesses' | 'products' | 'categories' (required)
 */
router.post('/image', uploadMiddleware.single('image'), async (req: Request, res: Response) => {
    try {
        // Validate file
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file provided',
            });
        }

        // Validate folder
        const folder = req.body.folder as string;
        if (!folder || !['businesses', 'products', 'categories'].includes(folder)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid folder. Must be one of: businesses, products, categories',
            });
        }

        // Upload to S3
        const result = await S3Service.uploadFile({
            folder: folder as 'businesses' | 'products' | 'categories',
            file: req.file,
        });

        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: result.error || 'Upload failed',
            });
        }
        return res.status(200).json({
            success: true,
            url: result.url,
        });
    } catch (error) {
        console.error('Upload error:', error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Internal server error',
        });
    }
});

/**
 * DELETE /api/upload/image
 * Delete an image from S3
 *
 * Body (JSON):
 * - imageUrl: string (required)
 */
router.delete('/image', async (req: Request, res: Response) => {
    try {
        const { imageUrl } = req.body;

        if (!imageUrl) {
            return res.status(400).json({
                success: false,
                error: 'imageUrl is required',
            });
        }

        // Check if it's an S3 URL
        if (!S3Service.isS3Url(imageUrl)) {
            return res.status(400).json({
                success: false,
                error: 'Not an S3 URL',
            });
        }

        const deleted = await S3Service.deleteFile(imageUrl);

        return res.status(200).json({
            success: deleted,
            message: deleted ? 'Image deleted successfully' : 'Failed to delete image',
        });
    } catch (error) {
        console.error('Delete error:', error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Internal server error',
        });
    }
});

export default router;
