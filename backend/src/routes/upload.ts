import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { isPostgresConnected, pgPool, mockDb, logger } from '../config/db';
import { authenticateJWT, AuthenticatedRequest } from '../middlewares/auth';
import { enqueueVisionJob } from '../services/queues';

const router = Router();

// Configure storage
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// File validation limits
const fileLimits = {
  fileSize: 50 * 1024 * 1024 // Max 50 MB
};

// File type validation (whitelist extension & mime types)
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.tiff', '.mp4', '.pdf', '.csv', '.zip'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${ext}. Supported types: JPG, PNG, TIFF, MP4, PDF, CSV, ZIP`));
  }
};

const upload = multer({ 
  storage,
  limits: fileLimits,
  fileFilter
});

// Upload endpoint
router.post('/', authenticateJWT, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  const { projectId, folderPath } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const projId = parseInt(projectId);
  if (isNaN(projId)) {
    return res.status(400).json({ error: 'Invalid or missing project ID' });
  }

  const folder = folderPath || '/';

  try {
    const fileId = 'file_' + Math.random().toString(36).substr(2, 9);
    const fileUrl = `/uploads/${file.filename}`; // mock cloud S3 CDN link

    // Determine version history
    let version = 1;

    if (isPostgresConnected && pgPool) {
      const matchRes = await pgPool.query(
        'SELECT MAX(version) as max_version FROM files WHERE project_id = $1 AND name = $2',
        [projId, file.originalname]
      );
      if (matchRes.rows[0].max_version) {
        version = parseInt(matchRes.rows[0].max_version) + 1;
      }

      await pgPool.query(
        `INSERT INTO files (id, project_id, name, type, size, url, folder_path, version, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [fileId, projId, file.originalname, file.mimetype, file.size, fileUrl, folder, version, req.user?.id]
      );

      // Log activity
      await pgPool.query('INSERT INTO activities (user_id, action, details) VALUES ($1, $2, $3)', [
        req.user?.id,
        'Upload File',
        `File ${file.originalname} (v${version}) uploaded to project ID ${projId}`
      ]);
    } else {
      // Fallback
      const matches = mockDb.files.filter(f => f.project_id === projId && f.name === file.originalname);
      if (matches.length > 0) {
        version = Math.max(...matches.map(f => f.version)) + 1;
      }

      const newFile = {
        id: fileId,
        project_id: projId,
        name: file.originalname,
        type: file.mimetype,
        size: file.size,
        url: fileUrl,
        folder_path: folder,
        version,
        uploaded_by: req.user?.id || 1,
        uploaded_at: new Date()
      };

      mockDb.files.push(newFile);

      mockDb.activities.push({
        id: mockDb.activities.length + 1,
        user_id: req.user?.id || 1,
        action: 'Upload File',
        details: `File ${file.originalname} (v${version}) uploaded (Fallback DB)`,
        timestamp: new Date()
      });
    }

    // Trigger AI Vision Worker for images (jpg, png, tiff)
    const isImage = ['image/jpeg', 'image/png', 'image/tiff'].includes(file.mimetype) || 
                    ['.jpg', '.jpeg', '.png', '.tiff'].includes(path.extname(file.originalname).toLowerCase());
    
    if (isImage) {
      await enqueueVisionJob(fileId, file.originalname, projId);
    }

    return res.status(201).json({
      message: 'File uploaded and logged successfully',
      file: {
        id: fileId,
        name: file.originalname,
        url: fileUrl,
        version,
        type: file.mimetype
      }
    });
  } catch (err: any) {
    logger.error(`Error uploading file: ${err.message}`);
    return res.status(500).json({ error: 'Server error during upload handling' });
  }
});

// Retrieve files for a project
router.get('/project/:projectId', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const projId = parseInt(req.params.projectId);
  if (isNaN(projId)) return res.status(400).json({ error: 'Invalid project ID' });

  try {
    if (isPostgresConnected && pgPool) {
      const result = await pgPool.query('SELECT * FROM files WHERE project_id = $1 ORDER BY uploaded_at DESC', [projId]);
      return res.json({ files: result.rows });
    } else {
      const files = mockDb.files.filter(f => f.project_id === projId);
      return res.json({ files });
    }
  } catch (err: any) {
    logger.error(`Error fetching project files: ${err.message}`);
    return res.status(500).json({ error: 'Server error fetching project files' });
  }
});

export default router;
