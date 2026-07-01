import { Router, Response } from 'express';
import { isPostgresConnected, pgPool, mockDb, logger } from '../config/db';
import { authenticateJWT, AuthenticatedRequest } from '../middlewares/auth';
import fs from 'fs';
import path from 'path';

const router = Router();

const reportDir = path.join(__dirname, '../../uploads/reports');
if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

// Generate inspection data report
router.post('/generate', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const { projectId, format } = req.body; // format: 'pdf' | 'csv' | 'excel'

  const projId = parseInt(projectId);
  if (isNaN(projId)) return res.status(400).json({ error: 'Missing or invalid project ID' });

  try {
    let project: any = null;
    let defects: any[] = [];

    if (isPostgresConnected && pgPool) {
      const projRes = await pgPool.query('SELECT * FROM projects WHERE id = $1', [projId]);
      if (projRes.rows.length > 0) {
        project = projRes.rows[0];
        const defsRes = await pgPool.query('SELECT * FROM defects WHERE project_id = $1', [projId]);
        defects = defsRes.rows;
      }
    } else {
      project = mockDb.projects.find(p => p.id === projId);
      if (project) {
        defects = mockDb.defects.filter(d => d.project_id === projId);
      }
    }

    if (!project) return res.status(404).json({ error: 'Project not found' });

    const fileName = `Inspection_Report_PRJ_${projId}_${Date.now()}`;
    let fileUrl = '';
    let mimeType = '';
    let content = '';

    // Calculate aggregated metrics
    const criticalCount = defects.filter(d => d.severity === 'Critical').length;
    const highCount = defects.filter(d => d.severity === 'High').length;
    const mediumCount = defects.filter(d => d.severity === 'Medium').length;
    const lowCount = defects.filter(d => d.severity === 'Low').length;

    const riskScore = defects.length > 0 
      ? Math.min(100, Math.round(((criticalCount * 4 + highCount * 3 + mediumCount * 2 + lowCount) / (defects.length * 4)) * 100))
      : 0;

    let riskRating = 'Low Risk';
    if (riskScore > 75) riskRating = 'Critical Risk - Cease Operations';
    else if (riskScore > 50) riskRating = 'High Risk - Accelerate Maintenance';
    else if (riskScore > 25) riskRating = 'Medium Risk';

    if (format === 'csv') {
      mimeType = 'text/csv';
      const fileFullPath = path.join(reportDir, `${fileName}.csv`);
      
      // Build CSV
      let csvContent = 'Defect ID,Type,Severity,Confidence,GPS Latitude,GPS Longitude,Status,Suggested Remediation\n';
      defects.forEach(d => {
        csvContent += `${d.id},${d.type},${d.severity},${(d.confidence * 100).toFixed(0)}%,${d.gps_latitude || d.latitude},${d.gps_longitude || d.longitude},${d.status},"${d.suggested_action.replace(/"/g, '""')}"\n`;
      });
      
      fs.writeFileSync(fileFullPath, csvContent);
      fileUrl = `/uploads/reports/${fileName}.csv`;
    } 
    else if (format === 'excel') {
      mimeType = 'application/vnd.ms-excel';
      const fileFullPath = path.join(reportDir, `${fileName}.xls`);
      
      // Excel XML formatting or basic tab-delimited
      let xlsContent = 'DRONE INTELLIGENCE COMMAND CENTER - EXPORT DATA\r\n';
      xlsContent += `Project: \t${project.name}\r\n`;
      xlsContent += `Client Company:\t${project.company_name}\r\n`;
      xlsContent += `Inspection Type:\t${project.inspection_type}\r\n`;
      xlsContent += `Risk Score:\t${riskScore}% (${riskRating})\r\n\r\n`;
      xlsContent += 'Defect ID\tType\tSeverity\tConfidence\tStatus\tAction\r\n';
      
      defects.forEach(d => {
        xlsContent += `${d.id}\t${d.type}\t${d.severity}\t${(d.confidence * 100).toFixed(0)}%\t${d.status}\t${d.suggested_action}\r\n`;
      });

      fs.writeFileSync(fileFullPath, xlsContent);
      fileUrl = `/uploads/reports/${fileName}.xls`;
    } 
    else { // PDF (simulated structured document)
      mimeType = 'application/pdf';
      const fileFullPath = path.join(reportDir, `${fileName}.pdf`);
      
      // Build structured text-document pretending to be a PDF (renders beautifully in dashboard previews)
      let pdfContent = `========================================================================\n`;
      pdfContent += `              DRONE INTELLIGENCE COMMAND CENTER (DICC) REPORT\n`;
      pdfContent += `========================================================================\n\n`;
      pdfContent += `PROJECT SUMMARY:\n`;
      pdfContent += `------------------------------------------------------------------------\n`;
      pdfContent += `  * Name:            ${project.name}\n`;
      pdfContent += `  * Location:        ${project.location} (Lat: ${project.latitude}, Lon: ${project.longitude})\n`;
      pdfContent += `  * Company:         ${project.company_name}\n`;
      pdfContent += `  * Date Generated:  ${new Date().toLocaleDateString()}\n`;
      pdfContent += `  * Total Defects:   ${defects.length}\n`;
      pdfContent += `  * Safety Status:   ${riskRating} (Index Score: ${riskScore}/100)\n\n`;
      
      pdfContent += `EXECUTIVE SUMMARY:\n`;
      pdfContent += `------------------------------------------------------------------------\n`;
      pdfContent += `  Autonomous drone scanning identified ${defects.length} defect signatures. \n`;
      pdfContent += `  Analysis classifies ${criticalCount} defects as Critical, ${highCount} High, and ${mediumCount} Medium.\n`;
      pdfContent += `  Immediate remediation plans are suggested below to ensure infrastructure integrity.\n\n`;

      pdfContent += `DEFECT INVENTORY MATRICES:\n`;
      pdfContent += `------------------------------------------------------------------------\n`;
      defects.forEach((d, idx) => {
        pdfContent += `  ${idx + 1}. [${d.severity.toUpperCase()} - CONF: ${(d.confidence * 100).toFixed(0)}%] ${d.type.toUpperCase()}\n`;
        pdfContent += `     Location GPS:   (${d.gps_latitude || d.latitude}, ${d.gps_longitude || d.longitude})\n`;
        pdfContent += `     Remediation:    ${d.suggested_action}\n`;
        pdfContent += `     Status:         ${d.status}\n\n`;
      });

      pdfContent += `MAINTENANCE SCHEDULE PLAN:\n`;
      pdfContent += `------------------------------------------------------------------------\n`;
      if (criticalCount > 0) {
        pdfContent += `  [ ] Critical repairs: Schedule within 48 hours.\n`;
      }
      if (highCount > 0) {
        pdfContent += `  [ ] High repairs: Schedule within 14 business days.\n`;
      }
      pdfContent += `  [ ] Standard surveillance: Resume normal scheduled quarterly flights.\n\n`;
      pdfContent += `========================================================================\n`;
      pdfContent += `                        [END OF INSPECTION REPORT]                      \n`;
      pdfContent += `========================================================================\n`;

      fs.writeFileSync(fileFullPath, pdfContent);
      fileUrl = `/uploads/reports/${fileName}.pdf`;
    }

    // Save report reference to DB
    let newReport: any = null;
    const summary = `Compiled ${defects.length} defects. Safety assessment yields ${riskScore}% risk coefficient (${riskRating}).`;
    
    if (isPostgresConnected && pgPool) {
      const result = await pgPool.query(
        `INSERT INTO reports (project_id, name, summary, defect_count, risk_score, pdf_url, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [projId, `${project.name} Inspection Digest`, summary, defects.length, riskScore, fileUrl, req.user?.id || 1]
      );
      newReport = result.rows[0];

      // Add audit activity
      await pgPool.query('INSERT INTO activities (user_id, action, details) VALUES ($1, $2, $3)', [
        req.user?.id,
        'Generate Report',
        `Report generated for project ID ${projId} in format ${format}`
      ]);
    } else {
      // Fallback
      newReport = {
        id: mockDb.reports.length + 1,
        project_id: projId,
        name: `${project.name} Inspection Digest`,
        summary,
        defect_count: defects.length,
        risk_score: riskScore,
        pdf_url: fileUrl,
        created_by: req.user?.id || 1,
        created_at: new Date()
      };
      mockDb.reports.push(newReport);

      mockDb.activities.push({
        id: mockDb.activities.length + 1,
        user_id: req.user?.id || 1,
        action: 'Generate Report',
        details: `Report generated for project ID ${projId} in format ${format} (Fallback DB)`,
        timestamp: new Date()
      });
    }

    return res.status(201).json({
      message: 'Report compiled successfully',
      report: newReport,
      downloadUrl: fileUrl
    });
  } catch (err: any) {
    logger.error(`Error generating report: ${err.message}`);
    return res.status(500).json({ error: 'Server error compiling report files' });
  }
});

// Get reports list
router.get('/project/:projectId', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const projId = parseInt(req.params.projectId);
  if (isNaN(projId)) return res.status(400).json({ error: 'Invalid project ID' });

  try {
    if (isPostgresConnected && pgPool) {
      const result = await pgPool.query('SELECT * FROM reports WHERE project_id = $1 ORDER BY created_at DESC', [projId]);
      return res.json({ reports: result.rows });
    } else {
      const reports = mockDb.reports.filter(r => r.project_id === projId);
      return res.json({ reports });
    }
  } catch (err: any) {
    logger.error(`Error fetching reports: ${err.message}`);
    return res.status(500).json({ error: 'Server error fetching reports list' });
  }
});

export default router;
