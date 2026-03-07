import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import logger from '@/lib/logger';

const log = logger.child({ service: 'S3Service' });

interface UploadOptions {
    folder: 'businesses' | 'products' | 'categories';
    file: Express.Multer.File;
}

interface UploadResult {
    success: boolean;
    url?: string;
    error?: string;
}

class S3Service {
    private s3Client: S3Client | null = null;
    private bucketName: string;
    private region: string;
    private configured: boolean;

    constructor() {
        this.region = process.env.AWS_REGION || 'eu-north-1';
        this.bucketName = process.env.AWS_BUCKET || '';

        if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
            log.warn('AWS credentials not configured — image upload/delete disabled');
            this.configured = false;
            return;
        }

        this.configured = true;
        this.s3Client = new S3Client({
            region: this.region,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
        });
    }

    /**
     * Upload a file to S3
     */
    async uploadFile(options: UploadOptions): Promise<UploadResult> {
        if (!this.configured || !this.s3Client) {
            return { success: false, error: 'Image upload is not configured (missing AWS credentials)' };
        }
        try {
            const { folder, file } = options;

            // Generate unique filename
            const timestamp = Date.now();
            const uuid = randomUUID();
            const extension = file.originalname.split('.').pop()?.toLowerCase() || 'jpg';
            const key = `${folder}/${timestamp}-${uuid}.${extension}`;

            // Upload to S3
            const command = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
                // ACL removed - bucket policy handles public access
            });

            await this.s3Client.send(command);

            // Construct the public URL
            const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;

            return {
                success: true,
                url,
            };
        } catch (error) {
            log.error({ err: error }, 's3:upload:error');
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Upload failed',
            };
        }
    }

    /**
     * Delete a file from S3
     */
    async deleteFile(imageUrl: string): Promise<boolean> {
        if (!this.configured || !this.s3Client) {
            log.warn('S3 not configured — skipping delete');
            return false;
        }
        try {
            // Extract key from URL
            // Format: https://bucket.s3.region.amazonaws.com/folder/filename.ext
            const urlPattern = new RegExp(`https://${this.bucketName}\\.s3\\.${this.region}\\.amazonaws\\.com/(.+)`);
            const match = imageUrl.match(urlPattern);

            if (!match || !match[1]) {
                log.warn({ imageUrl }, 's3:delete:invalidUrl');
                return false;
            }

            const key = match[1];

            const command = new DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: key,
            });

            await this.s3Client.send(command);
            return true;
        } catch (error) {
            log.error({ err: error, imageUrl }, 's3:delete:error');
            return false;
        }
    }

    /**
     * Check if a URL is an S3 URL from our bucket
     */
    isS3Url(url: string): boolean {
        return url.includes(`${this.bucketName}.s3.${this.region}.amazonaws.com`);
    }
}

export default new S3Service();
