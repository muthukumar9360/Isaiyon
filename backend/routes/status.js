import express from 'express';
import { getArchiveCredentials, hasArchiveCredentials } from '../services/archiveService.js';

const router = express.Router();

router.get('/status', (req, res) => {
  const creds = getArchiveCredentials();
  res.json({
    status: 'online',
    server: 'running',
    hasCredentials: hasArchiveCredentials(),
    projectIdentifier: creds.identifier,
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

export default router;
