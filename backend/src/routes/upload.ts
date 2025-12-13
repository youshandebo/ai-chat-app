import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

const router = express.Router();

// Configure storage - use memory storage for processing with sharp
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit (will be compressed)
    },
    fileFilter: (req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

// Auth middleware
import { requireAdmin } from "../middleware/auth";

// Helper: ensure upload directory exists
const ensureUploadDir = () => {
    // Use uploads directory in backend root (runtime directory)
    // This decouples from frontend and persists uploads in backend/uploads
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    return uploadDir;
};

// General image upload with compression
router.post('/upload-image', requireAdmin, upload.single('image'), async (req: express.Request, res: express.Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const uploadDir = ensureUploadDir();
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = uniqueSuffix + '.webp';
        const outputPath = path.join(uploadDir, filename);

        // Compress and convert to WebP (high quality, good compression)
        await sharp(req.file.buffer)
            .webp({ quality: 85 })
            .toFile(outputPath);

        const publicUrl = `/api/uploads/${filename}`;
        res.json({
            url: publicUrl,
            filename: filename
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// Avatar upload with additional optimization (smaller size, circular crop ready)
router.post('/upload-avatar', requireAdmin, upload.single('image'), async (req: express.Request, res: express.Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const uploadDir = ensureUploadDir();
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = 'avatar-' + uniqueSuffix + '.webp';
        const outputPath = path.join(uploadDir, filename);

        // Resize to 200x200, center crop, high quality WebP
        await sharp(req.file.buffer)
            .resize(200, 200, {
                fit: 'cover',
                position: 'center'
            })
            .webp({ quality: 90 })
            .toFile(outputPath);

        const publicUrl = `/api/uploads/${filename}`;
        res.json({
            url: publicUrl,
            filename: filename
        });
    } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({ error: 'Avatar upload failed' });
    }
});

export default router;

