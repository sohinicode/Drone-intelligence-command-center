/// <reference path="../types/pdf-parse.d.ts" />
import { Router, Response } from 'express';
import { mockDb, logger } from '../config/db';
import { authenticateJWT, AuthenticatedRequest } from '../middlewares/auth';
import pdfParse from 'pdf-parse';
import fs from 'fs';

const router = Router();

// ==========================================
// In-Memory Vector Store Emulator
// ==========================================
interface DocumentChunk {
  documentId: string;
  documentName: string;
  text: string;
  pageNumber: number;
}

const vectorStore: DocumentChunk[] = [];

// Index default safety manuals & past reports for Q&A
const indexInitialDocuments = () => {
  vectorStore.push(
    {
      documentId: 'doc_1',
      documentName: 'DICC_Asset_Inspection_Guide_2026.pdf',
      text: 'Industrial drone asset inspection guidelines require scanning solar arrays at 15 meters altitude. Structural defects like micro-cracks on silicon cells present as hot-spots in thermal cameras. Standard maintenance action: modules exceeding 65C during active operation must be scheduled for immediate mechanical replacement.',
      pageNumber: 1
    },
    {
      documentId: 'doc_1',
      documentName: 'DICC_Asset_Inspection_Guide_2026.pdf',
      text: 'Wind turbine blade inspection safety standards outline structural defect levels. Cracks larger than 10cm or positioned near the pitch root node (tip connection zone) are categorized as CRITICAL. Suggested remedy is vacuum infusion repair using epoxy resin. Corrosion on steel towers must be wire-brushed and sealed using zinc-rich epoxy paint.',
      pageNumber: 3
    },
    {
      documentId: 'doc_2',
      documentName: 'Regulator_Safety_Codes_Grid_D.pdf',
      text: 'Power transmission conductor clearances must maintain a minimum 5-meter radial zone from tree branches. Vegetation growth breaching this boundary requires immediate trim operations. Loose or missing vibration dampeners on conductor lines must be replaced within 30 days to avoid catastrophic wind-induced fatigue.',
      pageNumber: 12
    }
  );
  logger.info('Vector store initialized with baseline document chunks.');
};

indexInitialDocuments();

// Chunking helper
const chunkText = (text: string, documentId: string, documentName: string): DocumentChunk[] => {
  const words = text.split(/\s+/);
  const chunks: DocumentChunk[] = [];
  const chunkSize = 100; // words (~500 chars)
  const overlap = 20;

  let pageNumber = 1;
  for (let i = 0; i < words.length; i += (chunkSize - overlap)) {
    const chunkWords = words.slice(i, i + chunkSize);
    if (chunkWords.length === 0) break;
    
    // Simulate page increment every 300 words
    if (i > 0 && i % 300 === 0) pageNumber++;

    chunks.push({
      documentId,
      documentName,
      text: chunkWords.join(' '),
      pageNumber
    });
  }
  return chunks;
};

// Retrieve relevant chunks using simple Jaccard / Token-overlap scoring
const retrieveRelevantChunks = (query: string, k: number = 3): DocumentChunk[] => {
  const queryTokens = new Set(query.toLowerCase().split(/\W+/).filter(t => t.length > 2));
  
  if (queryTokens.size === 0) return vectorStore.slice(0, k);

  const scoredChunks = vectorStore.map(chunk => {
    const chunkTokens = chunk.text.toLowerCase().split(/\W+/);
    let matches = 0;
    
    queryTokens.forEach(token => {
      if (chunkTokens.includes(token)) matches++;
    });

    // Score based on token intersections
    const score = matches / (queryTokens.size + new Set(chunkTokens).size - matches || 1);
    return { chunk, score };
  });

  return scoredChunks
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(item => item.chunk);
};

// ==========================================
// RAG APIs
// ==========================================

// 1. Upload & Index PDF
router.post('/index-pdf', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const { filePath, documentName } = req.body;

  if (!filePath || !documentName) {
    return res.status(400).json({ error: 'Missing parameters: filePath, documentName' });
  }

  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'PDF file not found at local path' });
    }

    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    
    const docId = 'doc_' + Math.random().toString(36).substr(2, 9);
    const newChunks = chunkText(pdfData.text, docId, documentName);
    
    vectorStore.push(...newChunks);
    
    // Log metadata into MongoDB mock
    mockDb.chatMessages.push({
      id: 'rag_' + Math.random().toString(36).substr(2, 9),
      sender: 'system',
      message: `Indexed PDF: ${documentName} (${newChunks.length} chunks added to Vector database)`,
      timestamp: new Date()
    });

    return res.json({ 
      message: 'PDF indexed successfully into ChromaDB emulator', 
      chunksCount: newChunks.length, 
      documentId: docId 
    });
  } catch (err: any) {
    logger.error(`Error in PDF indexing RAG pipeline: ${err.message}`);
    return res.status(500).json({ error: 'RAG error processing document' });
  }
});

// 2. Chat completion RAG query
router.post('/query', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'Missing question parameter' });
  }

  try {
    const qLower = question.toLowerCase();
    let answer = '';
    let sources: string[] = [];

    // Helper: compile current defect database details to enrich answers
    const criticalCount = mockDb.defects.filter(d => d.severity === 'Critical').length;
    const highCount = mockDb.defects.filter(d => d.severity === 'High').length;
    const totalDefects = mockDb.defects.length;
    const openDefects = mockDb.defects.filter(d => d.status === 'Open').length;

    // Check query intent for specific direct queries
    if (qLower.includes('critical') && qLower.includes('defect')) {
      const critDetails = mockDb.defects
        .filter(d => d.severity === 'Critical')
        .map(d => `- [ID ${d.id}] ${d.type} in Project ID ${d.project_id} (GPS: ${d.gps_latitude.toFixed(4)}, ${d.gps_longitude.toFixed(4)}): ${d.suggested_action}`)
        .join('\n');

      answer = `Based on the active inspections, there are currently **${criticalCount} Critical defects** in the system:\n\n${critDetails || 'None detected.'}\n\n*References: Live Database & System Logs.*`;
    } 
    else if (qLower.includes('damaged') && qLower.includes('asset')) {
      const damages = mockDb.defects
        .map(d => `- **${d.type.toUpperCase()}** (${d.severity} severity, Conf: ${(d.confidence * 100).toFixed(0)}%) in project ${d.project_id}. Recommendation: ${d.suggested_action}`)
        .join('\n');

      answer = `Here are the currently identified damaged assets in the command center:\n\n${damages || 'No damage logged.'}\n\nAll inspections are indexed in PostgreSQL.`;
    } 
    else if (qLower.includes('inspections') && qLower.includes('month')) {
      answer = `This month (July 2026), there have been **${mockDb.projects.length} active inspections** scheduled. \n- In Progress: ${mockDb.projects.filter(p => p.status === 'In_Progress').length}\n- Pending: ${mockDb.projects.filter(p => p.status === 'Pending').length}\n- Completed: ${mockDb.projects.filter(p => p.status === 'Completed').length}`;
    }
    else if (qLower.includes('bengaluru')) {
      const bgProjects = mockDb.projects.filter(p => p.location.toLowerCase().includes('bengaluru') || p.location.toLowerCase().includes('bangalore'));
      const details = bgProjects.map(p => `- **${p.name}** at ${p.location} (GPS: ${p.latitude}, ${p.longitude}) - Status: ${p.status}`).join('\n');

      answer = `I found ${bgProjects.length} projects near Bengaluru:\n\n${details || 'No projects currently mapped near Bengaluru.'}`;
    }
    else if (qLower.includes('maintenance') || qLower.includes('recommend')) {
      const recomms = mockDb.defects
        .map(d => `- **${d.type}** (Project ${d.project_id}): ${d.suggested_action}`)
        .join('\n');

      answer = `### Recommended Maintenance Actions:\n\n${recomms || 'No maintenance recommendations found.'}\n\n*Remedies derived from safety guidelines.*`;
    } 
    else {
      // Standard RAG search using token overlap
      const relevantChunks = retrieveRelevantChunks(question, 3);
      sources = relevantChunks.map(c => `${c.documentName} (Page ${c.pageNumber})`);

      if (relevantChunks.length > 0 && relevantChunks[0].text.length > 0) {
        const context = relevantChunks.map(c => `[Source: ${c.documentName}] "${c.text}"`).join('\n\n');
        
        // Mock LLM Prompt building
        answer = `Based on the indexed document sources, here is what I found:\n\n`;
        if (qLower.includes('solar') || qLower.includes('crack')) {
          answer += `Drone thermography identifies silicon cell cracks as thermal hotspots. Maintenance protocol requires panel replacement if cell operating temperatures exceed 65°C under active radiation.`;
        } else if (qLower.includes('wind') || qLower.includes('blade')) {
          answer += `Wind turbine blade cracks larger than 10cm or located close to the pitch root tip joint are marked as Critical. Standard remedy is epoxy resin vacuum infusion repair.`;
        } else if (qLower.includes('tree') || qLower.includes('clearance') || qLower.includes('power')) {
          answer += `Power line clearances mandate a minimum 5-meter distance from tree branches. Standard remedy requires immediate clearance trimmings. Missing spacer dampers must be replaced within 30 days to avoid wire fatigue.`;
        } else {
          answer += `According to the documents: ${relevantChunks[0].text.substring(0, 200)}...`;
        }
        
        answer += `\n\n*Sources cited:*\n` + Array.from(new Set(sources)).map(s => `- ${s}`).join('\n');
      } else {
        answer = `I could not find matching references in the vector store documents. However, looking at the main command center logs, there are currently **${totalDefects} defects** registered, with **${criticalCount} critical** failures needing attention.`;
      }
    }

    // Save query & reply to MongoDB mock ChatMessages collection
    const chatMsgUser = {
      id: 'chat_' + Math.random().toString(36).substr(2, 9),
      sender: 'user',
      message: question,
      timestamp: new Date()
    };

    const chatMsgAi = {
      id: 'chat_' + Math.random().toString(36).substr(2, 9),
      sender: 'ai',
      message: answer,
      sources,
      timestamp: new Date()
    };

    mockDb.chatMessages.push(chatMsgUser, chatMsgAi);

    return res.json({
      answer,
      sources: Array.from(new Set(sources))
    });
  } catch (err: any) {
    logger.error(`Error in RAG query service: ${err.message}`);
    return res.status(500).json({ error: 'Server error querying AI Chat' });
  }
});

// Get chat history logs (Mongo mock)
router.get('/history', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  return res.json({ history: mockDb.chatMessages });
});

export default router;
