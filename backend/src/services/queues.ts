import { Queue, Worker } from 'bullmq';
import { isPostgresConnected, isRedisConnected, pgPool, mockDb, logger } from '../config/db';
import { runVisionInference, DefectDetection } from './vision';
import { broadcast } from './ws';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// BullMQ Queue instance
let bullQueue: Queue | null = null;
let bullWorker: Worker | null = null;

// Helper to save defects to DB
const saveDefectsToDatabase = async (
  projectId: number,
  fileId: string,
  fileName: string,
  defects: DefectDetection[]
) => {
  const savedDefects: any[] = [];

  for (const defect of defects) {
    // Generate dummy GPS near the project centroid
    let lat = 12.9716;
    let lon = 77.5946;

    if (isPostgresConnected && pgPool) {
      // Get project coordinates
      const projRes = await pgPool.query('SELECT latitude, longitude FROM projects WHERE id = $1', [projectId]);
      if (projRes.rows.length > 0) {
        lat = projRes.rows[0].latitude + (Math.random() - 0.5) * 0.002;
        lon = projRes.rows[0].longitude + (Math.random() - 0.5) * 0.002;
      }
    } else {
      const proj = mockDb.projects.find(p => p.id === projectId);
      if (proj) {
        lat = proj.latitude + (Math.random() - 0.5) * 0.002;
        lon = proj.longitude + (Math.random() - 0.5) * 0.002;
      }
    }

    if (isPostgresConnected && pgPool) {
      const geomPoint = `POINT(${lon} ${lat})`;
      const result = await pgPool.query(
        `INSERT INTO defects (project_id, file_id, type, severity, confidence, suggested_action, gps_latitude, gps_longitude, geom, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ST_GeomFromText($9, 4326), $10)
         RETURNING *`,
        [projectId, fileId, defect.type, defect.severity, defect.confidence, defect.suggested_action, lat, lon, geomPoint, 'Open']
      );
      savedDefects.push(result.rows[0]);

      // Create notification
      await pgPool.query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES ($1, $2, $3, $4)`,
        [1, `Critical Defect Detected!`, `A critical ${defect.type} was identified in ${fileName}.`, 'critical_defect']
      );
    } else {
      // Fallback
      const newDefect = {
        id: mockDb.defects.length + 1,
        project_id: projectId,
        file_id: fileId,
        type: defect.type,
        severity: defect.severity,
        confidence: defect.confidence,
        suggested_action: defect.suggested_action,
        gps_latitude: lat,
        gps_longitude: lon,
        status: 'Open',
        created_at: new Date()
      };
      mockDb.defects.push(newDefect);
      savedDefects.push(newDefect);

      mockDb.notifications.push({
        id: mockDb.notifications.length + 1,
        user_id: 1,
        title: `Critical Defect Detected!`,
        message: `A critical ${defect.type} was identified in ${fileName}.`,
        type: 'critical_defect',
        is_read: false,
        created_at: new Date()
      });
    }
  }

  // Also log raw AI output into MongoDB / Mongoose mock
  const rawAiResult = {
    id: 'ai_' + Math.random().toString(36).substr(2, 9),
    file_id: fileId,
    agent_name: 'VisionAgent_YOLOv8',
    detections: defects,
    timestamp: new Date()
  };

  mockDb.aiAnalysis.push(rawAiResult);
  logger.info(`[Queue Manager] Saved raw AI inference schema in MongoDB store.`);

  // Return saved results
  return savedDefects;
};

// Start the processing job
const processJob = async (jobData: { fileId: string; fileName: string; projectId: number }) => {
  const { fileId, fileName, projectId } = jobData;
  logger.info(`[Queue Worker] Processing file ID: ${fileId} (${fileName})`);
  
  // Run YOLOv8 + OpenCV Vision analysis
  const detections = await runVisionInference(fileName);
  
  // Save findings to DBs
  const defects = await saveDefectsToDatabase(projectId, fileId, fileName, detections);

  // Broadcast completion via WebSockets
  broadcast('AI_ANALYSIS_COMPLETE', {
    projectId,
    fileId,
    fileName,
    defectsDetected: defects.length,
    defects
  });

  logger.info(`[Queue Worker] Completed file analysis for: ${fileId}. Sent WS Broadcast.`);
  return defects;
};

// Initialize Queue system
export const initQueues = () => {
  if (isRedisConnected) {
    try {
      const connectionOpts = {
        host: REDIS_URL.split('@').pop()?.split(':')[0] || 'localhost',
        port: parseInt(REDIS_URL.split(':').pop() || '6379')
      };

      bullQueue = new Queue('vision-analysis', { connection: connectionOpts });
      logger.info('BullMQ Queue registered.');

      bullWorker = new Worker('vision-analysis', async (job) => {
        await processJob(job.data);
      }, { connection: connectionOpts });

      bullWorker.on('completed', (job) => {
        logger.info(`[BullMQ Worker] Job ${job.id} completed successfully.`);
      });

      bullWorker.on('failed', (job, err) => {
        logger.error(`[BullMQ Worker] Job ${job?.id} failed: ${err.message}`);
      });
    } catch (err: any) {
      logger.error(`Error initializing BullMQ: ${err.message}. Defaulting to Memory Queue.`);
      bullQueue = null;
    }
  } else {
    logger.info('Using memory-based job queue emulator.');
  }
};

// Enqueue file for processing
export const enqueueVisionJob = async (fileId: string, fileName: string, projectId: number) => {
  logger.info(`[Queue Manager] Enqueueing Vision Job for: ${fileName}`);

  if (isRedisConnected && bullQueue) {
    await bullQueue.add('analyze-image', { fileId, fileName, projectId });
    logger.info(`[Queue Manager] Enqueued to BullMQ.`);
  } else {
    // Memory Emulation: trigger async callback after a delay
    logger.info(`[Queue Manager] Scheduling in-memory job worker run...`);
    setTimeout(async () => {
      try {
        await processJob({ fileId, fileName, projectId });
      } catch (err: any) {
        logger.error(`In-memory queue worker error: ${err.message}`);
      }
    }, 2000); // 2 seconds delay
  }
};
