import { Pool } from 'pg';
import mongoose from 'mongoose';
import Redis from 'ioredis';
import winston from 'winston';

// Logger instance
export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Environment variables
const PG_URL = process.env.DATABASE_URL || 'postgresql://dicc_admin:dicc_password@localhost:5432/dicc_dev';
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dicc_dev';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Connection States
export let pgPool: Pool | null = null;
export let isPostgresConnected = false;
export let isMongoConnected = false;
export let isRedisConnected = false;

// In-Memory Fallback Databases (to allow running without live databases)
export const mockDb = {
  users: [] as any[],
  projects: [] as any[],
  files: [] as any[],
  defects: [] as any[],
  reports: [] as any[],
  notifications: [] as any[],
  activities: [] as any[],
  chatMessages: [] as any[],
  aiAnalysis: [] as any[],
  riskPredictions: [] as any[]
};

// Seed initial mock data for local testing
const seedMockData = () => {
  // Add a default admin, inspector, and engineer
  // bcrypt hash for 'password123'
  const defaultHash = '$2a$12$R.S4o4Z5uGkS1/x01WcpxOnqQWcZ8JjQd4f5/2HwI/eR8hD0pTzRy';
  
  mockDb.users.push(
    { id: 1, name: 'Admin User', email: 'admin@dicc.com', password_hash: defaultHash, role: 'Admin', verified: true },
    { id: 2, name: 'Inspector User', email: 'inspector@dicc.com', password_hash: defaultHash, role: 'Inspector', verified: true },
    { id: 3, name: 'Engineer User', email: 'engineer@dicc.com', password_hash: defaultHash, role: 'Engineer', verified: true }
  );

  // Add initial projects
  mockDb.projects.push({
    id: 1,
    name: 'Giga Solar Asset Zone A',
    company_name: 'SolarCorp Inc',
    location: 'Bengaluru Outer Ring',
    latitude: 12.9716,
    longitude: 77.5946,
    inspection_type: 'Thermal Solar Inspection',
    priority: 'High',
    description: 'Autonomous flight over Zone A solar panels tracking hot spots and micro-cracks.',
    status: 'In_Progress',
    assigned_members: [2],
    created_at: new Date()
  }, {
    id: 2,
    name: 'Wind Farm Turbine Inspection',
    company_name: 'AeroWind Energy',
    location: 'Chitradurga Hills',
    latitude: 14.2251,
    longitude: 76.3986,
    inspection_type: 'Structural Blade Defect',
    priority: 'Critical',
    description: 'Blade inspection via drone photography for wind turbines. Crack detection required.',
    status: 'Pending',
    assigned_members: [2, 3],
    created_at: new Date()
  });

  // Add initial defects
  mockDb.defects.push({
    id: 1,
    project_id: 1,
    file_id: 'f101',
    type: 'crack',
    severity: 'High',
    confidence: 0.92,
    suggested_action: 'Replace solar cell module in Row 4 Col 12',
    gps_latitude: 12.9720,
    gps_longitude: 77.5950,
    status: 'Open',
    created_at: new Date()
  }, {
    id: 2,
    project_id: 2,
    file_id: 'f102',
    type: 'corrosion',
    severity: 'Critical',
    confidence: 0.88,
    suggested_action: 'Apply anti-corrosion coating to turbine base node 3B',
    gps_latitude: 14.2255,
    gps_longitude: 76.3990,
    status: 'Open',
    created_at: new Date()
  });

  logger.info('In-memory database seeded successfully.');
};

// Initialize Databases
export const initDatabases = async () => {
  seedMockData();

  // 1. PostgreSQL Connection
  try {
    pgPool = new Pool({ connectionString: PG_URL });
    // Verify connection by running a query
    await pgPool.query('SELECT NOW()');
    isPostgresConnected = true;
    logger.info('PostgreSQL connected successfully.');
    
    // Create necessary database tables if they do not exist
    await createPostgresTables();
  } catch (err: any) {
    logger.warn(`PostgreSQL failed to connect: ${err.message}. Falling back to in-memory relational store.`);
    pgPool = null;
    isPostgresConnected = false;
  }

  // 2. MongoDB Connection
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 2000 });
    isMongoConnected = true;
    logger.info('MongoDB connected successfully.');
  } catch (err: any) {
    logger.warn(`MongoDB failed to connect: ${err.message}. Falling back to in-memory document store.`);
    isMongoConnected = false;
  }

  // 3. Redis Connection
  try {
    const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: 1 });
    await new Promise((resolve, reject) => {
      redis.on('connect', resolve);
      redis.on('error', reject);
    });
    isRedisConnected = true;
    logger.info('Redis connected successfully.');
    redis.disconnect();
  } catch (err: any) {
    logger.warn(`Redis failed to connect: ${err.message}. Falling back to memory-based pub/sub & local BullMQ stubs.`);
    isRedisConnected = false;
  }
};

// Create tables in PostgreSQL (if connected)
async function createPostgresTables() {
  if (!pgPool) return;

  const createQueries = [
    `CREATE EXTENSION IF NOT EXISTS postgis;`,
    
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'Engineer',
      verified BOOLEAN NOT NULL DEFAULT FALSE,
      avatar_url VARCHAR(255),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );`,
    
    `CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      company_name VARCHAR(100) NOT NULL,
      location VARCHAR(255) NOT NULL,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      geom GEOMETRY(Point, 4326),
      inspection_type VARCHAR(100),
      priority VARCHAR(50) NOT NULL DEFAULT 'Medium',
      description TEXT,
      status VARCHAR(50) NOT NULL DEFAULT 'Pending',
      assigned_members INT[],
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );`,

    `CREATE TABLE IF NOT EXISTS files (
      id VARCHAR(100) PRIMARY KEY,
      project_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL,
      size INT NOT NULL,
      url VARCHAR(255) NOT NULL,
      folder_path VARCHAR(255) NOT NULL DEFAULT '/',
      version INT NOT NULL DEFAULT 1,
      uploaded_by INT,
      uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
    );`,

    `CREATE TABLE IF NOT EXISTS defects (
      id SERIAL PRIMARY KEY,
      project_id INT NOT NULL,
      file_id VARCHAR(100),
      type VARCHAR(100) NOT NULL,
      severity VARCHAR(50) NOT NULL DEFAULT 'Low',
      confidence DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      suggested_action TEXT,
      gps_latitude DOUBLE PRECISION,
      gps_longitude DOUBLE PRECISION,
      geom GEOMETRY(Point, 4326),
      status VARCHAR(50) NOT NULL DEFAULT 'Open',
      verified_by INT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );`,

    `CREATE TABLE IF NOT EXISTS reports (
      id SERIAL PRIMARY KEY,
      project_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      summary TEXT,
      defect_count INT NOT NULL DEFAULT 0,
      risk_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      pdf_url VARCHAR(255),
      created_by INT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );`,

    `CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(50) NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );`,

    `CREATE TABLE IF NOT EXISTS activities (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL,
      action VARCHAR(255) NOT NULL,
      details TEXT,
      timestamp TIMESTAMP NOT NULL DEFAULT NOW()
    );`
  ];

  for (const query of createQueries) {
    try {
      await pgPool.query(query);
    } catch (err: any) {
      logger.error(`Error executing migration query: ${err.message}`);
    }
  }

  logger.info('PostgreSQL schemas & tables checked/created.');
}
