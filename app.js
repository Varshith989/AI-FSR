/* ----------------------------------------------------
   SafeFood AI - Application Controller
   Core Interactivity, Live Feeds, Scanner and Speech APIs
   ---------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
    // ------------------------------------------------
    // Navigation & Tab Management
    // ------------------------------------------------
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');
    const moduleCards = document.querySelectorAll('.module-card');

    const tabMeta = {
        'dashboard': { title: 'Overview Dashboard', subtitle: 'Real-time enterprise compliance health index' },
        'regulatory': { title: 'Regulatory Compliance Assistant', subtitle: 'Interactive FSSAI helper and audit prep checklists' },
        'doc-intel': { title: 'Safety Document Intelligence', subtitle: 'Scan SOPs and HACCP documentation for FSSAI alignment' },
        'label-val': { title: 'AI Food Label Validator', subtitle: 'Ingredient analysis, nutritional audits and allergen checking' },
        'recall-dash': { title: 'Predictive Safety & Recall Dashboard', subtitle: 'Predictive supplier risk indexing and outbreak monitoring' },
        'voice-agent': { title: 'Multilingual Floor Audit Voice Agent', subtitle: 'Hands-free factory floor audits via speech commands' }
    };

    function switchTab(tabId) {
        // Deactivate all nav items and tabs
        navItems.forEach(item => item.classList.remove('active'));
        tabContents.forEach(tab => tab.classList.remove('active'));

        // Activate selected
        const targetNavItem = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
        const targetTabContent = document.getElementById(`tab-${tabId}`);

        if (targetNavItem && targetTabContent) {
            targetNavItem.classList.add('active');
            targetTabContent.classList.add('active');
            
            // Update Headers
            const meta = tabMeta[tabId];
            pageTitle.textContent = meta.title;
            pageSubtitle.textContent = meta.subtitle;
        }

        // Initialize specific tab actions
        if (tabId === 'recall-dash') {
            initRecallChart();
        }
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = item.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    moduleCards.forEach(card => {
        card.addEventListener('click', () => {
            const tabId = card.getAttribute('data-target');
            switchTab(tabId);
        });
    });


    // ------------------------------------------------
    // Module 1: Regulatory Assistant
    // ------------------------------------------------
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');
    const chipBtns = document.querySelectorAll('.chip-btn');

    const botResponses = {
        'greeting': 'Hi! 👋 Welcome to SafeFood AI. How can I help you with food safety or FSSAI compliance today?',
        'default': 'I can help you with FSSAI licensing, hygiene requirements, labeling, packaging, and audit preparation. What would you like to know?',
        'dairy': 'Under FSSAI rules, pasteurized milk must always be kept refrigerated below 4°C and usually lasts 2 to 3 days. UHT milk in sealed cartons can be stored at room temperature for up to 90 days until opened. Once opened, it must be refrigerated and used within a few days.',
        'distributor': 'Food distributors need an FSSAI State License if their yearly turnover is between ₹12 Lakhs and ₹20 Crores. If turnover is above ₹20 Crores or involves import or export, a Central License is needed. You must also display your 14-digit FSSAI license number on all invoices and bills.',
        'jaivik': 'Jaivik Bharat is the official logo used in India for certified organic food products. If you package or sell organic food, you must display both the Jaivik Bharat logo and your FSSAI license number on the pack. Small organic farmers selling directly to customers with turnover under ₹12 Lakhs are exempt.',
        'allergen': 'FSSAI requires packaged foods to clearly declare common food allergens in the ingredients list. The main ones include gluten, milk, eggs, fish, peanuts, tree nuts, soybeans, crustaceans, and sulphites. If your product contains any of these, they must be clearly mentioned on the label.'
    };

    function isGreeting(text) {
        if (!text) return false;
        const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
        const exactGreetings = new Set([
            'hi', 'hello', 'hey', 'hiya', 'howdy', 'namaste', 'greetings', 'yo',
            'good morning', 'good afternoon', 'good evening', 'good day', 'good night',
            'hi there', 'hello there', 'hey there', 'hi safefood', 'hello safefood'
        ]);
        if (exactGreetings.has(clean)) return true;
        return /^(hi|hello|hey|hiya|howdy|namaste|greetings)\s+(there|safefood|bot|assistant|team)?$/.test(clean);
    }

    function cleanChatMessage(text) {
        if (!text) return '';
        let cleaned = text;
        cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
        cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
        cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');
        cleaned = cleaned.replace(/^\s*--+\s*/gm, '');
        cleaned = cleaned.replace(/\s*--+\s*/g, ' ');
        cleaned = cleaned.replace(/^[\*\-]\s+/gm, '');
        cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
        return cleaned;
    }

    function appendMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        const avatar = document.createElement('div');
        avatar.className = 'msg-avatar';
        avatar.innerHTML = sender === 'bot' ? '<i class="fa-solid fa-robot"></i>' : 'QA';
        
        const bubble = document.createElement('div');
        bubble.className = 'msg-bubble';
        
        const p = document.createElement('p');
        p.textContent = sender === 'bot' ? cleanChatMessage(text) : text;
        
        const time = document.createElement('div');
        time.className = 'msg-time';
        time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        bubble.appendChild(p);
        bubble.appendChild(time);
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(bubble);
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        return messageDiv;
    }

    function getFSSAIAnswer(query) {
        if (!query) return 'I can help you with FSSAI licensing, hygiene requirements, labeling, packaging, and audit preparation. What would you like to know?';

        if (isGreeting(query)) {
            return botResponses.greeting;
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
            return botResponses.dairy;
        }

        // 7. Food distributor / wholesaler / warehouse
        if (q.includes('distributor') || q.includes('wholesale') || q.includes('wholesaler') || q.includes('warehouse') || q.includes('transport')) {
            return botResponses.distributor;
        }

        // 8. Jaivik Bharat / Organic food
        if (q.includes('jaivik') || q.includes('organic') || q.includes('npop') || q.includes('pgs')) {
            return botResponses.jaivik;
        }

        // 9. Allergen declarations
        if (q.includes('allergen') || q.includes('allergy') || q.includes('allergens') || q.includes('mandatory warning')) {
            return botResponses.allergen;
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

    async function handleChatSubmit(query) {
        if (!query.trim()) return;
        
        appendMessage('user', query);
        chatInput.value = '';
        
        // Show typing indicator while waiting
        const indicatorText = isGreeting(query) ? '💬 SafeFood AI is typing...' : '⏳ Consulting FSSAI regulations...';
        const typingIndicator = appendMessage('bot', indicatorText);
        typingIndicator.classList.add('typing-indicator-placeholder');

        try {
            // Call the backend AI route
            const response = await fetch('/api/regulatory-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });

            typingIndicator.remove();

            if (!response.ok) throw new Error('Server error: ' + response.status);

            const data = await response.json();
            appendMessage('bot', data.reply);

        } catch (err) {
            // Network or server error — use local intent fallback
            typingIndicator.remove();
            appendMessage('bot', getFSSAIAnswer(query));
        }
    }

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleChatSubmit(chatInput.value);
    });

    chipBtns.forEach(chip => {
        chip.addEventListener('click', () => {
            const query = chip.getAttribute('data-query');
            handleChatSubmit(query);
        });
    });

    // ------------------------------------------------
    // Checklist Generator
    // ------------------------------------------------
    const btnGenerateChecklist = document.getElementById('btn-generate-checklist');
    const businessSelect = document.getElementById('business-type');
    const checklistItems = document.getElementById('checklist-items');
    const checklistCount = document.getElementById('checklist-count');
    const checklistPercent = document.getElementById('checklist-percent');
    const progressFill = document.getElementById('checklist-progress-fill');
    const checklistActions = document.getElementById('checklist-actions');

    // Modal
    const auditModal = document.getElementById('audit-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnCancelModal = document.getElementById('btn-cancel-modal');
    const btnExportAudit = document.getElementById('btn-export-audit');
    const btnDownloadPdf = document.getElementById('btn-download-pdf');
    const modalBusiness = document.getElementById('modal-business-type');
    const modalPercent = document.getElementById('modal-compliance-percent');
    const modalTicked = document.getElementById('modal-compliance-ticked');
    const modalStatus = document.getElementById('modal-status-badge');

    const checklistData = {
        restaurant: [
            { id: 'r1', text: 'All raw materials sourced from FSSAI registered/licensed vendors.', clause: 'Sec 4.1' },
            { id: 'r2', text: 'Potable water quality checked and test records maintained.', clause: 'Sec 4.2.1' },
            { id: 'r3', text: 'Refrigerators maintaining temperature below 5°C; freezers below -18°C.', clause: 'Sec 4.5.2' },
            { id: 'r4', text: 'Separate cutting boards and knives used for raw/cooked food.', clause: 'Sec 4.3' },
            { id: 'r5', text: 'All food handlers wearing clean aprons, gloves, and hairnets.', clause: 'Sec 4.6.1' },
            { id: 'r6', text: 'Pest control treatment completed and traps logbook active.', clause: 'Sec 4.4.3' },
            { id: 'r7', text: 'Annual health examination records of handlers present.', clause: 'Sec 4.6.2' },
            { id: 'r8', text: 'First-in-First-out (FIFO) inventory method followed.', clause: 'Sec 4.3.2' },
            { id: 'r9', text: 'All food containers labeled with date of preparation.', clause: 'Sec 4.7' },
            { id: 'r10', text: 'Daily cleaning schedule logs signed by floor supervisor.', clause: 'Sec 4.4' }
        ],
        manufacturing: [
            { id: 'm1', text: 'Raw material reception inspection checklist fully updated.', clause: 'Sched 4 Part II' },
            { id: 'm2', text: 'Continuous temperature sensor monitoring validated for boiler.', clause: 'Sec 4.2.3' },
            { id: 'm3', text: 'Clean-In-Place (CIP) systems operational and log updated.', clause: 'Sec 4.4.2' },
            { id: 'm4', text: 'Quarantine area demarcated for substandard raw goods.', clause: 'Sec 4.1.2' },
            { id: 'm5', text: 'Metal detector sensitivity tested hourly with test pieces.', clause: 'Sec 4.3.5' },
            { id: 'm6', text: 'Staff personal hygiene screening conducted at shifts.', clause: 'Sec 4.6' },
            { id: 'm7', text: 'All processing exhaust vents fitted with insect mesh.', clause: 'Sec 4.2.5' },
            { id: 'm8', text: 'All food grade additives verified within maximum limits.', clause: 'Sec 4.5' },
            { id: 'm9', text: 'Batch recall drill conducted and logged within past 12 mos.', clause: 'Sec 4.8' },
            { id: 'm10', text: 'Waste disposal bins kept covered and emptied frequently.', clause: 'Sec 4.4.5' }
        ],
        warehouse: [
            { id: 'w1', text: 'Loading dock clear of water stagnation and clutter.', clause: 'Sec 4.1.1' },
            { id: 'w2', text: 'Cold chain storage records generated continuously.', clause: 'Sec 4.5.1' },
            { id: 'w3', text: 'Pallets placed at least 15cm off floor & 45cm away from walls.', clause: 'Sec 4.2' },
            { id: 'w4', text: 'No chemicals stored in same chamber as food products.', clause: 'Sec 4.3.1' },
            { id: 'w5', text: 'Vehicle sanitization certificates verified before load.', clause: 'Sec 4.7.1' },
            { id: 'w6', text: 'Humidity control logs recorded in dry goods warehouse.', clause: 'Sec 4.5.2' },
            { id: 'w7', text: 'Extermination bait stations inspected and recorded weekly.', clause: 'Sec 4.4.1' },
            { id: 'w8', text: 'Emergency exit paths clear and fire extinguishers operational.', clause: 'Sec 4.2.9' },
            { id: 'w9', text: 'All stored pallets clearly carry Batch IDs & Expire labels.', clause: 'Sec 4.7.2' },
            { id: 'w10', text: 'Visitor entry hygiene protocols signed and enforced.', clause: 'Sec 4.6.3' }
        ]
    };

    function updateChecklistProgress() {
        const total = checklistItems.querySelectorAll('.checklist-item').length;
        const checked = checklistItems.querySelectorAll('.checklist-item input:checked').length;
        
        checklistCount.textContent = `${checked}/${total}`;
        const percentage = total === 0 ? 0 : Math.round((checked / total) * 100);
        checklistPercent.textContent = `${percentage}%`;
        progressFill.style.width = `${percentage}%`;
        
        if (checked > 0) {
            checklistActions.classList.remove('hidden');
        } else {
            checklistActions.classList.add('hidden');
        }
    }

    function renderChecklistItems(items) {
        checklistItems.innerHTML = '';
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'checklist-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = item.id;

            const content = document.createElement('div');
            content.className = 'checklist-item-content';

            const title = document.createElement('span');
            title.className = 'checklist-item-title';
            title.textContent = item.text;

            const clause = document.createElement('span');
            clause.className = 'checklist-item-clause';
            clause.textContent = `FSSAI Code: ${item.clause}`;

            content.appendChild(title);
            content.appendChild(clause);
            div.appendChild(checkbox);
            div.appendChild(content);

            div.addEventListener('click', (e) => {
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change'));
                }
            });
            checkbox.addEventListener('change', updateChecklistProgress);
            checklistItems.appendChild(div);
        });
        updateChecklistProgress();
    }

    btnGenerateChecklist.addEventListener('click', async () => {
        const type = businessSelect.value;
        const staticItems = checklistData[type];

        // Optimistically render static items immediately for instant feedback
        renderChecklistItems(staticItems);

        // Also request AI-generated items in the background
        try {
            const response = await fetch('/api/generate-checklist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ businessType: type })
            });
            if (response.ok) {
                const data = await response.json();
                // If AI returned real items, swap them in
                if (data.source === 'ai' && Array.isArray(data.items) && data.items.length > 0) {
                    renderChecklistItems(data.items);
                }
            }
        } catch (err) {
            // Network error — static items already rendered, nothing to do
        }
    });

    // Modal Control
    btnExportAudit.addEventListener('click', () => {
        const total = checklistItems.querySelectorAll('.checklist-item').length;
        const checked = checklistItems.querySelectorAll('.checklist-item input:checked').length;
        const percentage = Math.round((checked / total) * 100);
        
        const labelMap = {
            restaurant: 'Restaurant & Catering',
            manufacturing: 'Food Manufacturer',
            warehouse: 'Storage & Warehouse'
        };
        
        modalBusiness.textContent = labelMap[businessSelect.value];
        modalPercent.textContent = `${percentage}%`;
        modalTicked.textContent = `${checked}/${total}`;
        
        if (percentage >= 80) {
            modalStatus.textContent = 'Audit Ready';
            modalStatus.className = 'badge badge-success-glow';
        } else if (percentage >= 50) {
            modalStatus.textContent = 'Action Required';
            modalStatus.className = 'badge badge-warning-glow';
        } else {
            modalStatus.textContent = 'Non-Compliant';
            modalStatus.className = 'badge badge-danger-glow';
        }
        
        auditModal.classList.remove('hidden');
    });

    function closeModal() {
        auditModal.classList.add('hidden');
    }

    btnCloseModal.addEventListener('click', closeModal);
    btnCancelModal.addEventListener('click', closeModal);
    auditModal.addEventListener('click', (e) => {
        if (e.target === auditModal) closeModal();
    });

    btnDownloadPdf.addEventListener('click', () => {
        btnDownloadPdf.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Compiling PDF...';
        setTimeout(() => {
            btnDownloadPdf.innerHTML = '<i class="fa-solid fa-circle-check"></i> Report Downloaded';
            alert('Simulation: PDF Safety Audit Report downloaded successfully to your local machine.');
            setTimeout(() => {
                btnDownloadPdf.innerHTML = '<i class="fa-solid fa-download"></i> Download Audit Report PDF';
                closeModal();
            }, 1000);
        }, 1500);
    });


    // ------------------------------------------------
    // Module 2: Document Intelligence
    // ------------------------------------------------
    const templateBtns = document.querySelectorAll('.template-btn');
    const docTitle = document.getElementById('doc-title');
    const docContentViewer = document.getElementById('doc-content-viewer');
    const docComplianceBadge = document.getElementById('doc-compliance-badge');
    const docLoading = document.getElementById('doc-analyzer-loading');
    const docResults = document.getElementById('doc-analyzer-results');
    const haccpAlign = document.getElementById('haccp-align');
    const fssaiAlign = document.getElementById('fssai-align');
    const riskAlign = document.getElementById('risk-align');
    const gapList = document.getElementById('gap-list-items');
    const correctionsList = document.getElementById('corrections-items');
    const uploadZone = document.getElementById('upload-zone');
    const docFileInput = document.getElementById('doc-file-input');

    const templates = {
        'pest-control': {
            title: 'Pest_Control_SOP_v2.txt',
            size: '2.8 KB',
            content: `STANDARD OPERATING PROCEDURE: INSECT AND RODENT CONTROL
Scope: Production Floor & Dry Storage
Status: Active

1. PREVENTIVE DESIGN
1.1 Air curtains must be installed above all exterior access doors.
1.2 Strip curtains must block insect paths in the packaging hall.

2. MONITORING SCHEDULING
2.1 All rodent baits and traps must be checked <mark>twice every calendar month</mark> by the supervisor.
2.2 If bait depletion is noticed, it must be reported to the sanitation lead.

3. CHEMICAL APPLICATIONS
3.1 Insecticide spray treatments must be conducted inside storage bins. <mark>Treatment can take place during standard production shifts</mark> if food products are covered under plastic tarps.

4. LOG RETENTION
4.1 The sanitization contractor must retain chemical application logs for <mark>6 months</mark>.`,
            score: 68,
            haccp: '8/10',
            fssai: 'Critical Gaps',
            risk: 'High Risk',
            gaps: [
                'Weekly checks on rodent traps are mandatory under FSSAI Schedule 4 (currently set to twice monthly).',
                'Pesticide spraying during active production shifts poses massive chemical contamination risks; must only occur post-shift.',
                'FSSAI requires record-keeping retention of sanitization and pest audits for a minimum of 12 months (currently 6 months).'
            ],
            corrections: [
                {
                    title: 'Corrective Clause 2.1 - Trapping Schedule',
                    text: '“Rodent bait stations and mechanical pest traps shall be checked weekly (minimum once every 7 days) by a certified pest controller.”'
                },
                {
                    title: 'Corrective Clause 3.1 - Chemical Application Restrictions',
                    text: '“Chemical spraying or fogging is prohibited in processing areas during active food handling. Operations must halt, and all contact equipment must be sanitized post-treatment before resume.”'
                }
            ]
        },
        'cold-chain': {
            title: 'HACCP_Cold_Chain_Protocol.txt',
            size: '3.4 KB',
            content: `HAZARD ANALYSIS AND CRITICAL CONTROL POINTS (HACCP)
CCP #3: Raw Dairy Chilled Storage
Critical Limit: 4.0 °C Maximum

1. MONITORING PROTOCOL
1.1 Dairy storage chamber temperatures must be read. <mark>Temperatures are manually logged on paper charts at the end of every morning and evening shift</mark> by the warehouse manager.

2. CALIBRATION SCHEDULE
2.1 Primary thermal probe sensors must be calibrated once <mark>every two years</mark> by a certified laboratory vendor.

3. TEMPERATURE EXCURSION CORRECTIVE PLAN
3.1 In the event storage room temperature climbs above 5.0 °C, product refrigeration must be checked. If temperature exceeds 6.0 °C for more than <mark>4 consecutive hours</mark>, raw milk batch must be discarded.`,
            score: 82,
            haccp: '9/10',
            fssai: 'Satisfactory',
            risk: 'Medium Risk',
            gaps: [
                'FSSAI Schedule 4 requires continuous automated temperature logging with warning triggers for critical dairy products instead of twice-daily manual charts.',
                'Sensor calibration intervals (two years) are too sparse; thermal probes should undergo validation every 12 months minimum.'
            ],
            corrections: [
                {
                    title: 'Corrective Clause 1.1 - Automatic Logging System',
                    text: '“Dairy cold rooms shall utilize continuous electronic digital data loggers with cloud backups. Alarms will trigger via email/SMS if temperature registers >4.0°C for over 15 minutes.”'
                }
            ]
        },
        'hygiene': {
            title: 'Hygiene_Sanitization_SOP.txt',
            size: '4.1 KB',
            content: `STANDARD OPERATING PROCEDURE: PERSONAL HYGIENE & VAT SANITIZATION
Scope: Mixing Vats & Handwash Stations

1. EMPLOYEES PROTOCOL
1.1 Handwashing: Staff must wash hands with warm water and soap for 20 seconds.
1.2 Protective Gear: Hairnets and clean uniforms are mandatory before floor entrance.

2. EQUIPMENT WASH ROUTINE
2.1 Mixing vats shall be rinsed daily. <mark>Vats must be scrubbed using hot water only</mark> to clean residual organic compounds.

3. STAFF HEALTH CHECKS
3.1 Any worker displaying symptoms of diarrhea, coughing, or fever must report to QA. <mark>Personnel will return to processing lines immediately</mark> after symptoms stop without clinical clearance certificates.`,
            score: 75,
            haccp: '7/10',
            fssai: 'Satisfactory',
            risk: 'Medium Risk',
            gaps: [
                'Vat cleaning lacks validation: hot water alone does not eradicate bacterial bio-films. Food-grade sanitizing chemical application is missing.',
                'Returning workers displaying contagious symptoms must present medical certification of clearance prior to resuming open food contact work.'
            ],
            corrections: [
                {
                    title: 'Corrective Clause 2.1 - Sanitizer Addition',
                    text: '“Following hot water pre-rinse, vats must be washed with alkaline detergent, rinsed, and sanitized using an FSSAI-approved chlorine solution (100-200 ppm) or Quaternary Ammonium (200 ppm).”'
                },
                {
                    title: 'Corrective Clause 3.1 - Medical Clearance',
                    text: '“Staff recovering from infectious gastrointestinal or respiratory illnesses must be cleared in writing by a registered medical practitioner prior to floor entry.”'
                }
            ]
        }
    };

    // ---- Real AI document analysis renderer ----
    function renderDocAnalysisResult(analysis, fallbackKey) {
        docLoading.classList.add('hidden');
        docResults.classList.remove('hidden');

        const score = analysis.complianceScore;
        docComplianceBadge.innerHTML = `<span class="compliance-score">${score}%</span> Score`;
        const scoreEl = docComplianceBadge.querySelector('.compliance-score');
        if (score >= 85) scoreEl.className = 'compliance-score text-success';
        else if (score >= 70) scoreEl.className = 'compliance-score text-warning';
        else scoreEl.className = 'compliance-score text-danger';

        haccpAlign.textContent = analysis.haccpAlignment || '—';
        fssaiAlign.textContent = analysis.fssaiSchedule4Status || '—';
        riskAlign.textContent = analysis.safetyRiskLevel || '—';

        haccpAlign.className = 'score-card-val text-success';
        fssaiAlign.className = (analysis.fssaiSchedule4Status || '').includes('Critical') || (analysis.fssaiSchedule4Status || '').includes('Non-Compliant')
            ? 'score-card-val text-danger'
            : (analysis.fssaiSchedule4Status || '').includes('Compliant') ? 'score-card-val text-success' : 'score-card-val text-warning';
        riskAlign.className = (analysis.safetyRiskLevel || '').includes('High') || (analysis.safetyRiskLevel || '').includes('Critical')
            ? 'score-card-val text-danger'
            : (analysis.safetyRiskLevel || '').includes('Medium') ? 'score-card-val text-warning' : 'score-card-val text-success';

        gapList.innerHTML = '';
        const gaps = Array.isArray(analysis.complianceGaps) ? analysis.complianceGaps : [];
        if (gaps.length === 0) {
            gapList.innerHTML = '<li class="gap-item" style="color:var(--text-success)"><i class="fa-solid fa-circle-check"></i> <span>No significant compliance gaps detected.</span></li>';
        } else {
            gaps.forEach(gap => {
                const li = document.createElement('li');
                li.className = 'gap-item';
                li.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <span>${gap}</span>`;
                gapList.appendChild(li);
            });
        }

        correctionsList.innerHTML = '';
        const corrections = Array.isArray(analysis.recommendedCorrections) ? analysis.recommendedCorrections : [];
        if (corrections.length === 0) {
            correctionsList.innerHTML = '<div class="correction-card"><span class="correction-title" style="color:var(--text-success)"><i class="fa-solid fa-circle-check"></i> No corrections required</span></div>';
        } else {
            corrections.forEach(corr => {
                const card = document.createElement('div');
                card.className = 'correction-card';
                const title = document.createElement('span');
                title.className = 'correction-title';
                title.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${corr.title}`;
                const code = document.createElement('div');
                code.className = 'correction-text';
                code.textContent = corr.text;
                card.appendChild(title);
                card.appendChild(code);
                correctionsList.appendChild(card);
            });
        }
    }

    function renderDocFallback(docKey) {
        const doc = templates[docKey] || templates['pest-control'];
        docLoading.classList.add('hidden');
        docResults.classList.remove('hidden');
        docComplianceBadge.innerHTML = `<span class="compliance-score">${doc.score}%</span> Score`;
        const scoreEl = docComplianceBadge.querySelector('.compliance-score');
        if (doc.score >= 85) scoreEl.className = 'compliance-score text-success';
        else if (doc.score >= 70) scoreEl.className = 'compliance-score text-warning';
        else scoreEl.className = 'compliance-score text-danger';

        haccpAlign.textContent = doc.haccp; fssaiAlign.textContent = doc.fssai; riskAlign.textContent = doc.risk;
        haccpAlign.className = 'score-card-val text-success';
        fssaiAlign.className = doc.fssai.includes('Critical') ? 'score-card-val text-danger' : 'score-card-val text-warning';
        riskAlign.className = doc.risk.includes('High') ? 'score-card-val text-danger' : (doc.risk.includes('Medium') ? 'score-card-val text-warning' : 'score-card-val text-success');

        gapList.innerHTML = '';
        doc.gaps.forEach(gap => {
            const li = document.createElement('li'); li.className = 'gap-item';
            li.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <span>${gap}</span>`;
            gapList.appendChild(li);
        });
        correctionsList.innerHTML = '';
        doc.corrections.forEach(corr => {
            const card = document.createElement('div'); card.className = 'correction-card';
            const t = document.createElement('span'); t.className = 'correction-title'; t.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${corr.title}`;
            const c = document.createElement('div'); c.className = 'correction-text'; c.textContent = corr.text;
            card.appendChild(t); card.appendChild(c); correctionsList.appendChild(card);
        });
    }

    async function runDocumentAnalysis(docKey) {
        const doc = templates[docKey];

        docResults.classList.add('hidden');
        docLoading.classList.remove('hidden');
        docTitle.textContent = doc.title;
        document.querySelector('.file-size').textContent = doc.size;
        docContentViewer.innerHTML = doc.content;

        try {
            // Strip HTML tags from content to get plain text for the API
            const plainText = doc.content.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/gi, ' ').trim();
            const formData = new FormData();
            formData.append('text', plainText);
            formData.append('filename', doc.title);

            const response = await fetch('/api/analyze-document', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Server error ' + response.status);
            const data = await response.json();

            if (data.source === 'ai' && data.analysis) {
                renderDocAnalysisResult(data.analysis, docKey);
            } else {
                renderDocFallback(docKey);
            }
        } catch (err) {
            console.error('[Doc Analysis Error]', err.message);
            renderDocFallback(docKey);
        }
    }

    templateBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            templateBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const docKey = btn.getAttribute('data-doc');
            runDocumentAnalysis(docKey);
        });
    });

    // Run first analysis initially
    runDocumentAnalysis('pest-control');

    // Drag and Drop styling
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'var(--teal)';
        uploadZone.style.backgroundColor = 'rgba(49, 151, 149, 0.05)';
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.style.borderColor = 'var(--border-glass-active)';
        uploadZone.style.backgroundColor = 'rgba(0, 0, 0, 0.15)';
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'var(--border-glass-active)';
        uploadZone.style.backgroundColor = 'rgba(0, 0, 0, 0.15)';
        const files = e.dataTransfer.files;
        if (files.length > 0) { handleFileUpload(files[0]); }
    });

    uploadZone.addEventListener('click', () => { docFileInput.click(); });

    docFileInput.addEventListener('change', () => {
        if (docFileInput.files.length > 0) { handleFileUpload(docFileInput.files[0]); }
    });

    async function handleFileUpload(file) {
        docResults.classList.add('hidden');
        docLoading.classList.remove('hidden');
        docTitle.textContent = file.name;
        document.querySelector('.file-size').textContent = `${(file.size / 1024).toFixed(1)} KB`;
        docContentViewer.innerHTML = `Uploading and analyzing: "${file.name}"\n\nSending to AI compliance engine...`;

        const acceptedTypes = ['text/plain', 'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        const ext = file.name.split('.').pop().toLowerCase();
        if (!acceptedTypes.includes(file.type) && !['txt','pdf','doc','docx'].includes(ext)) {
            docLoading.classList.add('hidden');
            docResults.classList.remove('hidden');
            gapList.innerHTML = '<li class="gap-item"><i class="fa-solid fa-circle-xmark text-danger"></i> <span>Unsupported file type. Please upload TXT, PDF, or DOCX files only.</span></li>';
            correctionsList.innerHTML = '';
            docComplianceBadge.innerHTML = '<span class="compliance-score text-danger">Error</span>';
            return;
        }

        try {
            const formData = new FormData();
            formData.append('document', file);

            const response = await fetch('/api/analyze-document', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                // Show server error message
                docLoading.classList.add('hidden');
                docResults.classList.remove('hidden');
                gapList.innerHTML = `<li class="gap-item"><i class="fa-solid fa-circle-xmark text-danger"></i> <span>${data.error || 'Analysis failed.'}</span></li>`;
                correctionsList.innerHTML = '';
                docComplianceBadge.innerHTML = '<span class="compliance-score text-danger">Error</span>';
                haccpAlign.textContent = '—'; fssaiAlign.textContent = '—'; riskAlign.textContent = '—';
                return;
            }

            if (data.source === 'ai' && data.analysis) {
                renderDocAnalysisResult(data.analysis, null);
            } else {
                // Fallback: show generic result
                docLoading.classList.add('hidden');
                docResults.classList.remove('hidden');
                docComplianceBadge.innerHTML = '<span class="compliance-score text-warning">78%</span> Score';
                haccpAlign.textContent = '8/10'; fssaiAlign.textContent = 'Minor Gaps'; riskAlign.textContent = 'Low Risk';
                haccpAlign.className = 'score-card-val text-success';
                fssaiAlign.className = 'score-card-val text-warning';
                riskAlign.className = 'score-card-val text-warning';
                gapList.innerHTML = '<li class="gap-item"><i class="fa-solid fa-triangle-exclamation"></i> <span>Document contains general hygiene protocols but lacks specific critical control limit metrics (CCPs).</span></li>';
                correctionsList.innerHTML = '<div class="correction-card"><span class="correction-title"><i class="fa-solid fa-circle-info"></i> Recommendation</span><div class="correction-text">"Please append standard HACCP CCP sheets detailing limits, probe numbers, and safety tolerances at the end of the document."</div></div>';
            }
        } catch (err) {
            console.error('[File Upload Error]', err.message);
            docLoading.classList.add('hidden');
            docResults.classList.remove('hidden');
            gapList.innerHTML = '<li class="gap-item"><i class="fa-solid fa-circle-xmark text-danger"></i> <span>Network error. Could not reach AI analysis server.</span></li>';
            correctionsList.innerHTML = '';
            docComplianceBadge.innerHTML = '<span class="compliance-score text-danger">Error</span>';
        }
    }


    // ------------------------------------------------
    // Module 3: Food Label Validator
    // ------------------------------------------------
    const productSelect = document.getElementById('product-sample');
    const labelImageDisplay = document.getElementById('label-image-display');
    const btnStartScan = document.getElementById('btn-start-scan');
    const scanLaser = document.getElementById('scan-laser');
    const scanningOverlay = document.getElementById('scanning-overlay');
    const scannerWindow = document.getElementById('scanner-window');

    // Report Elements
    const labelBadge = document.getElementById('label-overall-badge');
    const labelAuditBody = document.getElementById('label-audit-body');
    const nutriPillsContainer = document.getElementById('nutri-pills-container');
    const ingredientWarningsContainer = document.getElementById('ingredient-warnings-container');
    const mandatoryWarningsBox = document.getElementById('mandatory-warnings-box');
    const complianceVerdictBox = document.getElementById('compliance-verdict-box');

    // Hidden file input for real image uploads (wired to scanner window click)
    let uploadedImageFile = null;  // holds File object when user uploads
    let uploadedImageBase64 = null; // holds data URL for preview

    const labelFileInput = document.createElement('input');
    labelFileInput.type = 'file';
    labelFileInput.accept = 'image/*';
    labelFileInput.style.display = 'none';
    document.body.appendChild(labelFileInput);

    // Upload trigger hint text (appended to scanner window)
    const uploadHint = document.createElement('div');
    uploadHint.className = 'label-upload-hint';
    uploadHint.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Click to upload your own label image';
    uploadHint.style.cssText = 'position:absolute;bottom:10px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.55);color:#fff;font-size:0.7rem;padding:4px 10px;border-radius:20px;pointer-events:none;white-space:nowrap;z-index:10;';
    scannerWindow.style.position = 'relative';
    scannerWindow.appendChild(uploadHint);

    // Clicking the scanner window opens file picker
    scannerWindow.style.cursor = 'pointer';
    scannerWindow.addEventListener('click', (e) => {
        // Don't trigger if clicking the scan button itself
        if (e.target.closest('#btn-start-scan')) return;
        labelFileInput.click();
    });

    // Handle file selection
    labelFileInput.addEventListener('change', () => {
        const file = labelFileInput.files[0];
        if (!file) return;

        uploadedImageFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedImageBase64 = e.target.result;
            // Show preview in scanner window, replacing mock label graphic
            labelImageDisplay.innerHTML = `<img src="${uploadedImageBase64}" alt="Uploaded label" style="width:100%;height:100%;object-fit:contain;border-radius:6px;">`;
            // Reset report to awaiting scan state
            labelBadge.textContent = 'Ready to Scan';
            labelBadge.className = 'badge badge-orange-glow';
            nutriPillsContainer.innerHTML = '';
            ingredientWarningsContainer.innerHTML = '';
            mandatoryWarningsBox.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Image loaded. Click "Scan Label & Validate Ingredients" to analyse.';
            complianceVerdictBox.className = 'hidden';
        };
        reader.readAsDataURL(file);
        // Reset input so same file can be re-selected
        labelFileInput.value = '';
    });

    const products = {
        'energy-drink': {
            labelHTML: `
                <div class="mock-label">
                    <h4>HYPERVOLT ENERGY</h4>
                    <div class="label-section">
                        <div class="label-row label-bold"><span>Nutrition Facts</span></div>
                        <div class="label-row"><span>Serving Size: 500ml</span></div>
                    </div>
                    <div class="label-section">
                        <div class="label-row label-bold"><span>Amount Per Serving</span></div>
                        <div class="label-row"><span>Calories</span><span>210 kcal</span></div>
                        <div class="label-row"><span>Total Fat</span><span>0g</span></div>
                        <div class="label-row label-bold"><span>Total Sugar</span><span>70g (14%)</span></div>
                        <div class="label-row"><span>Protein</span><span>0g</span></div>
                        <div class="label-row label-bold"><span>Caffeine</span><span>160mg</span></div>
                    </div>
                    <div class="ingredients-box">
                        <strong>Ingredients:</strong> Carbonated Water, High Fructose Corn Syrup, Caffeine, Citric Acid, Taurine, Sodium Benzoate, Yellow 5 (Tartrazine).
                    </div>
                </div>
            `,
            overallBadge: { text: 'Rejected (45%)', class: 'badge badge-danger-glow' },
            nutriPills: [
                { text: 'Sugar: 70g (HIGH)', class: 'warn' },
                { text: 'Caffeine: 320mg/L (CRITICAL)', class: 'warn' },
                { text: 'Fat: 0g (Passed)', class: 'pass' }
            ],
            warnings: [
                { text: 'Caffeine concentration (320 mg/L) violates FSSAI max caffeine cap of 145 mg/L for carbonated drinks.', class: 'danger-warning' },
                { text: 'Contains Yellow 5 (Tartrazine) dye which requires a specific artificial coloring declaration.', class: 'info-warning' }
            ],
            mandatory: '“CONTAINS CAFFEINE. NOT RECOMMENDED FOR CHILDREN, PREGNANT OR LACTATING WOMEN.” - *WARNING STATEMENT MISSING FROM PACKAGE*',
            verdict: {
                class: 'verdict-rejected',
                icon: '<i class="fa-solid fa-circle-xmark"></i>',
                title: 'REJECTED: Regulatory Breach',
                desc: 'Caffeine exceeds carbonated limits and mandatory caffeine health warning statements are missing from labelling.'
            }
        },
        'potato-chips': {
            labelHTML: `
                <div class="mock-label">
                    <h4>SPICY MASALA CHIPS</h4>
                    <div class="label-section">
                        <div class="label-row label-bold"><span>Nutrition Facts</span></div>
                        <div class="label-row"><span>Serving Size: 30g</span></div>
                    </div>
                    <div class="label-section">
                        <div class="label-row label-bold"><span>Amount Per Serving</span></div>
                        <div class="label-row"><span>Total Fat</span><span>11g (17%)</span></div>
                        <div class="label-row"><span>Saturated Fat</span><span>4.5g (23%)</span></div>
                        <div class="label-row"><span>Sodium</span><span>380mg (16%)</span></div>
                        <div class="label-row"><span>Sugars</span><span>0.5g</span></div>
                    </div>
                    <div class="ingredients-box">
                        <strong>Ingredients:</strong> Selected Potatoes, Vegetable Oil, Monosodium Glutamate (MSG), Chili Powder, Garlic Extract, Salt.
                    </div>
                </div>
            `,
            overallBadge: { text: 'Warning (75%)', class: 'badge badge-warning-glow' },
            nutriPills: [
                { text: 'Sodium: 380mg (HIGH)', class: 'warn' },
                { text: 'Saturated Fat: 4.5g (HIGH)', class: 'warn' },
                { text: 'Sugar: 0.5g (Low)', class: 'pass' }
            ],
            warnings: [
                { text: 'Contains MSG (flavour enhancer 621) which is present but not explicitly listed in the allergen warnings block.', class: 'danger-warning' }
            ],
            mandatory: '“CONTAINS ADDED MONOSODIUM GLUTAMATE. NOT RECOMMENDED FOR INFANTS.” - *Present on side, verified.*',
            verdict: {
                class: 'verdict-warning',
                icon: '<i class="fa-solid fa-triangle-exclamation"></i>',
                title: 'WARNING: High Sodium & Saturated Fats',
                desc: 'Label passes legal declarations but ingredients index triggers high sodium/fat warnings which will require front-of-pack red stickers under upcoming mandates.'
            }
        },
        'baby-cereal': {
            labelHTML: `
                <div class="mock-label">
                    <h4>GROWMAX BABY CEREAL</h4>
                    <div class="label-section">
                        <div class="label-row label-bold"><span>Nutrition Facts</span></div>
                        <div class="label-row"><span>Serving Size: 50g</span></div>
                    </div>
                    <div class="label-section">
                        <div class="label-row label-bold"><span>Amount Per Serving</span></div>
                        <div class="label-row"><span>Protein</span><span>6.2g</span></div>
                        <div class="label-row"><span>Sugars</span><span>2g</span></div>
                        <div class="label-row"><span>Iron (Fortified)</span><span>5mg (60%)</span></div>
                        <div class="label-row"><span>Calcium</span><span>120mg</span></div>
                    </div>
                    <div class="ingredients-box">
                        <strong>Ingredients:</strong> Whole Wheat Flour, Skimmed Milk Powder, Honey, Iron Pyrophosphate, Calcium Carbonate.
                    </div>
                </div>
            `,
            overallBadge: { text: 'Approved (96%)', class: 'badge badge-success-glow' },
            nutriPills: [
                { text: 'Added Sugar: 2g (Passed)', class: 'pass' },
                { text: 'Protein: 6.2g (Optimal)', class: 'pass' },
                { text: 'Iron: Fortified (Optimal)', class: 'pass' }
            ],
            warnings: [
                { text: 'Contains Wheat (Gluten) and Milk ingredients. Allergen declaration is correctly highlighted.', class: 'info-warning' }
            ],
            mandatory: '“INFANT FOOD. USE ONLY UNDER MEDICAL ADVICE.” - *Present on front panel, verified.*',
            verdict: {
                class: 'verdict-approved',
                icon: '<i class="fa-solid fa-circle-check"></i>',
                title: 'APPROVED: Fully Compliant',
                desc: 'Excellent nutritional formulation. All allergen callouts and mandatory infant feeding disclaimer sentences are correct.'
            }
        }
    };

    function updateLabelGraphic() {
        const prodKey = productSelect.value;
        labelImageDisplay.innerHTML = products[prodKey].labelHTML;

        // Clear any uploaded image — dropdown change resets to sample mode
        uploadedImageFile = null;
        uploadedImageBase64 = null;

        // Reset analysis reports
        labelBadge.textContent = 'Awaiting Scan';
        labelBadge.className = 'badge badge-secondary';
        nutriPillsContainer.innerHTML = '';
        ingredientWarningsContainer.innerHTML = '';
        mandatoryWarningsBox.textContent = 'Please run the laser scan to parse nutritional details.';
        complianceVerdictBox.className = 'hidden';
    }

    productSelect.addEventListener('change', updateLabelGraphic);
    updateLabelGraphic(); // init initial label

    /** Render label audit report from a data object (same shape as products[x]) */
    function renderLabelReport(prodData) {
        // Overall badge
        labelBadge.textContent = prodData.overallBadge.text;
        labelBadge.className = prodData.overallBadge.class;

        // Nutrition pills
        nutriPillsContainer.innerHTML = '';
        prodData.nutriPills.forEach(pill => {
            const span = document.createElement('span');
            span.className = `nutri-pill ${pill.class}`;
            span.innerHTML = pill.class === 'pass'
                ? `<i class="fa-solid fa-circle-check"></i> ${pill.text}`
                : `<i class="fa-solid fa-triangle-exclamation"></i> ${pill.text}`;
            nutriPillsContainer.appendChild(span);
        });

        // Ingredient / allergen warnings
        ingredientWarningsContainer.innerHTML = '';
        prodData.warnings.forEach(warn => {
            const div = document.createElement('div');
            div.className = `warning-item ${warn.class}`;
            div.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> <span>${warn.text}</span>`;
            ingredientWarningsContainer.appendChild(div);
        });

        // Mandatory warnings box
        mandatoryWarningsBox.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-warning"></i> <span>${prodData.mandatory}</span>`;

        // Compliance verdict
        complianceVerdictBox.className = `compliance-verdict-box ${prodData.verdict.class}`;
        complianceVerdictBox.innerHTML = `
            <div class="verdict-icon">${prodData.verdict.icon}</div>
            <div class="verdict-info">
                <span class="verdict-title">${prodData.verdict.title}</span>
                <span class="verdict-desc">${prodData.verdict.desc}</span>
            </div>
        `;
    }

    btnStartScan.addEventListener('click', async () => {
        // Start scan animation
        scannerWindow.classList.add('scan-active');
        scanningOverlay.classList.remove('hidden');
        btnStartScan.disabled = true;

        // ---- Path A: User uploaded a real image → send to AI ----
        if (uploadedImageFile) {
            scanningOverlay.querySelector('p').textContent = 'Running AI compliance analysis...';

            try {
                const formData = new FormData();
                formData.append('labelImage', uploadedImageFile);

                const response = await fetch('/api/validate-label', {
                    method: 'POST',
                    body: formData  // no Content-Type header — browser sets it with boundary
                });

                scannerWindow.classList.remove('scan-active');
                scanningOverlay.classList.add('hidden');
                scanningOverlay.querySelector('p').textContent = 'Extracting OCR labels...';
                btnStartScan.disabled = false;

                const data = await response.json();

                if (data.source === 'ai' && data.report) {
                    // Render AI analysis results
                    renderLabelReport(data.report);
                } else if (data.source === 'fallback') {
                    // No Gemini key — fall back to dropdown product data
                    renderLabelReport(products[productSelect.value]);
                    mandatoryWarningsBox.innerHTML += '<br><small style="color:var(--text-muted);">(AI key not configured — showing sample data)</small>';
                } else {
                    // API error
                    labelBadge.textContent = 'Analysis Error';
                    labelBadge.className = 'badge badge-danger-glow';
                    nutriPillsContainer.innerHTML = `<span class="nutri-pill warn"><i class="fa-solid fa-triangle-exclamation"></i> AI analysis failed. ${data.error || ''}</span>`;
                }

            } catch (err) {
                scannerWindow.classList.remove('scan-active');
                scanningOverlay.classList.add('hidden');
                scanningOverlay.querySelector('p').textContent = 'Extracting OCR labels...';
                btnStartScan.disabled = false;
                // Network error — fall back to dropdown data
                renderLabelReport(products[productSelect.value]);
            }

        } else {
            // ---- Path B: No upload → use existing hardcoded dropdown data (original flow) ----
            setTimeout(() => {
                scannerWindow.classList.remove('scan-active');
                scanningOverlay.classList.add('hidden');
                btnStartScan.disabled = false;
                renderLabelReport(products[productSelect.value]);
            }, 2000);
        }
    });


    // ------------------------------------------------
    // Module 4: Recall Prediction Dashboard
    // ------------------------------------------------
    let recallChart = null;

    function initRecallChart() {
        const ctx = document.getElementById('riskChart');
        if (!ctx) return;
        
        // Prevent double instantiations
        if (recallChart) return;

        const purpleGrad = ctx.getContext('2d').createLinearGradient(0, 0, 0, 200);
        purpleGrad.addColorStop(0, 'rgba(139, 92, 246, 0.25)');
        purpleGrad.addColorStop(1, 'rgba(139, 92, 246, 0.0)');

        const orangeGrad = ctx.getContext('2d').createLinearGradient(0, 0, 0, 200);
        orangeGrad.addColorStop(0, 'rgba(245, 158, 11, 0.25)');
        orangeGrad.addColorStop(1, 'rgba(245, 158, 11, 0.0)');

        const blueGrad = ctx.getContext('2d').createLinearGradient(0, 0, 0, 200);
        blueGrad.addColorStop(0, 'rgba(59, 130, 246, 0.25)');
        blueGrad.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

        recallChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026 (Proj)'],
                datasets: [
                    {
                        label: 'E. coli Risk Index',
                        data: [15, 22, 19, 45, 68, 78],
                        borderColor: '#8B5CF6',
                        backgroundColor: purpleGrad,
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2.5
                    },
                    {
                        label: 'Salmonella Outbreaks',
                        data: [28, 30, 15, 24, 38, 42],
                        borderColor: '#F59E0B',
                        backgroundColor: orangeGrad,
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2.5
                    },
                    {
                        label: 'Listeria Contamination',
                        data: [52, 48, 32, 20, 12, 8],
                        borderColor: '#3B82F6',
                        backgroundColor: blueGrad,
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2.5
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#475569',
                            font: { family: 'Inter', size: 10 }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: { color: '#6B7280', font: { size: 9 } }
                    },
                    y: {
                        min: 0,
                        max: 100,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: {
                            color: '#6B7280',
                            font: { size: 9 },
                            callback: function(value) { return value + '%'; }
                        }
                    }
                }
            }
        });
    }

    // Dynamic High Risk Suppliers
    const supplierTableBody = document.getElementById('supplier-table-body');
    const liveAlertsFeed = document.getElementById('live-alerts-feed');
    const actionDetailsPanel = document.getElementById('action-details-panel');

    const supplierData = [
        { id: 'S-102', batch: 'B-402', pathogen: 'E. coli trace risk', risk: '78%', status: 'monitored' },
        { id: 'S-208', batch: 'B-389', pathogen: 'Salmonella warning', risk: '42%', status: 'cleared' },
        { id: 'S-090', batch: 'B-411', pathogen: 'Listeria risk', risk: '84%', status: 'quarantined' }
    ];

    const initialFeedAlerts = [
        { time: '2 mins ago', type: 'danger', text: 'E. coli trace risk detected in supplier S-102 batch B-402 due to temperature deviation in logistics transport vat.' },
        { time: '1 hour ago', type: 'info', text: 'Supplier S-208 batch B-389 passed double sanitization verify loop. Heavy metal assay confirms safe PPM.' },
        { time: '3 hours ago', type: 'warning', text: 'Listeria outbreak vector warning issued for storage district near Supplier S-090. Batch quarantine initialized.' }
    ];

    function updateSupplierTable() {
        supplierTableBody.innerHTML = '';
        supplierData.forEach(sup => {
            const tr = document.createElement('tr');
            
            const classMap = {
                quarantined: 'status-pill quarantined',
                monitored: 'status-pill monitored',
                cleared: 'status-pill cleared'
            };
            
            tr.innerHTML = `
                <td><strong>${sup.id}</strong></td>
                <td>${sup.batch}</td>
                <td><span class="${sup.status === 'quarantined' ? 'text-danger' : (sup.status === 'monitored' ? 'text-warning' : 'text-success')}">${sup.pathogen}</span></td>
                <td><strong>${sup.risk}</strong></td>
                <td><span class="${classMap[sup.status]}" data-sup="${sup.id}">${sup.status.toUpperCase()}</span></td>
            `;

            // Setup change status interactive action directly by clicking status badge
            const statusBadge = tr.querySelector('.status-pill');
            statusBadge.addEventListener('click', () => {
                if (sup.status === 'monitored') {
                    quarantineAction(sup.id);
                } else if (sup.status === 'quarantined') {
                    clearAction(sup.id);
                }
            });

            supplierTableBody.appendChild(tr);
        });
    }

    function renderFeed() {
        liveAlertsFeed.innerHTML = '';
        initialFeedAlerts.forEach(alert => {
            const div = document.createElement('div');
            div.className = `feed-item feed-${alert.type}`;
            div.innerHTML = `
                <div class="feed-details">
                    <span class="feed-title">${alert.type === 'danger' ? 'Critical Risk Alarm' : (alert.type === 'warning' ? 'Outbreak Vector Warning' : 'Assurance Approved')}</span>
                    <span class="feed-meta">${alert.text}</span>
                </div>
                <span class="feed-time-badge">${alert.time}</span>
            `;
            liveAlertsFeed.appendChild(div);
        });
    }

    // Supplier notification modal (in-app, no browser alert)
    function showSupplierNotificationModal(supplierId, batchId, notificationText, assessmentData) {
        // Remove any existing modal
        const existing = document.getElementById('supplier-notify-modal');
        if (existing) existing.remove();

        const classification = assessmentData ? assessmentData.recallClassification || 'Class I - Dangerous' : 'Class I - Dangerous';
        const riskScore = assessmentData ? assessmentData.recallRiskScore || '--' : '--';
        const necessity = assessmentData ? assessmentData.recallNecessity || 'Immediate Mandatory Recall' : 'Immediate Mandatory Recall';

        const modal = document.createElement('div');
        modal.id = 'supplier-notify-modal';
        modal.className = 'modal-overlay';
        modal.style.cssText = 'display:flex;';
        modal.innerHTML = `
            <div class="modal-card" style="max-width:560px;width:100%;">
                <div class="modal-header">
                    <h3><i class="fa-solid fa-envelope text-danger"></i> Supplier Alert Notification — ${supplierId}</h3>
                    <button class="modal-close" id="btn-close-notify-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="audit-summary-box" style="margin-bottom:1rem;">
                        <p><strong>Supplier:</strong> ${supplierId} | <strong>Batch:</strong> ${batchId}</p>
                        <p><strong>Classification:</strong> <span style="color:var(--danger);font-weight:600;">${classification}</span></p>
                        <p><strong>Risk Score:</strong> ${riskScore}/100 | <strong>Action:</strong> ${necessity}</p>
                    </div>
                    <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.5rem;">NOTIFICATION MESSAGE (AI-Generated):</p>
                    <div style="background:rgba(0,0,0,0.2);border:1px solid var(--border-glass);border-radius:8px;padding:1rem;font-size:0.85rem;line-height:1.6;color:var(--text-primary);">
                        ${notificationText || 'This is an urgent safety notification. Please quarantine the affected batch immediately and await further instructions from our QA team.'}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-danger" id="btn-copy-notify"><i class="fa-solid fa-copy"></i> Copy Message</button>
                    <button class="btn btn-text" id="btn-dismiss-notify">Dismiss</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const closeNotify = () => modal.remove();
        document.getElementById('btn-close-notify-modal').addEventListener('click', closeNotify);
        document.getElementById('btn-dismiss-notify').addEventListener('click', closeNotify);
        modal.addEventListener('click', (e) => { if (e.target === modal) closeNotify(); });
        document.getElementById('btn-copy-notify').addEventListener('click', () => {
            navigator.clipboard.writeText(notificationText || '').then(() => {
                document.getElementById('btn-copy-notify').textContent = '✓ Copied!';
                setTimeout(() => { document.getElementById('btn-copy-notify').innerHTML = '<i class="fa-solid fa-copy"></i> Copy Message'; }, 2000);
            }).catch(() => {});
        });
    }

    // Last AI assessment cache for the action panel
    let lastRecallAssessment = null;

    async function quarantineAction(supplierId) {
        const target = supplierData.find(s => s.id === supplierId);
        if (!target) return;

        // Show loading state in action panel
        actionDetailsPanel.innerHTML = `
            <div style="text-align:center;padding:1rem;color:var(--text-secondary);">
                <div class="spinner" style="margin:0 auto 0.5rem;"></div>
                <p>Running AI recall risk assessment for Batch ${target.batch}...</p>
            </div>
        `;

        // Call the AI recall assessment API
        try {
            const response = await fetch('/api/recall-assessment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    supplierInfo: `Supplier ID: ${target.id}`,
                    batchInfo: `Batch: ${target.batch}`,
                    pathogenInfo: target.pathogen,
                    temperatureInfo: 'Temperature deviation detected in logistics transport',
                    traceabilityInfo: 'Batch traceability records available',
                    incidentDescription: `${target.pathogen} detected in supplier ${target.id} batch ${target.batch}. Risk probability: ${target.risk}.`
                })
            });
            const data = await response.json();
            lastRecallAssessment = data.assessment || null;
        } catch (err) {
            console.error('[Recall Assessment error]', err);
            lastRecallAssessment = null;
        }

        // Update supplier state
        target.status = 'quarantined';
        const riskScore = lastRecallAssessment ? lastRecallAssessment.recallRiskScore : null;
        target.risk = riskScore ? riskScore + '%' : '12%';
        updateSupplierTable();

        // Update metrics
        document.getElementById('metric-risk-index').textContent = 'Moderate (35%)';
        document.getElementById('metric-risk-index').className = 'metric-value text-warning';
        document.getElementById('metric-alert-count').textContent = '1 Active';
        document.getElementById('metric-quarantine-count').textContent = '15 Batches';

        // Build feed message
        const classification = lastRecallAssessment ? lastRecallAssessment.recallClassification || '' : '';
        const classTag = classification ? ` [${classification}]` : '';
        initialFeedAlerts.unshift({
            time: 'Just now',
            type: 'warning',
            text: `Batch ${target.batch} from Supplier ${target.id} quarantined.${classTag} AI risk score: ${target.risk}. Containment procedures initiated.`
        });
        renderFeed();
        renderActionPanel();
    }

    function clearAction(supplierId) {
        const target = supplierData.find(s => s.id === supplierId);
        if (target) {
            target.status = 'cleared';
            target.risk = '5%';
            lastRecallAssessment = null;
            updateSupplierTable();
            initialFeedAlerts.unshift({
                time: 'Just now',
                type: 'info',
                text: `Batch ${target.batch} cleared from quarantine after sanitation tests. Supplier ${target.id} reinstated.`
            });
            renderFeed();
            renderActionPanel();
        }
    }

    function renderActionPanel() {
        const highestRisk = supplierData.find(s => s.status === 'monitored');

        if (highestRisk) {
            const assessment = lastRecallAssessment;
            const riskInfo = assessment
                ? `AI Risk Score: <strong>${assessment.recallRiskScore}/100</strong> | ${assessment.recallClassification}`
                : `High probability ${highestRisk.pathogen} contamination risk detected.`;
            const instruction = assessment
                ? assessment.quarantineInstructions || 'FSSAI Chapter 3 compliance requires physical quarantine of the batch and formal supplier diagnostic auditing.'
                : 'FSSAI Chapter 3 compliance requires physical quarantine of the batch and formal supplier diagnostic auditing.';

            actionDetailsPanel.innerHTML = `
                <div class="action-meta">TARGET: SUPPLIER ${highestRisk.id} | BATCH ${highestRisk.batch} | PROBABILITY: ${highestRisk.risk}</div>
                <div class="action-instruction" style="margin-bottom:0.5rem;">${riskInfo}</div>
                <div class="action-instruction">${instruction}</div>
                <div class="action-buttons">
                    <button class="btn btn-teal" id="btn-quarantine-now"><i class="fa-solid fa-ban"></i> Quarantine Batch</button>
                    <button class="btn btn-secondary" id="btn-notify-supplier"><i class="fa-solid fa-envelope"></i> Send Alert Email</button>
                </div>
            `;

            document.getElementById('btn-quarantine-now').addEventListener('click', () => {
                quarantineAction(highestRisk.id);
            });

            document.getElementById('btn-notify-supplier').addEventListener('click', async () => {
                const btn = document.getElementById('btn-notify-supplier');
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';

                let notifText = '';
                let assessmentData = lastRecallAssessment;

                if (!assessmentData) {
                    try {
                        const resp = await fetch('/api/recall-assessment', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                supplierInfo: `Supplier ID: ${highestRisk.id}`,
                                batchInfo: `Batch: ${highestRisk.batch}`,
                                pathogenInfo: highestRisk.pathogen,
                                incidentDescription: `${highestRisk.pathogen} detected in supplier ${highestRisk.id} batch ${highestRisk.batch}.`
                            })
                        });
                        const d = await resp.json();
                        assessmentData = d.assessment || null;
                        lastRecallAssessment = assessmentData;
                    } catch (_) {}
                }

                notifText = assessmentData ? assessmentData.supplierNotification : `This is an urgent safety notification regarding potential contamination risk in Batch ${highestRisk.batch}. Following FSSAI protocols, we are initiating an immediate quarantine and recall investigation. Please halt distribution of all units from this production run and cooperate with our QA team within 24 hours.`;

                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-envelope"></i> Send Alert Email';
                showSupplierNotificationModal(highestRisk.id, highestRisk.batch, notifText, assessmentData);
            });
        } else {
            actionDetailsPanel.innerHTML = `
                <div class="action-instruction" style="color: var(--text-secondary); text-align: center; padding: 1rem 0;">
                    <i class="fa-solid fa-circle-check text-success" style="font-size: 1.5rem; margin-bottom: 0.5rem; display: block;"></i>
                    All critical outlier batches quarantined or cleared. Real-time risks are currently stabilized.
                </div>
            `;
        }
    }

    // Init recall data
    updateSupplierTable();
    renderFeed();
    renderActionPanel();

    // Outbreak feed simulation adding alerts automatically
    let alertCounter = 0;
    setInterval(() => {
        if (tabContents[4].classList.contains('active')) { // only run if user is viewing recall predictions tab
            alertCounter++;
            const pathogens = ['Listeria', 'Salmonella', 'E. coli'];
            const randomPathogen = pathogens[Math.floor(Math.random() * pathogens.length)];
            const randomNum = Math.floor(Math.random() * 200) + 100;
            const newAlert = {
                time: 'Just now',
                type: Math.random() > 0.5 ? 'warning' : 'info',
                text: `Real-time sensor update: Batch B-${randomNum} pathogen assays register clean indices for ${randomPathogen}.`
            };
            initialFeedAlerts.unshift(newAlert);
            if (initialFeedAlerts.length > 5) initialFeedAlerts.pop();
            renderFeed();
        }
    }, 15000);


    // ------------------------------------------------
    // Module 5: Multilingual Voice Agent
    // ------------------------------------------------
    const voiceLangSelect = document.getElementById('voice-lang');
    const soundwave = document.getElementById('soundwave-container');
    const btnMicTrigger = document.getElementById('btn-mic-trigger');
    const micStatusLabel = document.getElementById('mic-status-label');
    const voiceConversation = document.getElementById('voice-conversation-stream');
    const quickVoiceChips = document.querySelectorAll('.voice-chip-btn');
    const speechSupportAlert = document.getElementById('speech-support-alert');

    // Voice response matrix
    const voiceAnswers = {
        'en-IN': {
            'check restaurant hygiene rule': 'Under FSSAI schedule 4, restaurants must maintain records of potable water testing, keep foods segregated, store products off the ground, and ensure handlers undergo medical certification.',
            'what are organic food logo regulations': 'Organic packages must carry the Jaivik Bharat organic symbol alongside the standard FSSAI logo. The Jaivik logo has a leaf and circle representing natural purity.',
            'recommend corrective action for bacteria': 'For bacterial contamination, quarantine the infected batch immediately. Sanitize storage tanks using quaternary ammonium at 200 ppm, and increase Pasteurization temperature to 72 degrees Celsius for 15 seconds.',
            'default': 'I have received your command. FSSAI standards suggest checking raw material logs and scheduling regular cleaning sessions. Can you repeat that query?'
        },
        'hi-IN': {
            'डेयरी उत्पाद शेल्फ लाइफ नियम क्या है': 'एफ एस एस ए आई के नियमों के अनुसार, पास्चुरीकृत दूध को 4 डिग्री सेल्सियस से कम तापमान पर रखा जाना चाहिए। इसकी शेल्फ लाइफ 2 से 3 दिन की होती है।',
            'हलाल और शाकाहारी मार्क नियम क्या है': 'शाकाहारी भोजन के लिए पैकेज पर हरे रंग का बिंदीदार निशान होना अनिवार्य है। यह निशान एक चौकोर हरे रंग के बॉक्स के अंदर एक हरा गोल बिंदु होता है।',
            'default': 'मुझे आपका निर्देश मिल गया है। कृपया खाद्य सुरक्षा नियमों का पालन करें और स्वच्छता का ध्यान रखें। क्या आप इसे दोहरा सकते हैं?'
        },
        'ta-IN': {
            'உணவு பாதுகாப்பு உரிமம் பெறுவது எப்படி': 'வருடாந்திர வருவாய் 12 லட்சத்திற்கு மேல் இருந்தால் மாநில உரிமம் தேவை. 20 கோடிக்கு மேல் இருந்தால் மத்திய உரிமம் கட்டாயம் பெற வேண்டும்.',
            'உணவு லேபிள் விதிகள் என்ன': 'உணவு லேபிள்களில் தயாரிப்பு பெயர், தயாரிப்பாளர் முகவரி, காலாவதியாகும் தேதி, ஊட்டச்சத்து விவரங்கள் மற்றும் அலர்ஜி எச்சரிக்கைகள் கட்டாயம் இருக்க வேண்டும்.',
            'default': 'உங்கள் கட்டளை ஏற்றுக்கொள்ளப்பட்டது. உணவு பாதுகாப்பு சட்டத்தின்படி தரம் சரிபார்க்கப்பட வேண்டும். மீண்டும் கூற முடியுமா?'
        }
    };

    // Check browser SpeechRecognition API support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const isSpeechSupported = !!SpeechRecognition;

    if (!isSpeechSupported) {
        speechSupportAlert.style.display = 'flex';
    }

    // TTS Utility
    function speakText(text, lang) {
        if ('speechSynthesis' in window) {
            // Cancel any active speakings
            window.speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang;
            
            // Try to find a nice local voice matching language
            const voices = window.speechSynthesis.getVoices();
            let voice = null;
            
            if (lang.startsWith('en')) {
                voice = voices.find(v => v.lang.includes('IN') || v.lang.includes('GB') || v.lang.includes('US'));
            } else if (lang.startsWith('hi')) {
                voice = voices.find(v => v.lang.includes('IN') && v.name.includes('Hindi'));
            } else if (lang.startsWith('ta')) {
                voice = voices.find(v => v.lang.includes('IN') && v.name.includes('Tamil'));
            }
            
            if (voice) utterance.voice = voice;
            
            // Animate wave while speaking
            utterance.onstart = () => {
                soundwave.classList.add('wave-active');
            };
            utterance.onend = () => {
                soundwave.classList.remove('wave-active');
            };
            
            window.speechSynthesis.speak(utterance);
        }
    }

    // Append Speech Bubbles
    function appendSpeechBubble(sender, speaker, text) {
        const bubble = document.createElement('div');
        bubble.className = `speech-bubble ${sender}`;
        bubble.innerHTML = `
            <span class="speaker-tag">${speaker}</span>
            <p class="speech-text">${text}</p>
        `;
        voiceConversation.appendChild(bubble);
        voiceConversation.scrollTop = voiceConversation.scrollHeight;
    }

    async function triggerVoiceSimulation(utteranceText, lang) {
        // Stop current speaking
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();

        // user bubble
        appendSpeechBubble('user', 'QA Auditor', `"${utteranceText}"`);

        // visual soundwave active during thinking/listening
        soundwave.classList.add('wave-active');
        micStatusLabel.textContent = 'Consulting AI food safety database...';

        let replyText = '';

        try {
            const response = await fetch('/api/voice-assistant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: utteranceText, lang })
            });

            if (response.ok) {
                const data = await response.json();
                replyText = data.reply || '';
            }
        } catch (err) {
            console.error('[Voice API error]', err.message);
        }

        // If API failed or returned empty, use local fallback
        if (!replyText.trim()) {
            const responses = voiceAnswers[lang] || voiceAnswers['en-IN'];
            replyText = responses[utteranceText] || responses['default'];
        }

        soundwave.classList.remove('wave-active');



        // assistant bubble
        appendSpeechBubble('assistant', 'AI Safety Assistant', replyText);
        micStatusLabel.textContent = 'Click the microphone and say a command';

        // Speak reply via TTS
        speakText(replyText, lang);
    }

    // Mic triggers Speech Recognition or Fallback Simulation
    let recognitionInstance = null;

    if (isSpeechSupported) {
        recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = false;

        recognitionInstance.onstart = () => {
            document.getElementById('tab-voice-agent').classList.add('mic-listening');
            soundwave.classList.add('wave-active');
            micStatusLabel.textContent = 'Listening for speech input...';
        };

        recognitionInstance.onerror = () => {
            soundwave.classList.remove('wave-active');
            document.getElementById('tab-voice-agent').classList.remove('mic-listening');
            micStatusLabel.textContent = 'Speech error. Please try again.';
        };

        recognitionInstance.onend = () => {
            document.getElementById('tab-voice-agent').classList.remove('mic-listening');
        };

        recognitionInstance.onresult = (event) => {
            const spokenText = event.results[0][0].transcript;
            const activeLang = voiceLangSelect.value;
            triggerVoiceSimulation(spokenText, activeLang);
        };
    }

    btnMicTrigger.addEventListener('click', () => {
        const activeLang = voiceLangSelect.value;
        
        if (isSpeechSupported) {
            recognitionInstance.lang = activeLang;
            recognitionInstance.start();
        } else {
            // Fallback simulation when API unsupported
            document.getElementById('tab-voice-agent').classList.add('mic-listening');
            soundwave.classList.add('wave-active');
            micStatusLabel.textContent = 'Listening (Fallback Simulation active)...';

            setTimeout(() => {
                document.getElementById('tab-voice-agent').classList.remove('mic-listening');
                soundwave.classList.remove('wave-active');

                // Pick a default speech phrase based on lang
                let simulatedPhrases = [];
                if (activeLang === 'en-IN') {
                    simulatedPhrases = [
                        'check restaurant hygiene rule',
                        'what are organic food logo regulations',
                        'recommend corrective action for bacteria'
                    ];
                } else if (activeLang === 'hi-IN') {
                    simulatedPhrases = [
                        'डेयरी उत्पाद शेल्फ लाइफ नियम क्या है',
                        'हलाल और शाकाहारी मार्क नियम क्या है'
                    ];
                } else {
                    simulatedPhrases = [
                        'உணவு பாதுகாப்பு உரிமம் பெறுவது எப்படி',
                        'உணவு லேபிள் விதிகள் என்ன'
                    ];
                }

                const randomUtterance = simulatedPhrases[Math.floor(Math.random() * simulatedPhrases.length)];
                triggerVoiceSimulation(randomUtterance, activeLang);

            }, 2500);
        }
    });

    quickVoiceChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const utterance = chip.getAttribute('data-utterance');
            const lang = chip.getAttribute('data-lang');
            
            // Sync dropdown language selector automatically
            voiceLangSelect.value = lang;
            
            triggerVoiceSimulation(utterance, lang);
        });
    });

    // Make sure voices load (Chrome bug workaround)
    if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
    }
});
