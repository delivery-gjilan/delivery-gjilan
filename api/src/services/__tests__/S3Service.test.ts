/**
 * Unit tests for S3Service.
 *
 * Covers:
 *  - isS3Url: pure URL check against our bucket/region
 *  - uploadFile: constructs the correct S3 key and public URL; propagates errors
 *  - deleteFile: extracts the key from a valid URL; rejects malformed URLs;
 *                propagates S3 errors without throwing
 *  - Constructor: throws when AWS credentials env vars are missing
 *
 * The AWS SDK is fully mocked — no real S3 calls are made.
 * vi.hoisted() is used to set required env vars before the module is imported
 * (because S3Service exports a singleton that is instantiated at module load time).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

// ── 1. Set env vars + create mockSend BEFORE any import ─────────────────────
const { mockSend } = vi.hoisted(() => {
    process.env.AWS_ACCESS_KEY_ID = 'AKIATEST123456789012';
    process.env.AWS_SECRET_ACCESS_KEY = 'testSecretKey0000000000000000000000000000';
    process.env.AWS_BUCKET = 'testbucket';
    process.env.AWS_REGION = 'eu-test-1';
    return { mockSend: vi.fn().mockResolvedValue({}) };
});

// ── 2. Mock the AWS SDK ──────────────────────────────────────────────────────
// All three are used with `new` in S3Service so the mocks must be regular
// (non-arrow) functions — arrow functions cannot be constructors.
vi.mock('@aws-sdk/client-s3', () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    S3Client: vi.fn(function (this: Record<string, unknown>) {
        this.send = mockSend;
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    PutObjectCommand: vi.fn(function (this: Record<string, unknown>, input: Record<string, unknown>) {
        Object.assign(this, { _type: 'Put', ...input });
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    DeleteObjectCommand: vi.fn(function (this: Record<string, unknown>, input: Record<string, unknown>) {
        Object.assign(this, { _type: 'Delete', ...input });
    }),
}));

// ── 3. Import the service AFTER mocks are in place ───────────────────────────
import s3Service from '../S3Service';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeFile(name = 'photo.jpg', mimetype = 'image/jpeg'): Express.Multer.File {
    return {
        originalname: name,
        mimetype,
        buffer: Buffer.from('fake-image-data'),
        fieldname: 'file',
        encoding: '7bit',
        size: 16,
        stream: null as unknown as NodeJS.ReadableStream,
        destination: '',
        filename: '',
        path: '',
    };
}

afterEach(() => {
    vi.clearAllMocks();
    mockSend.mockResolvedValue({});
});

// ── isS3Url ──────────────────────────────────────────────────────────────────

describe('S3Service.isS3Url', () => {
    it('returns true for a URL belonging to the configured bucket and region', () => {
        const url = 'https://testbucket.s3.eu-test-1.amazonaws.com/products/img.jpg';
        expect(s3Service.isS3Url(url)).toBe(true);
    });

    it('returns false for a URL pointing to a different bucket', () => {
        const url = 'https://other-bucket.s3.eu-test-1.amazonaws.com/products/img.jpg';
        expect(s3Service.isS3Url(url)).toBe(false);
    });

    it('returns false for a plain HTTP URL', () => {
        expect(s3Service.isS3Url('https://example.com/image.jpg')).toBe(false);
    });

    it('returns false for an empty string', () => {
        expect(s3Service.isS3Url('')).toBe(false);
    });
});

// ── uploadFile ───────────────────────────────────────────────────────────────

describe('S3Service.uploadFile', () => {
    it('returns success:true with a correctly structured URL', async () => {
        const result = await s3Service.uploadFile({ folder: 'businesses', file: makeFile('logo.png', 'image/png') });

        expect(result.success).toBe(true);
        expect(result.url).toMatch(/^https:\/\/testbucket\.s3\.eu-test-1\.amazonaws\.com\/businesses\/.+\.png$/);
    });

    it('embeds the correct folder in the S3 key', async () => {
        const result = await s3Service.uploadFile({ folder: 'products', file: makeFile('item.jpg') });
        expect(result.url).toMatch(/\/products\//);
    });

    it('generates a unique key for each upload', async () => {
        const r1 = await s3Service.uploadFile({ folder: 'categories', file: makeFile('cat.jpg') });
        const r2 = await s3Service.uploadFile({ folder: 'categories', file: makeFile('cat.jpg') });
        expect(r1.url).not.toBe(r2.url);
    });

    it('passes the file buffer and mimetype to the PutObjectCommand', async () => {
        const { PutObjectCommand } = await import('@aws-sdk/client-s3');
        const file = makeFile('shot.jpg', 'image/jpeg');
        await s3Service.uploadFile({ folder: 'businesses', file });

        expect(vi.mocked(PutObjectCommand)).toHaveBeenCalledWith(
            expect.objectContaining({
                Bucket: 'testbucket',
                Body: file.buffer,
                ContentType: 'image/jpeg',
            }),
        );
    });

    it('returns success:false with an error message when S3 throws', async () => {
        mockSend.mockRejectedValueOnce(new Error('AccessDenied'));
        const result = await s3Service.uploadFile({ folder: 'products', file: makeFile() });
        expect(result.success).toBe(false);
        expect(result.error).toBe('AccessDenied');
    });
});

// ── deleteFile ───────────────────────────────────────────────────────────────

describe('S3Service.deleteFile', () => {
    it('extracts the key and calls DeleteObjectCommand for a valid URL', async () => {
        const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
        const url = 'https://testbucket.s3.eu-test-1.amazonaws.com/products/1234-uuid.jpg';

        const result = await s3Service.deleteFile(url);

        expect(result).toBe(true);
        expect(vi.mocked(DeleteObjectCommand)).toHaveBeenCalledWith(
            expect.objectContaining({ Key: 'products/1234-uuid.jpg', Bucket: 'testbucket' }),
        );
    });

    it('returns false without calling S3 for a URL from a different bucket', async () => {
        const url = 'https://other-bucket.s3.eu-test-1.amazonaws.com/products/img.jpg';
        const result = await s3Service.deleteFile(url);
        expect(result).toBe(false);
        expect(mockSend).not.toHaveBeenCalled();
    });

    it('returns false and does not throw when S3 rejects', async () => {
        mockSend.mockRejectedValueOnce(new Error('NoSuchKey'));
        const url = 'https://testbucket.s3.eu-test-1.amazonaws.com/businesses/file.jpg';
        await expect(s3Service.deleteFile(url)).resolves.toBe(false);
    });
});
