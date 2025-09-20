import fs from 'fs';
import path from 'path';

const folderPath = path.join(process.cwd(), 'test', 'data');

if (!fs.existsSync(folderPath)) {
  console.log('Folder not found:', folderPath);
} else {
  const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.pdf'));
  console.log('PDFs in folder:', files);
}
