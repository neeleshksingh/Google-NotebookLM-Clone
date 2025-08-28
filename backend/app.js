require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { pipeline } = require('@xenova/transformers');
const { v4: uuidv4 } = require('uuid');
const { OpenAI } = require('openai');
const faiss = require('faiss-node');

const app = express();
const port = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage });

let embedder;
(async () => {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
})();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const sessions = {};

function chunkText(text, chunkSize = 512, overlap = 128) {
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize - overlap) {
        chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
}

app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const pdfBuffer = req.file.buffer;
        const pdfData = await pdfParse(pdfBuffer);

        const text = pdfData.text;
        if (!text || text.trim().length === 0) {
            throw new Error('No extractable text found in PDF');
        }
        const chunks = chunkText(text);

        const embeddings = await Promise.all(chunks.map(async (chunk, i) => {
            const output = await embedder(chunk, { pooling: 'mean', normalize: true });
            const embedding = Array.from(output.data).map(Number);
            if (!embedding.every(num => typeof num === 'number' && !isNaN(num))) {
                throw new Error(`Invalid embedding format for chunk ${i}`);
            }
            return embedding;
        }));

        console.log('Embeddings count:', embeddings.length);
        console.log('First embedding length:', embeddings[0]?.length || 0);
        console.log('Sample embedding:', embeddings[0]?.slice(0, 10) || []);

        const dimension = embeddings[0]?.length || 384;
        let index;
        let useFaiss = true;
        try {
            index = new faiss.IndexFlatL2(dimension);
        } catch (err) {
            console.error('FAISS initialization error:', err.message);
            useFaiss = false;
        }

        if (useFaiss) {
            const numVectors = embeddings.length;
            const flatEmbeddings = new Float32Array(numVectors * dimension);
            embeddings.forEach((emb, i) => {
                flatEmbeddings.set(emb, i * dimension);
            });

            console.log('Flat embeddings length:', flatEmbeddings.length, 'Expected:', numVectors * dimension);
            console.log('Flat embeddings sample:', Array.from(flatEmbeddings.slice(0, 10)));

            try {
                index.add(flatEmbeddings);
            } catch (err) {
                console.error('FAISS add error:', err.message);
                console.log('Trying plain array as fallback...');
                try {
                    index.add(Array.from(flatEmbeddings));
                } catch (fallbackErr) {
                    console.error('FAISS plain array fallback failed:', fallbackErr.message);
                    useFaiss = false;
                }
            }
        }

        if (!useFaiss) {
            console.warn('Using in-memory vector store as fallback');
            index = {
                embeddings,
                search: (queryVector, k) => {
                    const scores = embeddings.map((emb, i) => {
                        const dot = emb.reduce((sum, val, j) => sum + val * queryVector[j], 0);
                        const normA = Math.sqrt(emb.reduce((sum, val) => sum + val * val, 0));
                        const normB = Math.sqrt(queryVector.reduce((sum, val) => sum + val * val, 0));
                        return { score: dot / (normA * normB), index: i };
                    });
                    return {
                        distances: scores.map(s => 1 - s.score).sort((a, b) => a - b).slice(0, k),
                        indices: scores.sort((a, b) => b.score - a.score).slice(0, k).map(s => s.index),
                    };
                },
            };
        }

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

app.post('/chat', async (req, res) => {
    const { session_id, message } = req.body;
    if (!sessions[session_id]) {
        console.error('Chat error: Session not found for ID:', session_id);
        return res.status(404).json({ error: 'Session not found' });
    }

    try {
        const { index, chunks, metadata } = sessions[session_id];
        console.log('Session data:', { chunksLength: chunks.length, metadataLength: metadata.length, hasIndex: !!index });

        const queryEmbedding = await embedder(message, { pooling: 'mean', normalize: true });
        const queryVector = Array.from(queryEmbedding.data).map(Number);
        if (!queryVector.every(num => typeof num === 'number' && !isNaN(num))) {
            throw new Error('Invalid query embedding format');
        }

        console.log('Query vector length:', queryVector.length);
        console.log('Query vector sample:', queryVector.slice(0, 10));

        const k = 3;
        let indices, distances;
        if (index.search) {
            console.log('Using in-memory vector store for search');
            const result = index.search(queryVector, k);
            console.log('In-memory search result:', result);
            distances = result.distances || [];
            indices = result.indices || [];
        } else {
            console.log('Using FAISS for search');
            const queryFloat = new Float32Array(queryVector);
            console.log('Query Float32Array length:', queryFloat.length, 'Sample:', Array.from(queryFloat.slice(0, 10)));
            try {
                const result = index.search(queryFloat, k);
                console.log('FAISS search result:', result);
                distances = result.distances || [];
                indices = result.indices || [];
            } catch (err) {
                console.error('FAISS search error:', err.message);
                console.log('Trying plain array as fallback...');
                try {
                    const result = index.search(queryVector, k);
                    console.log('FAISS plain array search result:', result);
                    distances = result.distances || [];
                    indices = result.indices || [];
                } catch (fallbackErr) {
                    console.error('FAISS plain array fallback failed:', fallbackErr.message);
                    console.log('Falling back to in-memory vector store');
                    const result = {
                        embeddings: index.ntotal ? Array.from({ length: index.ntotal }, (_, i) => index.reconstruct(i)) : sessions[session_id].chunks.map(() => []),
                        search: (qv, k) => {
                            const embeddings = sessions[session_id].index.embeddings || [];
                            const scores = embeddings.map((emb, i) => {
                                const dot = emb.reduce((sum, val, j) => sum + val * qv[j], 0);
                                const normA = Math.sqrt(emb.reduce((sum, val) => sum + val * val, 0));
                                const normB = Math.sqrt(qv.reduce((sum, val) => sum + val * val, 0));
                                return { score: dot / (normA * normB || 1), index: i };
                            });
                            return {
                                distances: scores.map(s => 1 - s.score).sort((a, b) => a - b).slice(0, k),
                                indices: scores.sort((a, b) => b.score - a.score).slice(0, k).map(s => s.index),
                            };
                        },
                    }.search(queryVector, k);
                    console.log('In-memory fallback result:', result);
                    distances = result.distances || [];
                    indices = result.indices || [];
                }
            }
        }

        if (!Array.isArray(indices) || indices.length === 0) {
            console.warn('No valid search results; returning empty context');
            indices = [];
            distances = [];
        }

        console.log('Search indices:', indices);
        const context = indices.length > 0 ? indices.map(i => chunks[i] || '').join('\n') : 'No relevant context found';
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

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});