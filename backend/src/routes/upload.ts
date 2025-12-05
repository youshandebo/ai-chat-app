import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configure storage
const storage = multer.diskStorage({
    destination: function (req: express.Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) {
        // Save to frontend public directory so it's accessible
        // Assuming backend is at root/backend and frontend is at root/frontend
        const uploadDir = path.join(process.cwd(), '../frontend/public/uploads');

        // Ensure directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        cb(null, uploadDir);
    },
    filename: function (req: express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) {
        // Generate unique filename: timestamp-random-originalName
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
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
const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const auth = (req.get("authorization") || "").trim();
    const token = process.env.ADMIN_TOKEN || "";
    if (auth !== `Bearer ${token}`) {
        return res.status(403).json({ error: "无权访问" });
    }
    next();
};

router.post('/upload-image', requireAdmin, upload.single('image'), (req: express.Request, res: express.Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Return the public URL
        // Since we saved to frontend/public/uploads, the URL is /uploads/filename
        const publicUrl = `/uploads/${req.file.filename}`;

        res.json({
            url: publicUrl,
            filename: req.file.filename
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

export default router;
