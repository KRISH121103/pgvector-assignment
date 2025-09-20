import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';
// import { Document } from '@mastra/core'; // ❌ remove this

const folderPath = path.join(process.cwd(), 'test', 'data');

function chunkText(text, size = 512, overlap = 50) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    chunks.push(text.slice(start, end));
    start += size - overlap;
  }
  return chunks;
}

async function ingestDocuments() {
  if (!fs.existsSync(folderPath)) return [];

  const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.pdf'));
  const allChunks = [];

  for (const file of files) {
    const buffer = fs.readFileSync(path.join(folderPath, file));
    const data = await pdf(buffer);
    const text = data.text;

    const yearMatch = file.match(/\d{4}/);
    const year = yearMatch ? parseInt(yearMatch[0]) : 'unknown';

    const chunks = chunkText(text);

    // ✅ Use plain objects instead of Document constructor
    const docChunks = chunks.map((chunk, index) => ({
      content: chunk,
      metadata: { source: file, year, chunkIndex: index }
    }));

    allChunks.push(...docChunks);
    console.log(`✅ ${file}: ${docChunks.length} chunks created`);
  }

  console.log(`\n🎉 Total chunks ready: ${allChunks.length}`);

  const outputPath = path.join(process.cwd(), 'src', 'data', 'chunks.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(allChunks, null, 2));
  console.log(`✅ Chunks saved to ${outputPath}`);
  return allChunks;
}

ingestDocuments();
