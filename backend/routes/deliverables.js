const express = require('express');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');

const router = express.Router();

function addIfExists(archive, absPath, nameInZip) {
  if (!fs.existsSync(absPath)) return;
  const stats = fs.statSync(absPath);
  if (stats.isDirectory()) archive.directory(absPath, nameInZip);
  else archive.file(absPath, { name: nameInZip });
}

// NOTE: Do NOT prefix with '/api' here; app.js already mounts at '/api'
router.get(['/deliverables.zip', '/deliverables'], async (req, res, next) => {
  try {
    const includeSource = req.query.full === '1' || req.query.full === 'true';
    const projectRoot = path.resolve(__dirname, '..', '..');
    const docsDir = path.join(projectRoot, 'docs');
    const dbExportDir = path.join(projectRoot, 'db-export');
    const toolsFile = path.join(projectRoot, 'tools.txt');

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="e-legal-deliverables.zip"');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => next(err));
    archive.pipe(res);

    // Include docs (PPD, RAD, SDD, TestPlan, UserManual)
    addIfExists(archive, docsDir, 'docs');

    // Include DB export if available (mongodump folder)
    addIfExists(archive, dbExportDir, 'db-export');

    // Include tools list if available
    addIfExists(archive, toolsFile, 'tools.txt');

    // Optional: include source code (node_modules/.git/dist excluded)
    if (includeSource) {
      archive.glob('**/*', {
        cwd: projectRoot,
        ignore: [
          '**/node_modules/**',
          '**/.git/**',
          '**/dist/**',
          '**/.vite/**',
          '**/.vscode/**',
          'db-export/**',
          'backend/uploads/**',
          '**/*.log'
        ]
      });
      archive.append('Docs + source (node_modules excluded).\n', { name: 'README_DELIVERABLES.txt' });
    }

    await archive.finalize();
  } catch (err) {
    next(err);
  }
});

module.exports = router;// ...existing code...
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');

// create app if not already created
const app = express();
app.use(cors());
app.use(express.json());

// serve uploaded files (already needed elsewhere)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MOUNT DELIVERABLES ROUTER (make /api/deliverables.zip work)
const deliverablesRouter = require('./routes/deliverables');
app.use('/api', deliverablesRouter);

// simple health check (optional)
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ...existing code to mount other routers...

// start server (ensure this exists and runs once)
const PORT = process.env.PORT || 5100;
const server = http.createServer(app);
server.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
// ...existing code...// ...existing code...
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');

// create app if not already created
const app = express();
app.use(cors());
app.use(express.json());

// serve uploaded files (already needed elsewhere)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MOUNT DELIVERABLES ROUTER (make /api/deliverables.zip work)
const deliverablesRouter = require('./routes/deliverables');
app.use('/api', deliverablesRouter);

// simple health check (optional)
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ...existing code to mount other routers...

// start server (ensure this exists and runs once)
const PORT = process.env.PORT || 5100;
const server = http.createServer(app);
server.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
// ...existing code...