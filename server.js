require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const multer = require('multer');

// Optional document parsers – loaded lazily so the server still starts even if
// packages are not yet installed (npm install runs in background).
let pdfParse = null;
let mammoth = null;
try { pdfParse = require('pdf-parse'); } catch (_) { console.warn('[server] pdf-parse not installed – PDF extraction unavailable'); }
try { mammoth = require('mammoth'); } catch (_) { console.warn('[server] mammoth not installed – DOCX extraction unavailable'); }

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
    greeting: 'Hi! 👋 Welcome to SafeFood AI. How can I help you with food safety or FSSAI compliance today?',
    default: 'I can help you with FSSAI licensing, hygiene requirements, labeling, packaging, and audit preparation. What would you like to know?',
    dairy: 'Under FSSAI rules, pasteurized milk must always be kept refrigerated below 4°C and usually lasts 2 to 3 days. UHT milk in sealed cartons can be stored at room temperature for up to 90 days until opened. Once opened, it must be refrigerated and used within a few days.',
    distributor: 'Food distributors need an FSSAI State License if their yearly turnover is between ₹12 Lakhs and ₹20 Crores. If turnover is above ₹20 Crores or involves import or export, a Central License is needed. You must also display your 14-digit FSSAI license number on all invoices and bills.',
    jaivik: 'Jaivik Bharat is the official logo used in India for certified organic food products. If you package or sell organic food, you must display both the Jaivik Bharat logo and your FSSAI license number on the pack. Small organic farmers selling directly to customers with turnover under ₹12 Lakhs are exempt.',
    allergen: 'FSSAI requires packaged foods to clearly declare common food allergens in the ingredients list. The main ones include gluten, milk, eggs, fish, peanuts, tree nuts, soybeans, crustaceans, and sulphites. If your product contains any of these, they must be clearly mentioned on the label.'
};

function isGreeting(text) {
    if (!text) return false;
    // Normalize string: lowercase, remove punctuation/emojis to single spaces
    const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const exactGreetings = new Set([
        'hi', 'hello', 'hey', 'hiya', 'howdy', 'namaste', 'greetings', 'yo',
        'good morning', 'good afternoon', 'good evening', 'good day', 'good night',
        'hi there', 'hello there', 'hey there', 'hi safefood', 'hello safefood'
    ]);
    if (exactGreetings.has(clean)) return true;
    return /^(hi|hello|hey|hiya|howdy|namaste|greetings)\s+(there|safefood|bot|assistant|team)?$/.test(clean);
}

// -------------------------------------------------------
// FSSAI Knowledge & Intent Engine (Simple, Clear & Conversational)
// -------------------------------------------------------
function getFSSAIAnswer(query) {
    if (!query) return 'I can help you with FSSAI licensing, hygiene requirements, labeling, packaging, and audit preparation. What would you like to know?';

    if (isGreeting(query)) {
        return fallbackResponses.greeting;
    }

    const q = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

    // 1. Schedule 4 (prioritized before general FSSAI checks)
    if (q.includes('schedule 4') || q.includes('schedule iv') || q.includes('schedule four') || q.includes('schedule4')) {
        if (q.includes('part') || q.includes('detail') || q.includes('more') || q.includes('breakdown') || q.includes('structure') || q.includes('types')) {
            return 'Schedule 4 is divided into five parts based on the type of food business:\n\nPart 1: General hygienic and sanitary practices for petty food businesses.\n\nPart 2: General requirements for all food manufacturing and processing units.\n\nPart 3: Specific hygiene requirements for dairy and milk processing.\n\nPart 4: Specific hygiene requirements for meat and poultry processing.\n\nPart 5: Specific hygiene requirements for catering, food service, and restaurants.\n\nWould you like a specific hygiene checklist for your business?';
        }
        return 'Schedule 4 under FSSAI is the official set of sanitary and hygiene requirements that all food businesses in India must follow.\n\nIt covers basic rules for keeping cooking areas and premises clean, using potable water, ensuring personal hygiene for staff (such as wearing clean aprons and hairnets), maintaining safe food storage temperatures, and preventing pest contamination.';
    }

    // 2. What is FSSAI (with or without why required)
    if (
        q.includes('what is fssai') || q.includes('explain fssai') || q.includes('meaning of fssai') ||
        q.includes('fssai stand for') || q.includes('full form of fssai') || q.includes('who is fssai') ||
        q.includes('about fssai') || q.includes('definition of fssai') || q === 'fssai' ||
        q.startsWith('what is fssai') || q.startsWith('what does fssai')
    ) {
        if (q.includes('why') || q.includes('require') || q.includes('need') || q.includes('purpose') || q.includes('importance')) {
            return 'FSSAI stands for the Food Safety and Standards Authority of India. It is the authority that regulates food safety in India and helps ensure that food businesses follow required safety and quality standards.\n\nFSSAI registration or licensing is required for eligible food businesses so they can legally operate and show that they meet food safety requirements.';
        }
        return 'FSSAI stands for the Food Safety and Standards Authority of India. It is the authority that regulates food safety in India and helps ensure that food businesses follow required safety and quality standards.';
    }

    // 3. Hygiene & Kitchen cleanliness
    if (
        q.includes('hygiene') || q.includes('sanitary') || q.includes('cleanliness') ||
        q.includes('sanitation') || q.includes('kitchen')
    ) {
        return 'Food businesses in India need to follow basic hygiene practices to keep food safe:\n\nKeep kitchen surfaces, cooking utensils, and storage areas clean and sanitized.\n\nUse clean drinking water for all cooking, cleaning, and ice.\n\nEnsure staff wear clean aprons, hairnets, and gloves, wash hands regularly, and stay home if unwell.\n\nStore raw and cooked foods separately, and keep chilled foods below 4°C and frozen foods below -18°C.\n\nWould you like a detailed hygiene checklist for your specific type of business?';
    }

    // 4. How do I prepare for an FSSAI audit / inspection
    if (
        q.includes('audit') || q.includes('inspection') || q.includes('prepare for audit') ||
        q.includes('pass audit') || q.includes('auditor') || q.includes('audit preparation')
    ) {
        return 'To prepare for an FSSAI inspection or audit, here are three main things to check:\n\nDocuments: Keep your FSSAI license displayed, along with recent water test reports, pest control records, staff health checkups, and purchase bills for raw materials.\n\nCleanliness: Make sure cooking and prep areas are clean, pest screens are working, waste bins have lids, and hand-washing stations have soap.\n\nStaff: Ensure your team wears clean hairnets and aprons, checks fridge temperatures daily, and that your trained Food Safety Supervisor is available.\n\nLet me know if you would like me to generate a complete audit checklist for your business.';
    }

    // 5. Which FSSAI license do I need / license categories / eligibility
    if (
        q.includes('which fssai license') || q.includes('which license') || q.includes('what license') ||
        q.includes('license do i need') || q.includes('type of license') || q.includes('types of license') ||
        q.includes('license categories') || q.includes('basic vs state') || q.includes('state or central') ||
        q.includes('license eligibility') || q.includes('which authorization')
    ) {
        return 'The type of license you need depends mostly on your business size and annual turnover:\n\nBasic Registration: For small businesses, street vendors, and startups with an annual turnover of up to ₹12 Lakhs.\n\nState License: For medium-sized food businesses, restaurants, and cloud kitchens with an annual turnover between ₹12 Lakhs and ₹20 Crores.\n\nCentral License: For large food businesses earning over ₹20 Crores, or businesses operating across multiple states, importing, or exporting food.\n\nWhat kind of food business do you run, and what is your approximate turnover? I can help you find the exact license you need.';
    }

    // 6. Why do I need an FSSAI license / why is it required
    if (
        q.includes('why do i need') || q.includes('why is license') || q.includes('why licensing') ||
        (q.includes('why') && (q.includes('license') || q.includes('licence') || q.includes('registration') || q.includes('register'))) ||
        q.includes('benefits of license') || q.includes('benefits of fssai') || q.includes('is license mandatory') ||
        q.includes('penalty without')
    ) {
        return 'You need an FSSAI license because it is legally required for any food business in India, whether you run a restaurant, cloud kitchen, food stall, or packaged food brand.\n\nHaving a license allows you to legally operate, list on platforms like Swiggy and Zomato, build trust with your customers, and avoid legal penalties.';
    }

    // 6. Dairy and Milk shelf life / storage
    if (q.includes('dairy') || q.includes('milk') || q.includes('shelf life') || q.includes('curd') || q.includes('paneer') || q.includes('cheese')) {
        return fallbackResponses.dairy;
    }

    // 7. Food distributor / wholesaler / warehouse
    if (q.includes('distributor') || q.includes('wholesale') || q.includes('wholesaler') || q.includes('warehouse') || q.includes('transport')) {
        return fallbackResponses.distributor;
    }

    // 8. Jaivik Bharat / Organic food
    if (q.includes('jaivik') || q.includes('organic') || q.includes('npop') || q.includes('pgs')) {
        return fallbackResponses.jaivik;
    }

    // 9. Allergen declarations
    if (q.includes('allergen') || q.includes('allergy') || q.includes('allergens') || q.includes('mandatory warning')) {
        return fallbackResponses.allergen;
    }

    // 10. Labeling and packaging rules
    if (q.includes('label') || q.includes('packaging') || q.includes('ingredients list') || q.includes('veg non veg')) {
        return 'Every packaged food product in India must have a clear label showing: the product name, ingredients list, nutrition facts, veg or non-veg green/brown dot, manufacturing and expiry dates, net weight, manufacturer name and address, and the FSSAI logo with your 14-digit license number.';
    }

    // 11. How to apply / FoSCoS portal
    if (q.includes('how to apply') || q.includes('application process') || q.includes('how to get') || q.includes('foscos') || q.includes('apply for license') || q.includes('register online')) {
        return 'You can apply for an FSSAI license online through the official FoSCoS website (foscos.fssai.gov.in). You simply create an account, select your state and food business category, upload your ID and business address proof, pay the government fee, and submit the application.';
    }

    // 12. FoSTaC
    if (q.includes('fostac') || q.includes('food safety supervisor') || q.includes('training')) {
        return 'FoSTaC is an FSSAI training program that requires food businesses to have at least one trained and certified Food Safety Supervisor for every 25 food handlers. This ensures your staff knows proper hygiene, cleaning, and safe food handling practices.';
    }

    // 13. Food Recall
    if (q.includes('recall') || q.includes('unsafe food') || q.includes('adulteration')) {
        return 'If a food product is found to be unsafe or contaminated, the business must stop selling it immediately, inform FSSAI authorities within 24 hours, notify consumers, and pull the affected batch from shelves until the issue is resolved.';
    }

    // 14. What is FSSAI (and why is it required) - only when specifically asking about FSSAI entity
    if (
        q.includes('what is fssai') || q.includes('explain fssai') || q.includes('meaning of fssai') ||
        q.includes('fssai stand for') || q.includes('full form of fssai') || q.includes('who is fssai') ||
        q.includes('about fssai') || q.includes('definition of fssai') || q === 'fssai' ||
        q.startsWith('what is fssai') || q.startsWith('what does fssai')
    ) {
        if (q.includes('why') || q.includes('require') || q.includes('need') || q.includes('purpose') || q.includes('importance')) {
            return 'FSSAI stands for the Food Safety and Standards Authority of India. It is the authority that regulates food safety in India and helps ensure that food businesses follow required safety and quality standards.\n\nFSSAI registration or licensing is required for eligible food businesses so they can legally operate and show that they meet food safety requirements.';
        }
        return 'FSSAI stands for the Food Safety and Standards Authority of India. It is the authority that regulates food safety in India and helps ensure that food businesses follow required safety and quality standards.';
    }

    // 15. Unclear / ambiguous query fallback
    return 'I can help you with FSSAI licensing, hygiene requirements, labeling, packaging, and audit preparation. What would you like to know?';
}

// -------------------------------------------------------
// Chat response sanitizer (ensures clean, plain-text conversational output)
// -------------------------------------------------------
function cleanChatResponse(text) {
    if (!text) return '';
    let cleaned = text;
    // Remove markdown bold / italic formatting: **text** or *text* or __text__ or _text_
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
    cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
    // Remove markdown headings like ### Title or ## Title or # Title
    cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');
    // Remove decorative dashes (-- or ---)
    cleaned = cleaned.replace(/^\s*--+\s*/gm, '');
    cleaned = cleaned.replace(/\s*--+\s*/g, ' ');
    // Remove markdown bullets (* item or - item) at start of lines
    cleaned = cleaned.replace(/^[\*\-]\s+/gm, '');
    // Remove inline backticks
    cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
    // Normalize excessive newlines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
    return cleaned;
}

// -------------------------------------------------------
// FSSAI system prompt for conversational chat
// -------------------------------------------------------
const FSSAI_SYSTEM_PROMPT = `You are an FSSAI regulatory compliance assistant inside a food safety platform called SafeFood AI. You help food businesses (manufacturers, restaurants, cloud kitchens, warehouses, distributors) understand Indian food safety regulations.

COMMUNICATION STYLE AND FORMATTING RULES:
1. SIMPLE, CLEAR & CONVERSATIONAL LANGUAGE:
- Use simple, clear, conversational language instead of sounding like a legal or technical document.
- Avoid dense legalese, statutory citations (such as "under Section 31 of..."), or formal textbook definitions.
- Keep answers concise for simple questions. If the user asks for more details, then provide a more detailed explanation.
- Example:
  "FSSAI stands for the Food Safety and Standards Authority of India. It is the authority that regulates food safety in India and helps ensure that food businesses follow required safety and quality standards.
  FSSAI registration or licensing is required for eligible food businesses so they can legally operate and show that they meet food safety requirements."

2. DIRECT INTENT ANSWERING:
- Always understand the user's specific question and directly answer what they asked.
- NEVER replace your answer with a generic capability message ("I can help you with...") when the user has asked a concrete question.
- The capability summary ("I can help you with...") should ONLY be used if the user's request is completely unclear and clarification is needed.

3. NO MARKDOWN FORMATTING:
- Do not use markdown formatting symbols such as bold (**text**), italics (*text*), headings (#, ##, ###), or decorative dashes (--).
- Do not use excessive bullet points or large headings.
- Never output rigid structured blocks or templates for simple questions.
- Write in clean, natural plain text that is easy to read.

4. GREETINGS AND CASUAL CHAT:
- If the user sends a greeting (such as "Hi", "Hello", "Hey", "Good morning", "Good evening"), respond with a short, warm, natural greeting:
  "Hi! 👋 Welcome to SafeFood AI. How can I help you with food safety or FSSAI compliance today?"
- Do NOT automatically provide licensing, hygiene, labeling, audit, or FoSTaC information on a simple greeting.

5. REGULATORY ACCURACY:
- Maintain complete FSSAI regulatory accuracy for licensing tiers (Registration vs State vs Central), Schedule 4 hygiene standards, testing norms, packaging rules, and mandatory allergen declarations under the Food Safety and Standards Act.
- If specific business scale, turnover, or capacity details are needed to determine an exact license, ask naturally in conversation.
- Do not invent non-existent rules or sections. Do not include boilerplate legal disclaimers.`;

const FSSAI_CHECKLIST_PROMPT = `You are an expert FSSAI food safety auditor in India with in-depth knowledge of Schedule 4 sanitary and hygiene requirements.`;

const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-2.5-flash'];

async function callGemini(contents) {
    if (!genAI) return null;
    for (const modelName of GEMINI_MODELS) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(contents);
            return result.response.text();
        } catch (err) {
            console.error(`[Gemini Error - ${modelName}]`, err.message);
        }
    }
    return null;
}

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

    // Handle simple greetings directly with a warm, natural response
    if (isGreeting(query)) {
        return sendJSON(res, 200, {
            reply: fallbackResponses.greeting,
            source: 'greeting'
        });
    }

    // Use Gemini if available
    if (genAI) {
        const reply = await callGemini([
            { text: FSSAI_SYSTEM_PROMPT + '\n\nUser question: ' + query }
        ]);
        if (reply) {
            const cleanedReply = cleanChatResponse(reply);
            // Verify AI didn't dodge a specific question with a generic capability message
            if (!cleanedReply.includes('What would you like to know') && !cleanedReply.startsWith('I can help you with')) {
                return sendJSON(res, 200, { reply: cleanedReply, source: 'ai' });
            }
        }
    }

    // Intent-based compliance response
    const reply = cleanChatResponse(getFSSAIAnswer(query));
    sendJSON(res, 200, { reply, source: 'intent' });
}

/** POST /api/generate-checklist  { businessType: string } → { items: [{id, text, clause}] } */
async function handleGenerateChecklist(req, res) {
    let body;
    try { body = await readBody(req); }
    catch (e) { return sendJSON(res, 400, { error: 'Invalid request body' }); }

    const businessType = (body.businessType || 'restaurant').trim();

    if (genAI) {
        const prompt = `${FSSAI_CHECKLIST_PROMPT}

Generate exactly 10 FSSAI audit checklist items for a "${businessType}" food business in India.
Return ONLY a valid JSON array (no markdown, no explanation) in this exact format:
[
  { "id": "ai1", "text": "Checklist item text here.", "clause": "FSSAI Ref" },
  ...
]
Make items specific, practical, and directly verifiable during a physical audit.`;

        const reply = await callGemini([{ text: prompt }]);
        if (reply) {
            try {
                let raw = reply.trim();
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

            const reply = await callGemini([
                { text: prompt },
                { inlineData: { mimeType, data: imageBase64 } }
            ]);

            if (!reply) {
                return sendJSON(res, 200, { source: 'fallback', message: 'Label scan fallback' });
            }

            let raw = reply.trim();
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
// Document text extractor
// -------------------------------------------------------
async function extractDocumentText(buffer, mimetype, originalname) {
    const ext = (originalname || '').toLowerCase().split('.').pop();

    // Plain text
    if (mimetype === 'text/plain' || ext === 'txt') {
        return buffer.toString('utf-8');
    }

    // PDF
    if ((mimetype === 'application/pdf' || ext === 'pdf') && pdfParse) {
        try {
            const data = await pdfParse(buffer);
            return data.text || '';
        } catch (e) {
            console.error('[PDF parse error]', e.message);
            return null;
        }
    }

    // DOCX / DOC
    if ((mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
         mimetype === 'application/msword' || ext === 'docx' || ext === 'doc') && mammoth) {
        try {
            const result = await mammoth.extractRawText({ buffer });
            return result.value || '';
        } catch (e) {
            console.error('[DOCX parse error]', e.message);
            return null;
        }
    }

    return null; // unsupported
}

// -------------------------------------------------------
// Handler: POST /api/analyze-document
// -------------------------------------------------------
const DOCUMENT_ANALYSIS_PROMPT = `You are an expert FSSAI food safety auditor with deep knowledge of:
- HACCP (Hazard Analysis Critical Control Points) principles
- FSSAI Schedule 4 sanitary and hygiene requirements
- Good Manufacturing Practices (GMP) for food businesses
- Critical Control Points, temperature monitoring, chemical handling
- Worker hygiene, cleaning/sanitation, pest control
- Required records and documentation under Indian food law

Analyze the following food safety document (SOP, HACCP plan, or inspection report) and return ONLY a valid JSON object (no markdown, no explanation):

{
  "complianceScore": <number 0-100>,
  "haccpAlignment": "<X/10 score + one-word status like 'Excellent' or 'Critical'>",
  "fssaiSchedule4Status": "<one of: Compliant | Satisfactory | Minor Gaps | Critical Gaps | Non-Compliant>",
  "safetyRiskLevel": "<one of: Low Risk | Medium Risk | High Risk | Critical Risk>",
  "complianceGaps": [
    "<gap description 1>",
    "<gap description 2>"
  ],
  "recommendedCorrections": [
    { "title": "<Corrective Clause X.X - Topic>", "text": "<quoted corrective clause text>" }
  ],
  "summary": "<2-sentence overall summary>"
}

Rules:
- Be specific and reference exact clauses or standards
- complianceGaps should list real, verifiable issues found in the document
- recommendedCorrections should provide actionable, FSSAI-compliant corrective language
- If the document is excellent, complianceGaps can be empty and complianceScore near 95-100
- If document text is very short or unclear, still provide best-effort analysis

DOCUMENT TEXT TO ANALYZE:
`;

async function handleAnalyzeDocument(req, res) {
    const multerSingle = upload.single('document');
    multerSingle(req, res, async (err) => {
        if (err) return sendJSON(res, 400, { error: 'File upload error: ' + err.message });

        // No file → check for a text field sent via FormData or plain JSON
        if (!req.file) {
            // multer populates req.body for multipart text fields
            const docText = (req.body && req.body.text) || '';
            if (!docText.trim()) {
                return sendJSON(res, 400, { error: 'No document file or text provided' });
            }
            const filename = (req.body && req.body.filename) || 'Template Document';
            return analyzeTextWithGemini(res, docText, 'template', filename);
        }

        // We have a file
        const file = req.file;
        if (file.size === 0) {
            return sendJSON(res, 400, { error: 'Uploaded file is empty' });
        }

        const docText = await extractDocumentText(file.buffer, file.mimetype, file.originalname);

        if (docText === null) {
            return sendJSON(res, 415, {
                error: `Unsupported file type. Please upload a TXT, PDF, or DOCX file.${
                    file.mimetype.includes('pdf') && !pdfParse ? ' (pdf-parse package not ready)' : ''
                }`
            });
        }

        if (!docText.trim()) {
            return sendJSON(res, 422, { error: 'Could not extract any text from the uploaded file. The document may be empty, image-only, or corrupted.' });
        }

        return analyzeTextWithGemini(res, docText, 'upload', file.originalname);
    });
}

async function analyzeTextWithGemini(res, docText, source, filename) {
    if (genAI) {
        const prompt = DOCUMENT_ANALYSIS_PROMPT + docText.substring(0, 12000); // cap at 12k chars
        const reply = await callGemini([{ text: prompt }]);
        if (reply) {
            try {
                let raw = reply.trim();
                raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
                const analysis = JSON.parse(raw);
                return sendJSON(res, 200, { source: 'ai', analysis, filename });
            } catch (parseErr) {
                console.error('[Document Analysis JSON parse error]', parseErr.message, reply.substring(0, 200));
            }
        }
    }
    // Fallback: return signal to use template data
    return sendJSON(res, 200, { source: 'fallback', filename });
}

// -------------------------------------------------------
// Handler: POST /api/recall-assessment
// -------------------------------------------------------
const RECALL_ASSESSMENT_PROMPT = `You are an expert food safety scientist and FSSAI recall coordinator.
Analyze the following food recall risk scenario and return ONLY a valid JSON object (no markdown, no explanation):

{
  "recallRiskScore": <number 0-100>,
  "contaminationSeverity": "<one of: Minimal | Low | Moderate | High | Critical>",
  "recallClassification": "<one of: Class I - Dangerous | Class II - May Cause Adverse Effects | Class III - Unlikely to Cause Harm | No Recall Needed>",
  "recallNecessity": "<one of: Immediate Mandatory Recall | Precautionary Voluntary Recall | Corrective Action Without Recall | Monitor Only>",
  "supplierRiskRating": "<one of: Low | Moderate | High | Critical>",
  "correctiveActions": [
    "<action 1>",
    "<action 2>",
    "<action 3>"
  ],
  "quarantineInstructions": "<specific quarantine instructions for the batch>",
  "supplierNotification": "<professional 3-4 sentence notification message to send to the supplier>",
  "summary": "<2-sentence summary of the risk assessment>"
}

Rules:
- recallRiskScore near 80-100 means immediate recall likely needed
- recallRiskScore near 40-60 means precautionary or corrective action
- recallRiskScore below 30 means monitor only
- Consider pathogen type, temperature abuse, traceability gaps, and incident description
- Salmonella and Listeria in RTE foods = Class I
- E. coli O157:H7 in any food = Class I
- supplierNotification must be professional and formal

RECALL SCENARIO TO ANALYZE:
`;

async function handleRecallAssessment(req, res) {
    let body;
    try { body = await readBody(req); }
    catch (e) { return sendJSON(res, 400, { error: 'Invalid request body' }); }

    const {
        supplierInfo = '',
        batchInfo = '',
        pathogenInfo = '',
        temperatureInfo = '',
        traceabilityInfo = '',
        incidentDescription = ''
    } = body;

    const scenarioText = `
Supplier Information: ${supplierInfo}
Batch Information: ${batchInfo}
Pathogen / Contamination: ${pathogenInfo}
Temperature Excursions: ${temperatureInfo}
Traceability: ${traceabilityInfo}
Incident Description: ${incidentDescription}
`.trim();

    if (!scenarioText.replace(/[:\n\s]/g, '').trim()) {
        return sendJSON(res, 400, { error: 'Please provide at least some scenario details for assessment' });
    }

    if (genAI) {
        const prompt = RECALL_ASSESSMENT_PROMPT + scenarioText;
        const reply = await callGemini([{ text: prompt }]);
        if (reply) {
            try {
                let raw = reply.trim();
                raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
                const assessment = JSON.parse(raw);
                return sendJSON(res, 200, { source: 'ai', assessment });
            } catch (parseErr) {
                console.error('[Recall Assessment JSON parse error]', parseErr.message);
            }
        }
    }

    // Fallback assessment
    return sendJSON(res, 200, {
        source: 'fallback',
        assessment: {
            recallRiskScore: 72,
            contaminationSeverity: 'High',
            recallClassification: 'Class I - Dangerous',
            recallNecessity: 'Immediate Mandatory Recall',
            supplierRiskRating: 'High',
            correctiveActions: [
                'Immediately quarantine all units of the affected batch from distribution channels.',
                'Notify FSSAI regional office within 24 hours as per Food Safety and Standards Act Section 28.',
                'Conduct environmental swab testing across all production surfaces and equipment.',
                'Issue public recall notice via approved FSSAI communication channels.',
                'Review and update HACCP plan and supplier qualification procedures.'
            ],
            quarantineInstructions: 'Place all units of the affected batch under physical lock with a "QUARANTINE – DO NOT USE" label. Restrict access to authorized QA personnel only. Maintain cold chain if applicable. Document all batch numbers, production dates, and distribution records.',
            supplierNotification: 'This is an urgent safety notification regarding a potential contamination risk identified in your supplied batch. Following FSSAI protocols, we are initiating an immediate quarantine and recall investigation. You are required to halt distribution of all units from this production run and cooperate fully with our quality assurance team within 24 hours. Please preserve all batch records, raw material certificates, and production logs for review.',
            summary: 'AI Gemini service is temporarily unavailable. This fallback assessment indicates a high-risk scenario requiring immediate action based on general food safety principles.'
        }
    });
}

// -------------------------------------------------------
// Handler: POST /api/voice-assistant
// -------------------------------------------------------
const VOICE_ASSISTANT_PROMPTS = {
    'en-IN': `You are a food safety voice assistant for factory floor audits in India. The user is a QA auditor or floor supervisor speaking hands-free. Respond in clear, plain English. Your answer must be 2-3 sentences maximum, under 50 words, with no markdown, no bullet points, no headings. Focus only on food safety, FSSAI regulations, hygiene, HACCP, and factory audit situations.

User query: `,
    'hi-IN': `आप भारत में फैक्ट्री फ्लोर ऑडिट के लिए एक खाद्य सुरक्षा वॉयस असिस्टेंट हैं। उपयोगकर्ता एक QA ऑडिटर या फ्लोर सुपरवाइजर है। स्पष्ट हिंदी में उत्तर दें। उत्तर अधिकतम 2-3 वाक्य होना चाहिए, 50 शब्दों से कम। कोई मार्कडाउन या बुलेट पॉइंट नहीं। केवल खाद्य सुरक्षा, FSSAI नियम, स्वच्छता और HACCP पर ध्यान दें।

उपयोगकर्ता का प्रश्न: `,
    'ta-IN': `நீங்கள் இந்தியாவில் தொழிற்சாலை தள தணிக்கைகளுக்கான உணவு பாதுகாப்பு குரல் உதவியாளர். பயனர் ஒரு QA தணிக்கையாளர் அல்லது மேற்பார்வையாளர். தெளிவான தமிழில் பதிலளிக்கவும். பதில் அதிகபட்சம் 2-3 வாக்கியங்கள், 50 வார்த்தைகளுக்கும் குறைவாக இருக்க வேண்டும். மார்க்டவுன் வேண்டாம். உணவு பாதுகாப்பு, FSSAI விதிகள், சுகாதாரம் மற்றும் HACCP மட்டுமே கவனிக்கவும்.

பயனர் கேள்வி: `
};

const VOICE_FALLBACK_ANSWERS = {
    'en-IN': 'Under FSSAI Schedule 4, all food handling areas must maintain proper hygiene, temperature control, and pest prevention. Please refer to your facility HACCP plan for specific critical control limits.',
    'hi-IN': 'FSSAI अनुसूची 4 के तहत, सभी खाद्य प्रसंस्करण क्षेत्रों में उचित स्वच्छता, तापमान नियंत्रण और कीट नियंत्रण अनिवार्य है। अधिक जानकारी के लिए अपने HACCP प्लान का संदर्भ लें।',
    'ta-IN': 'FSSAI அட்டவணை 4 படி, அனைத்து உணவு பதப்படுத்தல் பகுதிகளிலும் சரியான சுகாதாரம், வெப்பநிலை கட்டுப்பாடு மற்றும் பூச்சி தடுப்பு கட்டாயம். உங்கள் HACCP திட்டத்தை பார்க்கவும்.'
};

async function handleVoiceAssistant(req, res) {
    let body;
    try { body = await readBody(req); }
    catch (e) { return sendJSON(res, 400, { error: 'Invalid request body' }); }

    const query = (body.query || '').trim();
    const lang = body.lang || 'en-IN';

    if (!query) return sendJSON(res, 400, { error: 'Query is required' });

    const systemPrompt = VOICE_ASSISTANT_PROMPTS[lang] || VOICE_ASSISTANT_PROMPTS['en-IN'];

    if (genAI) {
        const reply = await callGemini([{ text: systemPrompt + query }]);
        if (reply) {
            // Strip any markdown the model might have included
            let cleaned = reply.trim()
                .replace(/\*\*([^*]+)\*\*/g, '$1')
                .replace(/^#{1,6}\s+/gm, '')
                .replace(/^[\*\-]\s+/gm, '')
                .replace(/`([^`]+)`/g, '$1')
                .replace(/\n{2,}/g, ' ')
                .trim();
            return sendJSON(res, 200, { source: 'ai', reply: cleaned, lang });
        }
    }

    const fallback = VOICE_FALLBACK_ANSWERS[lang] || VOICE_FALLBACK_ANSWERS['en-IN'];
    return sendJSON(res, 200, { source: 'fallback', reply: fallback, lang });
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
    if (req.method === 'POST' && urlPath === '/api/analyze-document') {
        return handleAnalyzeDocument(req, res);
    }
    if (req.method === 'POST' && urlPath === '/api/recall-assessment') {
        return handleRecallAssessment(req, res);
    }
    if (req.method === 'POST' && urlPath === '/api/voice-assistant') {
        return handleVoiceAssistant(req, res);
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
