import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SEED_DIR = path.join(__dirname, '../data/seed');
const OUT_FILE = path.join(__dirname, '../data/poi_embeddings.json');

const EMBEDDING_MODEL = "nvidia/nv-embedqa-e5-v5";
const EMBED_URL = "https://integrate.api.nvidia.com/v1/embeddings";

// Read API key from .env.local
const envPath = path.join(__dirname, '../.env.local');
let API_KEY = process.env.NVIDIA_API_KEY;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const match = envContent.match(/NVIDIA_API_KEY=(.*)/);
  if (match) API_KEY = match[1].trim();
}

if (!API_KEY) {
  console.error("No NVIDIA_API_KEY found in .env.local");
  process.exit(1);
}

async function getEmbeddings(texts) {
  const r = await fetch(EMBED_URL, {
    method: "POST",
    headers: { 
      Authorization: `Bearer ${API_KEY}`, 
      "Content-Type": "application/json" 
    },
    body: JSON.stringify({
      input: texts,
      model: EMBEDDING_MODEL,
      input_type: "query",
      encoding_format: "float",
      truncate: "NONE"
    }),
  });
  if (!r.ok) {
    console.error(`Embed API error: ${r.status} ${r.statusText}`);
    return null;
  }
  const d = await r.json();
  const sortedData = [...d.data].sort((a, b) => a.index - b.index);
  return sortedData.map(item => item.embedding);
}

async function main() {
  const files = fs.readdirSync(SEED_DIR).filter(f => f.endsWith('.json'));
  console.log(`Found ${files.length} district files.`);

  const embeddingsCache = {}; // poi_id -> vector

  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(SEED_DIR, file), 'utf-8'));
    if (!data.pois) continue;

    console.log(`Processing ${file} (${data.pois.length} POIs)`);
    
    // Batch process in chunks of 50 to avoid payload size limits
    const CHUNK_SIZE = 50;
    for (let i = 0; i < data.pois.length; i += CHUNK_SIZE) {
      const chunk = data.pois.slice(i, i + CHUNK_SIZE);
      const texts = chunk.map(p => {
        // Construct a semantic description for the embedding
        return `ชื่อ: ${p.name} หมวดหมู่: ${p.category} ${p.categoryTh || ''} ข้อมูล: ${p.th || p.en || ''}`.trim();
      });

      const vectors = await getEmbeddings(texts);
      if (vectors) {
        for (let j = 0; j < chunk.length; j++) {
          embeddingsCache[chunk[j].id] = vectors[j];
        }
      }
      
      // sleep 50ms to avoid rate limits
      await new Promise(r => setTimeout(r, 50));
    }
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(embeddingsCache));
  console.log(`Saved ${Object.keys(embeddingsCache).length} embeddings to ${OUT_FILE}`);
}

main().catch(console.error);
