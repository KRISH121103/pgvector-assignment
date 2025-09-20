import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';

// Folder containing PDFs
const folderPath = path.join(process.cwd(), 'data'); 

const CHUNK_SIZE = 512;
const CHUNK_OVERLAP = 50;

// Simple chunking function
function chunkText(text, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    chunks.push(text.slice(start, end));
    start += size - overlap;
  }
  return chunks;
}

// Read and parse PDFs
async function readPDFs() {
  if (!fs.existsSync(folderPath)) {
    console.error(`❌ Folder not found: ${folderPath}`);
    return;
  }

  const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.pdf'));
  if (files.length === 0) {
    console.log(`❌ No PDF files found in ${folderPath}`);
    return;
  }

  console.log(`Found PDFs: ${files.join(', ')}`);

  for (const file of files) {
    const filePath = path.join(folderPath, file);
    try {
      const buffer = fs.readFileSync(filePath);
      const data = await pdf(buffer);
      const text = data.text;

      const chunks = chunkText(text);
      console.log(`\n📄 ${file}: ${chunks.length} chunks`);
      console.log(chunks.slice(0, 2)); // print first 2 chunks as sample

    } catch (err) {
      console.error(`❌ Failed to read ${file}:`, err.message);
    }
  }
}

readPDFs();
