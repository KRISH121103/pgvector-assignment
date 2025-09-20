import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';
import * as Mastra from '@mastra/core';

const { MDocument } = Mastra; // Mastra document class

// Folder containing your PDFs
const folderPath = path.join(process.cwd(), 'test', 'data');

// Chunking config
const CHUNK_SIZE = 512; // characters or tokens
const CHUNK_OVERLAP = 50;

// Function to split text into overlapping chunks
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

// Main ingestion function
async function ingestDocuments() {
  if (!fs.existsSync(folderPath)) {
    console.error(`❌ Folder not found: ${folderPath}`);
    return [];
  }

  const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.pdf'));
  if (files.length === 0) {
    console.error(`❌ No PDF files found in ${folderPath}`);
    return [];
  }

  const allDocuments = [];

  for (const file of files) {
    const filePath = path.join(folderPath, file);

    try {
      const buffer = fs.readFileSync(filePath);
      const data = await pdf(buffer);
      const text = data.text;

      const yearMatch = file.match(/\d{4}/);
      const year = yearMatch ? parseInt(yearMatch[0]) : 'unknown';

      const chunks = chunkText(text);

      const docChunks = chunks.map((chunk, index) => new MDocument({
        content: chunk,
        metadata: { source: file, year, chunkIndex: index }
      }));

      allDocuments.push(...docChunks);
      console.log(`✅ Ingested ${file} → ${docChunks.length} chunks`);
    } catch (err) {
      console.error(`❌ Error parsing ${file}:`, err);
    }
  }

  console.log(`\n🎉 Total chunks ready for embeddings: ${allDocuments.length}`);
  return allDocuments;
}

// Run the ingestion
ingestDocuments();
