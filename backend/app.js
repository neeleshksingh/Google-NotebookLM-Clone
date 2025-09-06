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

// Middleware to get real IP address
app.set('trust proxy', true);

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // Critical fix: Increase to 50MB to match frontend
});

let embedder;
async function getEmbedder() {
    if (!embedder) {
        embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }
    return embedder;
}

// Critical fix: Validate OpenAI API key exists
if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY environment variable is required');
    process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Simple rate limiting to prevent abuse
const uploadTracker = new Map();
const UPLOAD_RATE_LIMIT = 5; // Max 5 uploads per minute per IP
const UPLOAD_WINDOW = 60 * 1000; // 1 minute

function checkUploadRateLimit(ip) {
    const now = Date.now();
    const userUploads = uploadTracker.get(ip) || [];
    
    // Remove old entries
    const recentUploads = userUploads.filter(time => now - time < UPLOAD_WINDOW);
    
    if (recentUploads.length >= UPLOAD_RATE_LIMIT) {
        return false;
    }
    
    recentUploads.push(now);
    uploadTracker.set(ip, recentUploads);
    return true;
}

const sessions = {};

// Critical fix: Session cleanup to prevent memory leaks
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

function cleanupExpiredSessions() {
    const now = Date.now();
    Object.keys(sessions).forEach(sessionId => {
        if (sessions[sessionId] && sessions[sessionId].lastAccessed && 
            (now - sessions[sessionId].lastAccessed) > SESSION_TIMEOUT) {
            console.log(`Cleaning up expired session: ${sessionId}`);
            delete sessions[sessionId];
        }
    });
}

// Run cleanup every hour
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

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
        // Rate limiting check
        const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
        if (!checkUploadRateLimit(clientIP)) {
            return res.status(429).json({ error: 'Too many uploads. Please wait before uploading again.' });
        }
        
        // Critical fix: Validate file exists before processing
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        // Validate file type
        if (req.file.mimetype !== 'application/pdf') {
            return res.status(400).json({ error: 'Only PDF files are allowed' });
        }
        
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
            lastAccessed: Date.now() // Track last access time for cleanup
        };

        res.json({ session_id: sessionId, message: 'PDF uploaded and indexed' });
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Chat endpoint
app.post('/chat', async (req, res) => {
    // Critical fix: Validate input parameters
    const { session_id, message } = req.body;
    
    if (!session_id || typeof session_id !== 'string') {
        return res.status(400).json({ error: 'Valid session_id is required' });
    }
    
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ error: 'Valid message is required' });
    }
    
    const session = sessions[session_id];
    if (!session) return res.status(404).json({ error: 'Session not found' });
    
    // Update last accessed time for session cleanup
    session.lastAccessed = Date.now();

    try {
        const { index, chunks, metadata } = session;
        const embedder = await getEmbedder();

        const queryEmbedding = await embedder(message, { pooling: 'mean', normalize: true });
        const queryVector = Array.from(queryEmbedding.data).map(Number);

        const k = 3;
        const result = index.search(queryVector, k);
        const indices = result.indices || [];

        // Critical fix: Validate indices are within bounds
        const validIndices = indices.filter(i => i >= 0 && i < chunks.length);
        
        const context = validIndices.length > 0 ? validIndices.map(i => chunks[i]).join('\n') : 'No relevant context found';
        const citations = validIndices.length > 0 ? validIndices.map(i => metadata[i]?.page || 1) : [];

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
