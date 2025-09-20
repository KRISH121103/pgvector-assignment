import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

function cosineSimilarity(vecA, vecB) {
  const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dot / (magA * magB);
}

const chunksFile = path.join(process.cwd(), 'src', 'chunks.json');
let allChunks = JSON.parse(fs.readFileSync(chunksFile, 'utf-8'));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 120000
});

// ⚡ Precompute embeddings in batches
async function precomputeChunkEmbeddings(batchSize = 50) {
  console.log(`⚡ Computing embeddings in batches of ${batchSize}...`);
  for (let i = 0; i < allChunks.length; i += batchSize) {
    const batch = allChunks.slice(i, i + batchSize);
    const textsToEmbed = batch.map(chunk => chunk.content);

    try {
      const res = await client.embeddings.create({
        model: "text-embedding-3-small",
        input: textsToEmbed
      });

      res.data.forEach((item, idx) => {
        batch[idx].embedding = item.embedding;
      });

      console.log(`✅ Batch ${i / batchSize + 1} embeddings saved`);
    } catch (err) {
      console.error(`❌ Error embedding batch ${i / batchSize + 1}:`, err);
    }
  }

  fs.writeFileSync(chunksFile, JSON.stringify(allChunks, null, 2));
  console.log("🎉 All chunk embeddings saved to chunks.json!");
}

// 🔹 Search chunks using embeddings
async function searchChunks(query, topK = 5) {
  const queryRes = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: query
  });
  const queryEmbedding = queryRes.data[0].embedding;

  const results = allChunks
    .filter(c => c.embedding) // only consider chunks with embeddings
    .map(chunk => {
      const score = cosineSimilarity(queryEmbedding, chunk.embedding);
      return { ...chunk, score };
    });
    console.log("Results:", results)

  return results.sort((a, b) => b.score - a.score).slice(0, topK);
}

// RAG Agent
async function runAgent(userQuery) {
  const relevantChunks = await searchChunks(userQuery);
  const contextText = relevantChunks.map(c => `[${c.metadata.year}] ${c.content}`).join('\n\n');

  const systemPrompt = `
You are a knowledgeable financial analyst specializing in Warren Buffett's investment philosophy.
Always answer based on the provided shareholder letters content.
If info is missing, state that clearly.
Provide year-specific context and cite the source document when possible.
`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Question: ${userQuery}\n\nContext:\n${contextText}` }
      ],
      temperature: 0.2
    });
    return response.choices[0].message.content;
  } catch (err) {
    console.error("❌ OpenAI request failed:", err);
    return "Sorry, I couldn't get a response. Try again later.";
  }
}

// Example run
async function runTest() {
  const userQuery = "What did Berkshire acquire in 2023?";
  console.log("🤖 User Query:\n", userQuery);

  // 1️⃣ Precompute embeddings in batches
  await precomputeChunkEmbeddings();

  // 2️⃣ Run RAG agent
  const answer = await runAgent(userQuery);
  console.log("\n🧠 Agent Response:\n", answer);
}

runTest();
