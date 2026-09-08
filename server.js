require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const multer = require('multer');

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialise Gemini only when a real key is provided
const genAI = GEMINI_API_KEY && GEMINI_API_KEY !== 'your_gemini_api_key_here'
    ? new GoogleGenerativeAI(GEMINI_API_KEY)
    : null;

// multer: store uploads in memory as Buffer so we can base64-encode them
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// -------------------------------------------------------
// Static-file MIME types
// -------------------------------------------------------
const MIME_TYPES = {
    '.html': 'text/html; charset=UTF-8',
    '.css': 'text/css; charset=UTF-8',
    '.js': 'application/javascript; charset=UTF-8',
    '.json': 'application/json; charset=UTF-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf'
};

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------
function sendJSON(res, status, data) {
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=UTF-8',
        'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(data));
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try { resolve(JSON.parse(body)); }
            catch (e) { reject(new Error('Invalid JSON')); }
        });
        req.on('error', reject);
    });
}

// -------------------------------------------------------
// Fallback responses (used when Gemini key is absent/fails)
// -------------------------------------------------------
const fallbackResponses = {
    default: 'According to FSSAI guidelines, compliance depends on your business scale. For general hygiene under Schedule 4, you must maintain clean surfaces, record temperatures, and procure raw materials only from FSSAI-licensed vendors.',
    dairy: 'FSSAI packaging rules mandate that pasteurized milk must be stored below 4°C. Shelf life is typically 2-3 days under refrigeration; UHT milk in aseptic cartons lasts up to 90 days until opened.',
    distributor: 'Food distributors need an FSSAI State License for turnover between ₹12L–₹20Cr. Central License is mandatory above ₹20Cr or for import/export. License number must appear on all invoices.',
    jaivik: 'All organic food packages in India must carry the "Jaivik Bharat" organic logo alongside the FSSAI license number. Exemptions exist only for direct small-producer sales under ₹12L turnover.',
    allergen: 'FSSAI Labelling Regulations 2020 require mandatory declaration for 8 allergen categories: Gluten-containing cereals, Crustaceans, Eggs, Fish, Peanuts/Tree Nuts, Soybeans, Milk, and Sulphites (>10 mg/kg). These must be highlighted in the ingredient list.'
};

function getLocalResponse(query) {
    const q = query.toLowerCase();
    if (q.includes('dairy') || q.includes('milk') || q.includes('shelf life')) return fallbackResponses.dairy;
    if (q.includes('distributor') || q.includes('license') || q.includes('turnover')) return fallbackResponses.distributor;
    if (q.includes('jaivik') || q.includes('organic') || q.includes('logo')) return fallbackResponses.jaivik;
    if (q.includes('allergen') || q.includes('warning') || q.includes('mandatory')) return fallbackResponses.allergen;
    return fallbackResponses.default;
}

// -------------------------------------------------------
// FSSAI system prompt shared across chat routes
// -------------------------------------------------------
const FSSAI_SYSTEM_PROMPT = `You are an expert FSSAI (Food Safety and Standards Authority of India) regulatory compliance assistant embedded in an enterprise food safety platform called SafeFood AI. You help food manufacturers, restaurants, warehouses and distributors understand Indian food safety laws.

Rules:
- Answer ONLY food safety, FSSAI regulations, compliance, labelling, hygiene, and recall-related queries.
- Always cite the relevant FSSAI regulation, Schedule, or Act section when possible.
- Be concise but thorough. Use clear numbered points for multi-part answers.
- If a question is outside food safety, politely redirect to food safety topics.
- Use Indian regulatory context (FSSAI, FSS Act 2006, Schedule 4, etc.), not FDA or EU regulations.
- Keep responses under 200 words unless the question specifically requires detail.`;

// -------------------------------------------------------
// API Route Handlers
// -------------------------------------------------------

/** POST /api/regulatory-chat  { query: string } → { reply: string } */
async function handleRegulatoryChat(req, res) {
    let body;
    try { body = await readBody(req); }
    catch (e) { return sendJSON(res, 400, { error: 'Invalid request body' }); }

    const query = (body.query || '').trim();
    if (!query) return sendJSON(res, 400, { error: 'Query is required' });

    // Use Gemini if available
    if (genAI) {
        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
            const result = await model.generateContent([
                { text: FSSAI_SYSTEM_PROMPT + '\n\nUser question: ' + query }
            ]);
            const reply = result.response.text();
            return sendJSON(res, 200, { reply, source: 'ai' });
        } catch (err) {
            console.error('[Gemini Chat Error]', err.message);
            // Fall through to local fallback
        }
    }

    // Local keyword fallback
    const reply = getLocalResponse(query);
    sendJSON(res, 200, { reply, source: 'fallback' });
}

/** POST /api/generate-checklist  { businessType: string } → { items: [{id, text, clause}] } */
async function handleGenerateChecklist(req, res) {
    let body;
    try { body = await readBody(req); }
    catch (e) { return sendJSON(res, 400, { error: 'Invalid request body' }); }

    const businessType = (body.businessType || 'restaurant').trim();

    if (genAI) {
        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
            const prompt = `${FSSAI_SYSTEM_PROMPT}

Generate exactly 10 FSSAI audit checklist items for a "${businessType}" food business in India.
Return ONLY a valid JSON array (no markdown, no explanation) in this exact format:
[
  { "id": "ai1", "text": "Checklist item text here.", "clause": "FSSAI Ref" },
  ...
]
Make items specific, practical, and directly verifiable during a physical audit.`;

            const result = await model.generateContent([{ text: prompt }]);
            let raw = result.response.text().trim();
            // Strip markdown code fences if present
            raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
            const items = JSON.parse(raw);
            if (Array.isArray(items) && items.length > 0) {
                return sendJSON(res, 200, { items, source: 'ai' });
            }
        } catch (err) {
            console.error('[Gemini Checklist Error]', err.message);
        }
    }

    // Signal to frontend to use its own static data
    sendJSON(res, 200, { items: null, source: 'fallback' });
}

/** POST /api/validate-label  multipart: image file OR JSON { productKey } → validation report */
async function handleValidateLabel(req, res) {
    // Parse multipart form using multer
    const multerSingle = upload.single('labelImage');
    multerSingle(req, res, async (err) => {
        if (err) return sendJSON(res, 400, { error: 'File upload error: ' + err.message });

        // If no file uploaded, signal fallback to dropdown data
        if (!req.file) {
            return sendJSON(res, 200, { source: 'fallback', message: 'No image uploaded, use dropdown data' });
        }

        if (!genAI) {
            return sendJSON(res, 200, {
                source: 'fallback',
                message: 'Gemini API key not configured. Please add GEMINI_API_KEY to .env'
            });
        }

        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

            const imageBase64 = req.file.buffer.toString('base64');
            const mimeType = req.file.mimetype;

            const prompt = `You are an FSSAI food label compliance expert. Analyze this food product label image and validate it against Indian FSSAI regulations.

Extract and validate the following, then return ONLY a valid JSON object (no markdown, no explanation):

{
  "productName": "detected product name",
  "overallBadge": {
    "text": "Approved (XX%) OR Warning (XX%) OR Rejected (XX%)",
    "class": "badge badge-success-glow OR badge badge-warning-glow OR badge badge-danger-glow"
  },
  "nutriPills": [
    { "text": "Nutrient: Value (Status)", "class": "pass OR warn" }
  ],
  "warnings": [
    { "text": "Warning description", "class": "danger-warning OR info-warning" }
  ],
  "mandatory": "Text about mandatory warnings on the label - present or missing",
  "verdict": {
    "class": "verdict-approved OR verdict-warning OR verdict-rejected",
    "icon": "<i class=\\"fa-solid fa-circle-check\\"></i> OR <i class=\\"fa-solid fa-triangle-exclamation\\"></i> OR <i class=\\"fa-solid fa-circle-xmark\\"></i>",
    "title": "APPROVED/WARNING/REJECTED: Brief reason",
    "desc": "1-2 sentence compliance summary"
  },
  "checks": {
    "fssaiLicensePresent": true/false,
    "expiryDatePresent": true/false,
    "ingredientsPresent": true/false,
    "nutritionFactsPresent": true/false,
    "netWeightPresent": true/false,
    "manufacturerInfoPresent": true/false,
    "allergenDeclarationPresent": true/false,
    "veganVegNonVegSymbol": "present/missing/not-applicable"
  }
}

Validation rules to apply:
- FSSAI license number must be present
- Manufacturing/Best Before date must be present
- Ingredient list required (all additives must show E-number or INS number)
- Nutritional information per 100g/ml mandatory
- Net weight/volume required
- Manufacturer name and address required
- Mandatory allergen highlighting for: gluten, crustaceans, eggs, fish, peanuts, soybeans, milk, sulphites
- Caffeine >145mg/L in carbonated drinks needs explicit warning
- Infant food must state "Use only under medical advice"
- Red/green/brown dot (veg/non-veg marker) required`;

            const result = await model.generateContent([
                { text: prompt },
                { inlineData: { mimeType, data: imageBase64 } }
            ]);

            let raw = result.response.text().trim();
            raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

            const report = JSON.parse(raw);
            return sendJSON(res, 200, { source: 'ai', report });

        } catch (err) {
            console.error('[Gemini Vision Error]', err.message);
            return sendJSON(res, 500, { error: 'AI analysis failed: ' + err.message, source: 'error' });
        }
    });
}

// -------------------------------------------------------
// Main HTTP Server
// -------------------------------------------------------
const server = http.createServer((req, res) => {
    const urlPath = req.url.split('?')[0];

    // Health check
    if (urlPath === '/health' || urlPath === '/ping') {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
        if (req.method === 'HEAD') return res.end();
        return res.end(JSON.stringify({ status: 'ok', service: 'SafeFood AI', uptime: Math.floor(process.uptime()), timestamp: new Date().toISOString() }));
    }

    // CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
        return res.end();
    }

    // ---- API Routes ----
    if (req.method === 'POST' && urlPath === '/api/regulatory-chat') {
        return handleRegulatoryChat(req, res);
    }
    if (req.method === 'POST' && urlPath === '/api/generate-checklist') {
        return handleGenerateChecklist(req, res);
    }
    if (req.method === 'POST' && urlPath === '/api/validate-label') {
        return handleValidateLabel(req, res);
    }

    // ---- Static File Serving ----
    const filePath = path.resolve(__dirname, '.' + urlPath);

    // Security: prevent path traversal
    if (!filePath.startsWith(__dirname + path.sep) && filePath !== __dirname) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        return res.end('403 Forbidden');
    }

    // Serve index.html for root
    const finalPath = (urlPath === '/' || urlPath === '')
        ? path.join(__dirname, 'index.html')
        : filePath;

    const ext = path.extname(finalPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(finalPath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                fs.readFile(path.join(__dirname, 'index.html'), (fallbackErr, indexContent) => {
                    if (fallbackErr) {
                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                        res.end('404 Not Found');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
                        res.end(indexContent);
                    }
                });
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('500 Internal Server Error');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    const aiStatus = genAI ? '✓ Gemini AI active' : '⚠ Gemini key missing – using local fallback';
    console.log(`SafeFood AI server running on port ${PORT} | ${aiStatus}`);
});
