import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '../../../database/src/generated/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { janeAppProcessor } from '../services/janeAppService';

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|csv|xlsx|xls|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Get all uploads
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [uploads, total] = await Promise.all([
      prisma.upload.findMany({
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.upload.count(),
    ]);

    res.json({
      uploads,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching uploads:', error);
    res.status(500).json({ error: 'Failed to fetch uploads' });
  }
});

// Upload file
router.post('/', authenticateToken, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const uploadRecord = await prisma.upload.create({
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        userId: req.user!.id,
      },
      include: { user: { select: { name: true, email: true } } },
    });

    // Log the upload
    await prisma.auditLog.create({
      data: {
        action: 'UPLOAD',
        resource: 'FILE',
        resourceId: uploadRecord.id,
        details: `Uploaded file: ${req.file.originalname}`,
        userId: req.user!.id,
      },
    });

    // If it's a CSV file, process it for Jane App referrals
    if (req.file.mimetype === 'text/csv' || path.extname(req.file.originalname).toLowerCase() === '.csv') {
      // Process CSV asynchronously
      janeAppProcessor.processCSV(req.file.path, req.user!.id)
        .then(results => {
          console.log(`CSV processing completed: ${results.processed} rows, ${results.referrals} referrals created`);
          if (results.errors.length > 0) {
            console.error('CSV processing errors:', results.errors);
          }
        })
        .catch(error => {
          console.error('CSV processing failed:', error);
        });
    }

    res.status(201).json(uploadRecord);
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// CSV processing is now handled by the JaneAppProcessor service

// Download file
router.get('/:id/download', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const upload = await prisma.upload.findUnique({
      where: { id: req.params.id },
    });

    if (!upload) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (!fs.existsSync(upload.path)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    res.download(upload.path, upload.originalName);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// Delete upload
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const upload = await prisma.upload.findUnique({
      where: { id: req.params.id },
    });

    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    // Delete file from disk
    if (fs.existsSync(upload.path)) {
      fs.unlinkSync(upload.path);
    }

    // Delete from database
    await prisma.upload.delete({
      where: { id: req.params.id },
    });

    // Log the deletion
    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        resource: 'FILE',
        resourceId: req.params.id,
        details: `Deleted file: ${upload.originalName}`,
        userId: req.user!.id,
      },
    });

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

export default router;
