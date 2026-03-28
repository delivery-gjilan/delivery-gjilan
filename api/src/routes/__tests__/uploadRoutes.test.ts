/**
 * Integration tests for POST /api/upload/image and DELETE /api/upload/image
 *
 * Uses an isolated Express app mounting only the upload router.
 * Real JWT signing + real multer parsing; only S3Service is mocked.
 */
import { vi, describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'upload-test-secret';
process.env.JWT_SECRET = JWT_SECRET;
process.env.AWS_REGION = 'eu-north-1';
process.env.AWS_BUCKET = 'test-bucket';
process.env.AWS_ACCESS_KEY_ID = 'test-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/lib/logger', () => ({
    default: {
        child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock S3Service singleton (its constructor throws without real AWS creds)
vi.mock('../../services/S3Service', () => ({
    default: {
        uploadFile: vi.fn().mockResolvedValue({ success: true, url: 'https://cdn.example.com/img.jpg' }),
        deleteFile: vi.fn().mockResolvedValue(true),
        isS3Url: vi.fn().mockReturnValue(true),
    },
}));

vi.mock('@aws-sdk/client-s3', () => ({
    S3Client: vi.fn(function (this: any) {
        this.send = vi.fn();
    }),
    PutObjectCommand: vi.fn(function (this: any, input: any) {
        this.input = input;
    }),
    DeleteObjectCommand: vi.fn(function (this: any, input: any) {
        this.input = input;
    }),
}));

// ── Test app (real multer so multipart body fields are parsed) ──────────────
import uploadRoutes from '../uploadRoutes';

const app = express();
app.use(express.json());
app.use('/api/upload', uploadRoutes);

// ── Helpers ─────────────────────────────────────────────────────────────────
const FAKE_IMAGE = Buffer.from(
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoH' +
    'BwYIDAoMCwsKCwsNCxAQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/wAALCA' +
    'ABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAA' +
    'AAAAAP/aAAgBAQAAPwBiwAB//9k=',
    'base64',
);

function makeToken(role: string, userId = 'user-1') {
    return jwt.sign({ userId, role }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' });
}

/** POST /api/upload/image with an actual JPEG buffer + folder field */
function uploadRequest(token: string, folder: string) {
    return request(app)
        .post('/api/upload/image')
        .set('Authorization', `Bearer ${token}`)
        .attach('image', FAKE_IMAGE, { filename: 'test.jpg', contentType: 'image/jpeg' })
        .field('folder', folder);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/upload/image — authentication', () => {
    it('returns 401 with no Authorization header', async () => {
        const res = await request(app).post('/api/upload/image');
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });

    it('returns 401 with a malformed bearer token', async () => {
        const res = await request(app)
            .post('/api/upload/image')
            .set('Authorization', 'Bearer not.a.real.jwt');
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });

    it('returns 401 when token is signed with the wrong secret', async () => {
        const badToken = jwt.sign({ userId: 'x', role: 'ADMIN' }, 'wrong-secret', { expiresIn: '1h' });
        const res = await request(app)
            .post('/api/upload/image')
            .set('Authorization', `Bearer ${badToken}`);
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });
});

describe('POST /api/upload/image — role enforcement', () => {
    it('CUSTOMER role is rejected with 403 for any folder', async () => {
        const res = await uploadRequest(makeToken('CUSTOMER'), 'categories');
        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
    });

    it('BUSINESS_OWNER is rejected with 403 for folder=businesses', async () => {
        const res = await uploadRequest(makeToken('BUSINESS_OWNER'), 'businesses');
        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.error).toMatch(/admin/i);
    });

    it('BUSINESS_OWNER can upload to folder=products', async () => {
        const res = await uploadRequest(makeToken('BUSINESS_OWNER'), 'products');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.url).toBe('https://cdn.example.com/img.jpg');
    });

    it('ADMIN can upload to folder=businesses', async () => {
        const res = await uploadRequest(makeToken('ADMIN'), 'businesses');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('SUPER_ADMIN can upload to folder=businesses', async () => {
        const res = await uploadRequest(makeToken('SUPER_ADMIN'), 'businesses');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
});

describe('POST /api/upload/image — validation', () => {
    it('returns 400 when no file is provided', async () => {
        const res = await request(app)
            .post('/api/upload/image')
            .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
            .field('folder', 'businesses');
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it('returns 400 for an invalid folder name', async () => {
        const res = await uploadRequest(makeToken('ADMIN'), 'unknown_folder');
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });
});

describe('DELETE /api/upload/image — authentication', () => {
    it('returns 401 with no Authorization header', async () => {
        const res = await request(app)
            .delete('/api/upload/image')
            .send({ imageUrl: 'https://cdn.example.com/img.jpg' });
        expect(res.status).toBe(401);
    });

    it('CUSTOMER role is rejected with 403', async () => {
        const res = await request(app)
            .delete('/api/upload/image')
            .set('Authorization', `Bearer ${makeToken('CUSTOMER')}`)
            .send({ imageUrl: 'https://cdn.example.com/img.jpg' });
        expect(res.status).toBe(403);
    });

    it('ADMIN can delete an image', async () => {
        const res = await request(app)
            .delete('/api/upload/image')
            .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
            .send({ imageUrl: 'https://cdn.example.com/img.jpg' });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
});

