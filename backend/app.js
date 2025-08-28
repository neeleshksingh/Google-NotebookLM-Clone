require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { pipeline } = require('@xenova/transformers');
const { v4: uuidv4 } = require('uuid');
const { OpenAI } = require('openai');

const app = express();
const port = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// Limit file size to prevent serverless crashes
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 },
});

let embedder;
async function getEmbedder() {
    if (!embedder) {
        embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }
    return embedder;
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const sessions = {};

function chunkText(text, chunkSize = 512, overlap = 128) {
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize - overlap) {
        chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
}

function createInMemoryIndex(embeddings) {
    return {
        embeddings,
        search: (queryVector, k = 3) => {
            const scores = embeddings.map((emb, i) => {
                const dot = emb.reduce((sum, val, j) => sum + val * queryVector[j], 0);
                const normA = Math.sqrt(emb.reduce((sum, val) => sum + val * val, 0));
                const normB = Math.sqrt(queryVector.reduce((sum, val) => sum + val * val, 0));
                return { score: dot / (normA * normB || 1), index: i };
            });
            return {
                distances: scores.map(s => 1 - s.score).sort((a, b) => a - b).slice(0, k),
                indices: scores.sort((a, b) => b.score - a.score).slice(0, k).map(s => s.index),
            };
        }
    };
}

// Upload endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const pdfBuffer = req.file.buffer;
        const pdfData = await pdfParse(pdfBuffer);

        const text = pdfData.text;
        if (!text || text.trim().length === 0) {
            throw new Error('No extractable text found in PDF');
        }

        const chunks = chunkText(text);
        const embedder = await getEmbedder();

        const embeddings = await Promise.all(chunks.map(async (chunk, i) => {
            const output = await embedder(chunk, { pooling: 'mean', normalize: true });
            const embedding = Array.from(output.data).map(Number);
            if (!embedding.every(num => typeof num === 'number' && !isNaN(num))) {
                throw new Error(`Invalid embedding for chunk ${i}`);
            }
            return embedding;
        }));

        const index = createInMemoryIndex(embeddings);

        const sessionId = uuidv4();
        sessions[sessionId] = {
            index,
            chunks,
            metadata: chunks.map((_, i) => ({ page: Math.floor(i / 2) + 1 })),
        };

        res.json({ session_id: sessionId, message: 'PDF uploaded and indexed' });
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Chat endpoint
app.post('/chat', async (req, res) => {
    const { session_id, message } = req.body;
    const session = sessions[session_id];
    if (!session) return res.status(404).json({ error: 'Session not found' });

    try {
        const { index, chunks, metadata } = session;
        const embedder = await getEmbedder();

        const queryEmbedding = await embedder(message, { pooling: 'mean', normalize: true });
        const queryVector = Array.from(queryEmbedding.data).map(Number);

        const k = 3;
        const result = index.search(queryVector, k);
        const indices = result.indices || [];

        const context = indices.length > 0 ? indices.map(i => chunks[i]).join('\n') : 'No relevant context found';
        const citations = indices.length > 0 ? indices.map(i => metadata[i]?.page || 1) : [];

        const prompt = `Context: ${context}\n\nQuestion: ${message}\nAnswer concisely and reference page numbers where applicable.`;

        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 200,
        });

        res.json({
            response: response.choices[0].message.content,
            citations,
        });
    } catch (err) {
        console.error('Chat error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/', (req, res) => res.status(200).send('Backend OK'));
app.use((req, res) => res.status(404).send('API not found'));

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
