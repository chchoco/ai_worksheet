const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

const cfg = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(cfg);
const db = getFirestore(app, cfg.firestoreDatabaseId);

async function fullSync() {
  console.log('Starting full sync from Firestore...');
  const uploadsDir = path.join(process.cwd(), 'data', 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  // 1. Sync worksheets into data/db.json
  const wsSnap = await getDocs(collection(db, 'worksheets'));
  const dbFile = path.join(process.cwd(), 'data', 'db.json');
  let currentDb = { settings: {}, worksheets: [] };
  if (fs.existsSync(dbFile)) {
    try {
      currentDb = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
    } catch {}
  }

  const firestoreWorksheets = [];
  wsSnap.forEach(d => {
    firestoreWorksheets.push({ id: d.id, ...d.data() });
  });
  console.log('Found', firestoreWorksheets.length, 'worksheets in Firestore.');

  for (const item of firestoreWorksheets) {
    const idx = currentDb.worksheets.findIndex(w => w.id === item.id);
    if (idx >= 0) {
      currentDb.worksheets[idx] = { ...currentDb.worksheets[idx], ...item };
    } else {
      currentDb.worksheets.push(item);
    }
  }
  fs.writeFileSync(dbFile, JSON.stringify(currentDb, null, 2));
  console.log('Updated db.json with total worksheets:', currentDb.worksheets.length);

  // 2. Sync all PDFs from pdf_storage into data/uploads
  const pdfSnap = await getDocs(collection(db, 'pdf_storage'));
  console.log('Found', pdfSnap.size, 'PDF items in pdf_storage.');

  for (const pdfDoc of pdfSnap.docs) {
    const docId = pdfDoc.id;
    console.log('Fetching chunks for:', docId);
    const chunksSnap = await getDocs(collection(db, 'pdf_storage', docId, 'chunks'));
    const chunks = [];
    chunksSnap.forEach(s => chunks.push(s.data()));
    chunks.sort((a, b) => a.index - b.index);
    const buffers = chunks.map(c => Buffer.from(c.data, 'base64'));
    const fullBuffer = Buffer.concat(buffers);
    console.log('Reassembled', docId, 'size:', fullBuffer.length);

    fs.writeFileSync(path.join(uploadsDir, docId), fullBuffer);
    if (!docId.endsWith('.pdf')) {
      fs.writeFileSync(path.join(uploadsDir, docId + '.pdf'), fullBuffer);
    }

    // Match with worksheets
    for (const ws of firestoreWorksheets) {
      const cleanFileName = (ws.pdfFileName || '').replace(/^[\uFEFF\s]+/, '').trim();
      const cleanTitle = (ws.title || '').replace(/^[\uFEFF\s]+/, '').trim();
      if (cleanFileName === docId || docId.includes(cleanTitle) || cleanTitle.includes(docId.replace(/\.pdf$/, ''))) {
        console.log('Matched with worksheet:', ws.id, '-> saving to', ws.id + '.pdf');
        fs.writeFileSync(path.join(uploadsDir, ws.id + '.pdf'), fullBuffer);
      }
    }
  }

  console.log('Sync complete! Uploads directory contents:');
  console.log(fs.readdirSync(uploadsDir));
  process.exit(0);
}

fullSync().catch(err => {
  console.error('fullSync error:', err);
  process.exit(1);
});
