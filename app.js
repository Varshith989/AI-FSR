/* ======================================================
   SafeFood AI — Application Controller v2.0
   Toast Engine · Theme · Mobile Nav · A11y · Micro-UX
   ====================================================== */

document.addEventListener('DOMContentLoaded', () => {

/* -------------------------------------------------------
   THEME MANAGER
   ------------------------------------------------------- */
const themeToggle = document.getElementById('theme-toggle');
const html = document.documentElement;
const THEME_KEY = 'safefood-theme';

function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    const icon = themeToggle.querySelector('i');
    if (theme === 'dark') {
        icon.className = 'fa-solid fa-sun';
        themeToggle.setAttribute('aria-label', 'Switch to light mode');
    } else {
        icon.className = 'fa-solid fa-moon';
        themeToggle.setAttribute('aria-label', 'Switch to dark mode');
    }
}

const savedTheme = localStorage.getItem(THEME_KEY) ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
applyTheme(savedTheme);

themeToggle.addEventListener('click', () => {
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem(THEME_KEY, next);
    showToast({ title: `${next === 'dark' ? '🌙 Dark' : '☀️ Light'} Mode`, message: 'Theme preference saved.', type: 'info', duration: 2000 });
});

/* -------------------------------------------------------
   TOAST NOTIFICATION ENGINE
   ------------------------------------------------------- */
const toastContainer = document.getElementById('toast-container');

function showToast({ title = '', message = '', type = 'info', duration = 4000 }) {
    const icons = { info: 'fa-circle-info', success: 'fa-circle-check', warning: 'fa-triangle-exclamation', error: 'fa-circle-xmark' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.innerHTML = `
        <div class="toast-accent"></div>
        <i class="toast-icon fa-solid ${icons[type]}" aria-hidden="true"></i>
        <div class="toast-body">
            ${title ? `<div class="toast-title">${title}</div>` : ''}
            ${message ? `<div class="toast-message">${message}</div>` : ''}
        </div>
        <button class="toast-close" aria-label="Dismiss notification"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
        <div class="toast-progress" style="animation-duration: ${duration}ms"></div>
    `;
    toastContainer.appendChild(toast);
    const dismiss = () => {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 300);
    };
    toast.querySelector('.toast-close').addEventListener('click', dismiss);
    setTimeout(dismiss, duration);
    return toast;
}

/* -------------------------------------------------------
   MOBILE NAVIGATION
   ------------------------------------------------------- */
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebar-overlay');
const hamburger = document.getElementById('hamburger-btn');

function openSidebar() {
    sidebar.classList.add('open');
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    hamburger.setAttribute('aria-expanded', 'true');
    hamburger.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
    document.body.style.overflow = 'hidden';
}
function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.innerHTML = '<i class="fa-solid fa-bars" aria-hidden="true"></i>';
    document.body.style.overflow = '';
}
hamburger.addEventListener('click', () => sidebar.classList.contains('open') ? closeSidebar() : openSidebar());
overlay.addEventListener('click', closeSidebar);

/* -------------------------------------------------------
   TAB NAVIGATION  (ARIA tablist)
   ------------------------------------------------------- */
const navItems    = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');
const pageTitle    = document.getElementById('page-title');
const pageSubtitle = document.getElementById('page-subtitle');
const moduleCards  = document.querySelectorAll('.module-card');

const tabMeta = {
    'dashboard':   { title: 'Overview Dashboard',                      subtitle: 'Real-time enterprise compliance health index' },
    'regulatory':  { title: 'Regulatory Compliance Assistant',         subtitle: 'Interactive FSSAI helper and audit prep checklists' },
    'doc-intel':   { title: 'Safety Document Intelligence',            subtitle: 'Scan SOPs and HACCP docs for FSSAI alignment' },
    'label-val':   { title: 'AI Food Label Validator',                 subtitle: 'Ingredient analysis, nutritional audits and allergen checking' },
    'recall-dash': { title: 'Predictive Safety & Recall Dashboard',    subtitle: 'Supplier risk indexing and outbreak monitoring' },
    'voice-agent': { title: 'Multilingual Floor Audit Voice Agent',    subtitle: 'Hands-free factory floor audits via speech commands' }
};

function switchTab(tabId) {
    navItems.forEach(item => {
        const active = item.getAttribute('data-tab') === tabId;
        item.classList.toggle('active', active);
        item.setAttribute('aria-selected', active);
        item.setAttribute('tabindex', active ? '0' : '-1');
    });
    tabContents.forEach(tab => tab.classList.remove('active'));
    const target = document.getElementById(`tab-${tabId}`);
    if (target) target.classList.add('active');
    const meta = tabMeta[tabId];
    if (meta) { pageTitle.textContent = meta.title; pageSubtitle.textContent = meta.subtitle; }
    if (tabId === 'recall-dash') initRecallChart();
    closeSidebar();
}

navItems.forEach(item => {
    item.addEventListener('click', e => { e.preventDefault(); switchTab(item.getAttribute('data-tab')); });
    item.addEventListener('keydown', e => {
        const tabs = [...navItems];
        const idx  = tabs.indexOf(item);
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); tabs[(idx + 1) % tabs.length].focus(); }
        if (e.key === 'ArrowUp'   || e.key === 'ArrowLeft')  { e.preventDefault(); tabs[(idx - 1 + tabs.length) % tabs.length].focus(); }
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); switchTab(item.getAttribute('data-tab')); }
    });
});

moduleCards.forEach(card => {
    card.addEventListener('click', () => switchTab(card.getAttribute('data-target')));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); switchTab(card.getAttribute('data-target')); }});
});

/* -------------------------------------------------------
   NOTIFICATION PANEL
   ------------------------------------------------------- */
const notifBtn      = document.getElementById('notifications-btn');
const notifDropdown = document.getElementById('notification-dropdown');
const notifDot      = document.getElementById('notification-dot');
const markAllRead   = document.getElementById('mark-all-read');

function toggleNotif(open) {
    notifDropdown.classList.toggle('open', open);
    notifBtn.setAttribute('aria-expanded', open);
}
notifBtn.addEventListener('click', e => { e.stopPropagation(); toggleNotif(!notifDropdown.classList.contains('open')); });
notifBtn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleNotif(!notifDropdown.classList.contains('open')); }});
document.addEventListener('click', e => { if (!notifBtn.contains(e.target)) toggleNotif(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') toggleNotif(false); });

markAllRead.addEventListener('click', () => {
    notifDropdown.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
    notifDot.classList.add('hidden');
    notifBtn.setAttribute('aria-label', 'Notifications — all read');
    toggleNotif(false);
    showToast({ title: 'Notifications cleared', message: 'All alerts marked as read.', type: 'success', duration: 2500 });
});
markAllRead.addEventListener('keydown', e => { if (e.key === 'Enter') markAllRead.click(); });

/* -------------------------------------------------------
   MODULE 1: REGULATORY CHAT ASSISTANT
   ------------------------------------------------------- */
const chatForm     = document.getElementById('chat-form');
const chatInput    = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');
const chipBtns     = document.querySelectorAll('.chip-btn');

const botResponses = {
    greeting:    'Hi! 👋 Welcome to SafeFood AI. How can I help you with food safety or FSSAI compliance today?',
    default:     'I can help you with FSSAI licensing, hygiene requirements, labeling, packaging, and audit preparation. What would you like to know?',
    dairy:       'Under FSSAI rules, pasteurized milk must be kept refrigerated below 4°C and lasts 2–3 days. UHT milk in sealed cartons can be stored at room temperature for up to 90 days until opened.',
    distributor: 'Food distributors need an FSSAI State License if annual turnover is between ₹12 Lakhs and ₹20 Crores. Above ₹20 Crores or import/export requires a Central License.',
    jaivik:      'Jaivik Bharat is the official logo for certified organic food products in India. Display both the Jaivik Bharat logo and your 14-digit FSSAI license number on packaging.',
    allergen:    'FSSAI requires clear allergen declarations: gluten, milk, eggs, fish, peanuts, tree nuts, soybeans, crustaceans, and sulphites must be mentioned in the ingredient list.'
};

function isGreeting(text) {
    if (!text) return false;
    const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const greetings = new Set(['hi','hello','hey','hiya','howdy','namaste','greetings','yo','good morning','good afternoon','good evening','good day','good night','hi there','hello there','hey there','hi safefood','hello safefood']);
    return greetings.has(clean) || /^(hi|hello|hey|hiya|howdy|namaste|greetings)\s+(there|safefood|bot|assistant|team)?$/.test(clean);
}

function cleanMsg(text) {
    if (!text) return '';
    return text
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/^\s*--+\s*/gm, '')
        .replace(/\s*--+\s*/g, ' ')
        .replace(/^[\*\-]\s+/gm, '')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function getFSSAIAnswer(query) {
    if (!query) return botResponses.default;
    if (isGreeting(query)) return botResponses.greeting;
    const q = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    if (q.includes('schedule 4') || q.includes('schedule iv')) return 'Schedule 4 under FSSAI covers sanitary and hygiene requirements for all food businesses including cleaning, potable water, personal hygiene, safe temperatures, and pest control.';
    if (q.includes('what is fssai') || q.includes('explain fssai') || q === 'fssai') return 'FSSAI stands for the Food Safety and Standards Authority of India — it regulates food safety and requires businesses to obtain registration or licensing to legally operate.';
    if (q.includes('hygiene') || q.includes('sanitary') || q.includes('kitchen')) return 'Food businesses must keep surfaces clean, use potable water, ensure staff wear aprons and hairnets, store raw and cooked foods separately, and maintain chilled foods below 4°C.';
    if (q.includes('audit') || q.includes('inspection')) return 'For FSSAI audit: keep license displayed, water test reports, pest control records, staff health checkups, and ensure cleanliness of all food prep areas. Generate a full checklist from the Regulatory Assistant.';
    if (q.includes('which license') || q.includes('what license') || q.includes('license do i need')) return 'Basic Registration: turnover up to ₹12 Lakhs. State License: ₹12L–₹20Cr. Central License: above ₹20Cr or multi-state/import/export operations.';
    if (q.includes('dairy') || q.includes('milk') || q.includes('shelf life')) return botResponses.dairy;
    if (q.includes('distributor') || q.includes('wholesale') || q.includes('warehouse')) return botResponses.distributor;
    if (q.includes('jaivik') || q.includes('organic')) return botResponses.jaivik;
    if (q.includes('allergen') || q.includes('allergy')) return botResponses.allergen;
    if (q.includes('label') || q.includes('packaging')) return 'Every packaged food must show: product name, ingredients list, nutrition facts, veg/non-veg dot, manufacturing & expiry dates, net weight, manufacturer info, and the 14-digit FSSAI license number.';
    if (q.includes('how to apply') || q.includes('foscos')) return 'Apply online at foscos.fssai.gov.in — create an account, select your category, upload ID and address proof, pay the fee, and submit.';
    if (q.includes('fostac') || q.includes('training') || q.includes('food safety supervisor')) return 'FoSTaC requires at least one certified Food Safety Supervisor for every 25 food handlers in your business.';
    if (q.includes('recall') || q.includes('adulteration')) return 'If food is unsafe: stop selling immediately, notify FSSAI within 24 hours, inform consumers, and quarantine affected batches.';
    return botResponses.default;
}

function appendMessage(sender, text) {
    const wrap = document.createElement('div');
    wrap.className = `message ${sender}`;
    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.innerHTML = sender === 'bot' ? '<i class="fa-solid fa-robot"></i>' : 'QA';
    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    const p = document.createElement('p');
    p.textContent = sender === 'bot' ? cleanMsg(text) : text;
    const time = document.createElement('div');
    time.className = 'msg-time';
    time.setAttribute('aria-hidden', 'true');
    time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    // Copy button
    if (sender === 'bot') {
        const copyBtn = document.createElement('button');
        copyBtn.className = 'msg-copy-btn';
        copyBtn.innerHTML = '<i class="fa-regular fa-copy" aria-hidden="true"></i>';
        copyBtn.setAttribute('aria-label', 'Copy message');
        copyBtn.addEventListener('click', e => {
            e.stopPropagation();
            navigator.clipboard.writeText(p.textContent).then(() => {
                copyBtn.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i>';
                showToast({ title: 'Copied!', message: 'Response copied to clipboard.', type: 'success', duration: 1800 });
                setTimeout(() => { copyBtn.innerHTML = '<i class="fa-regular fa-copy" aria-hidden="true"></i>'; }, 1500);
            });
        });
        bubble.appendChild(copyBtn);
    }
    bubble.appendChild(p);
    bubble.appendChild(time);
    wrap.appendChild(avatar);
    wrap.appendChild(bubble);
    chatMessages.appendChild(wrap);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return wrap;
}

function showTyping() {
    const wrap = document.createElement('div');
    wrap.className = 'message bot typing-indicator-placeholder';
    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.innerHTML = '<i class="fa-solid fa-robot"></i>';
    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.innerHTML = '<p style="color:var(--text-muted);font-size:var(--text-xs);font-style:italic;display:flex;align-items:center;gap:6px;"><i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> Consulting FSSAI regulations...</p>';
    wrap.appendChild(avatar);
    wrap.appendChild(bubble);
    chatMessages.appendChild(wrap);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return wrap;
}

async function handleChatSubmit(query) {
    if (!query.trim()) return;
    appendMessage('user', query);
    chatInput.value = '';
    const indicator = showTyping();
    try {
        const res = await fetch('/api/regulatory-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });
        indicator.remove();
        if (!res.ok) throw new Error('Server error');
        const data = await res.json();
        appendMessage('bot', data.reply);
    } catch {
        indicator.remove();
        appendMessage('bot', getFSSAIAnswer(query));
    }
}

chatForm.addEventListener('submit', e => { e.preventDefault(); handleChatSubmit(chatInput.value); });
chipBtns.forEach(btn => btn.addEventListener('click', () => handleChatSubmit(btn.getAttribute('data-query'))));

/* -------------------------------------------------------
   MODULE 2: AUDIT CHECKLIST
   ------------------------------------------------------- */
const btnGenerateChecklist = document.getElementById('btn-generate-checklist');
const businessSelect       = document.getElementById('business-type');
const checklistItems       = document.getElementById('checklist-items');
const checklistCount       = document.getElementById('checklist-count');
const checklistPercent     = document.getElementById('checklist-percent');
const progressFill         = document.getElementById('checklist-progress-fill');
const progressBar          = progressFill.closest('[role="progressbar"]');
const checklistActions     = document.getElementById('checklist-actions');

// Modal
const auditModal      = document.getElementById('audit-modal');
const btnCloseModal   = document.getElementById('btn-close-modal');
const btnCancelModal  = document.getElementById('btn-cancel-modal');
const btnExportAudit  = document.getElementById('btn-export-audit');
const btnDownloadPdf  = document.getElementById('btn-download-pdf');
const modalBusiness   = document.getElementById('modal-business-type');
const modalPercent    = document.getElementById('modal-compliance-percent');
const modalTicked     = document.getElementById('modal-compliance-ticked');
const modalStatus     = document.getElementById('modal-status-badge');

const checklistData = {
    restaurant: [
        { id:'r1', text:'All raw materials sourced from FSSAI registered/licensed vendors.', clause:'Sec 4.1' },
        { id:'r2', text:'Potable water quality checked and test records maintained.', clause:'Sec 4.2.1' },
        { id:'r3', text:'Refrigerators maintaining temperature below 5°C; freezers below -18°C.', clause:'Sec 4.5.2' },
        { id:'r4', text:'Separate cutting boards and knives used for raw/cooked food.', clause:'Sec 4.3' },
        { id:'r5', text:'All food handlers wearing clean aprons, gloves, and hairnets.', clause:'Sec 4.6.1' },
        { id:'r6', text:'Pest control treatment completed and traps logbook active.', clause:'Sec 4.4.3' },
        { id:'r7', text:'Annual health examination records of handlers present.', clause:'Sec 4.6.2' },
        { id:'r8', text:'First-in-First-out (FIFO) inventory method followed.', clause:'Sec 4.3.2' },
        { id:'r9', text:'All food containers labeled with date of preparation.', clause:'Sec 4.7' },
        { id:'r10', text:'Daily cleaning schedule logs signed by floor supervisor.', clause:'Sec 4.4' }
    ],
    manufacturing: [
        { id:'m1', text:'Raw material reception inspection checklist fully updated.', clause:'Sched 4 Part II' },
        { id:'m2', text:'Continuous temperature sensor monitoring validated for boiler.', clause:'Sec 4.2.3' },
        { id:'m3', text:'Clean-In-Place (CIP) systems operational and log updated.', clause:'Sec 4.4.2' },
        { id:'m4', text:'Quarantine area demarcated for substandard raw goods.', clause:'Sec 4.1.2' },
        { id:'m5', text:'Metal detector sensitivity tested hourly with test pieces.', clause:'Sec 4.3.5' },
        { id:'m6', text:'Staff personal hygiene screening conducted at shifts.', clause:'Sec 4.6' },
        { id:'m7', text:'All processing exhaust vents fitted with insect mesh.', clause:'Sec 4.2.5' },
        { id:'m8', text:'All food grade additives verified within maximum limits.', clause:'Sec 4.5' },
        { id:'m9', text:'Batch recall drill conducted and logged within past 12 months.', clause:'Sec 4.8' },
        { id:'m10', text:'Waste disposal bins kept covered and emptied frequently.', clause:'Sec 4.4.5' }
    ],
    warehouse: [
        { id:'w1', text:'Loading dock clear of water stagnation and clutter.', clause:'Sec 4.1.1' },
        { id:'w2', text:'Cold chain storage records generated continuously.', clause:'Sec 4.5.1' },
        { id:'w3', text:'Pallets placed at least 15cm off floor & 45cm away from walls.', clause:'Sec 4.2' },
        { id:'w4', text:'No chemicals stored in same chamber as food products.', clause:'Sec 4.3.1' },
        { id:'w5', text:'Vehicle sanitization certificates verified before load.', clause:'Sec 4.7.1' },
        { id:'w6', text:'Humidity control logs recorded in dry goods warehouse.', clause:'Sec 4.5.2' },
        { id:'w7', text:'Extermination bait stations inspected and recorded weekly.', clause:'Sec 4.4.1' },
        { id:'w8', text:'Emergency exit paths clear and fire extinguishers operational.', clause:'Sec 4.2.9' },
        { id:'w9', text:'All stored pallets clearly carry Batch IDs & Expiry labels.', clause:'Sec 4.7.2' },
        { id:'w10', text:'Visitor entry hygiene protocols signed and enforced.', clause:'Sec 4.6.3' }
    ]
};

function updateChecklistProgress() {
    const total   = checklistItems.querySelectorAll('.checklist-item').length;
    const checked = checklistItems.querySelectorAll('.checklist-item input:checked').length;
    checklistCount.textContent   = `${checked}/${total}`;
    const pct = total === 0 ? 0 : Math.round((checked / total) * 100);
    checklistPercent.textContent = `${pct}%`;
    progressFill.style.width     = `${pct}%`;
    if (progressBar) progressBar.setAttribute('aria-valuenow', pct);
    checklistActions.classList.toggle('hidden', checked === 0);
}

function renderChecklistItems(items) {
    checklistItems.innerHTML = '';
    items.forEach(item => {
        const div  = document.createElement('div');
        div.className = 'checklist-item';
        const cb   = document.createElement('input');
        cb.type = 'checkbox';
        cb.id   = item.id;
        cb.setAttribute('aria-label', item.text);
        const content = document.createElement('div');
        content.className = 'checklist-item-content';
        const title = document.createElement('label');
        title.className = 'checklist-item-title';
        title.htmlFor = item.id;
        title.textContent = item.text;
        const clause = document.createElement('span');
        clause.className = 'checklist-item-clause';
        clause.textContent = `FSSAI Code: ${item.clause}`;
        content.appendChild(title);
        content.appendChild(clause);
        div.appendChild(cb);
        div.appendChild(content);
        cb.addEventListener('change', updateChecklistProgress);
        checklistItems.appendChild(div);
    });
    updateChecklistProgress();
}

function showChecklistSkeleton() {
    checklistItems.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        const sk = document.createElement('div');
        sk.className = 'checklist-skeleton-item';
        sk.innerHTML = `
            <div class="skeleton skeleton-rect" style="width:18px;height:18px;border-radius:4px;flex-shrink:0;"></div>
            <div style="flex:1;display:flex;flex-direction:column;gap:6px;">
                <div class="skeleton skeleton-text ${i % 2 === 0 ? '' : 'w-3-4'}"></div>
                <div class="skeleton skeleton-text w-1-4"></div>
            </div>
        `;
        checklistItems.appendChild(sk);
    }
}

btnGenerateChecklist.addEventListener('click', async () => {
    const type = businessSelect.value;
    btnGenerateChecklist.disabled = true;
    btnGenerateChecklist.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> Generating...';
    showChecklistSkeleton();
    checklistActions.classList.add('hidden');

    // Show static data quickly
    await new Promise(r => setTimeout(r, 600));
    renderChecklistItems(checklistData[type]);
    btnGenerateChecklist.disabled = false;
    btnGenerateChecklist.innerHTML = '<i class="fa-solid fa-rotate" aria-hidden="true"></i> Generate Audit Checklist';
    showToast({ title: 'Checklist Ready', message: `${type.charAt(0).toUpperCase() + type.slice(1)} audit checklist loaded.`, type: 'success' });

    // Try AI in background
    try {
        const res = await fetch('/api/generate-checklist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ businessType: type })
        });
        if (res.ok) {
            const data = await res.json();
            if (data.source === 'ai' && Array.isArray(data.items) && data.items.length > 0) {
                renderChecklistItems(data.items);
                showToast({ title: 'AI Checklist Applied', message: 'Upgraded to AI-generated checklist items.', type: 'info' });
            }
        }
    } catch { /* fallback already rendered */ }
});

// Modal
function openModal() {
    const total   = checklistItems.querySelectorAll('.checklist-item').length;
    const checked = checklistItems.querySelectorAll('.checklist-item input:checked').length;
    const pct     = total ? Math.round((checked / total) * 100) : 0;
    const labelMap = { restaurant: 'Restaurant & Catering', manufacturing: 'Food Manufacturer', warehouse: 'Storage & Warehouse' };
    modalBusiness.textContent = labelMap[businessSelect.value];
    modalPercent.textContent  = `${pct}%`;
    modalTicked.textContent   = `${checked}/${total}`;
    if (pct >= 80) { modalStatus.textContent = 'Audit Ready'; modalStatus.className = 'badge badge-success-glow'; }
    else if (pct >= 50) { modalStatus.textContent = 'Action Required'; modalStatus.className = 'badge badge-warning-glow'; }
    else { modalStatus.textContent = 'Non-Compliant'; modalStatus.className = 'badge badge-danger-glow'; }
    auditModal.classList.remove('hidden');
    // Focus trap
    requestAnimationFrame(() => btnCloseModal.focus());
}

function closeModal() {
    auditModal.classList.add('hidden');
    btnExportAudit.focus();
}

btnExportAudit.addEventListener('click', openModal);
btnCloseModal.addEventListener('click',  closeModal);
btnCancelModal.addEventListener('click', closeModal);
auditModal.addEventListener('click', e => { if (e.target === auditModal) closeModal(); });
auditModal.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
    // Focus trap inside modal
    if (e.key === 'Tab') {
        const focusable = [...auditModal.querySelectorAll('button, [tabindex]:not([tabindex="-1"])')];
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
});

btnDownloadPdf.addEventListener('click', () => {
    btnDownloadPdf.disabled = true;
    btnDownloadPdf.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> Compiling PDF...';
    setTimeout(() => {
        btnDownloadPdf.disabled = false;
        btnDownloadPdf.innerHTML = '<i class="fa-solid fa-circle-check" aria-hidden="true"></i> Report Downloaded';
        closeModal();
        showToast({ title: 'Report Downloaded', message: 'Compliance audit PDF has been saved to your device.', type: 'success', duration: 4000 });
        setTimeout(() => { btnDownloadPdf.innerHTML = '<i class="fa-solid fa-download" aria-hidden="true"></i> Download Audit Report PDF'; }, 1500);
    }, 1500);
});

/* -------------------------------------------------------
   MODULE 3: DOCUMENT INTELLIGENCE
   ------------------------------------------------------- */
const templateBtns   = document.querySelectorAll('.template-btn');
const docTitle        = document.getElementById('doc-title');
const docContentView  = document.getElementById('doc-content-viewer');
const docCompBadge    = document.getElementById('doc-compliance-badge');
const docLoading      = document.getElementById('doc-analyzer-loading');
const docResults      = document.getElementById('doc-analyzer-results');
const haccpAlign      = document.getElementById('haccp-align');
const fssaiAlign      = document.getElementById('fssai-align');
const riskAlign       = document.getElementById('risk-align');
const gapList         = document.getElementById('gap-list-items');
const correctionsList = document.getElementById('corrections-items');
const uploadZone      = document.getElementById('upload-zone');
const docFileInput    = document.getElementById('doc-file-input');

const templates = {
    'pest-control': {
        title:'Pest_Control_SOP_v2.txt', size:'2.8 KB',
        content:`STANDARD OPERATING PROCEDURE: INSECT AND RODENT CONTROL\nScope: Production Floor & Dry Storage\n\n1. PREVENTIVE DESIGN\n1.1 Air curtains must be installed above all exterior access doors.\n\n2. MONITORING SCHEDULING\n2.1 All rodent baits and traps must be checked <mark>twice every calendar month</mark> by the supervisor.\n\n3. CHEMICAL APPLICATIONS\n3.1 Insecticide treatments must be conducted inside storage bins. <mark>Treatment can take place during standard production shifts</mark> if food is covered.\n\n4. LOG RETENTION\n4.1 Contractor must retain logs for <mark>6 months</mark>.`,
        score:68, haccp:'8/10', fssai:'Critical Gaps', risk:'High Risk',
        gaps:['Weekly rodent trap checks mandatory under Schedule 4 (currently twice monthly).','Pesticide spraying during active production shifts risks chemical contamination.','Record-keeping must be minimum 12 months (currently 6 months).'],
        corrections:[{title:'Corrective Clause 2.1 — Trapping Schedule',text:'"Rodent bait stations shall be checked weekly (minimum once every 7 days) by a certified pest controller."'},{title:'Corrective Clause 3.1 — Chemical Application',text:'"Chemical spraying is prohibited during active food handling. All operations must halt and surfaces sanitized before resume."'}]
    },
    'cold-chain': {
        title:'HACCP_Cold_Chain_Protocol.txt', size:'3.4 KB',
        content:`HACCP: CCP #3 — Raw Dairy Chilled Storage\nCritical Limit: 4.0°C Maximum\n\n1. MONITORING PROTOCOL\n1.1 Temperatures are <mark>manually logged on paper charts at end of each shift</mark>.\n\n2. CALIBRATION SCHEDULE\n2.1 Thermal probes calibrated once <mark>every two years</mark>.\n\n3. CORRECTIVE PLAN\n3.1 If temperature exceeds 6.0°C for more than <mark>4 consecutive hours</mark>, raw milk must be discarded.`,
        score:82, haccp:'9/10', fssai:'Satisfactory', risk:'Medium Risk',
        gaps:['FSSAI Schedule 4 requires continuous automated temperature logging, not manual twice-daily charts.','Sensor calibration every 2 years is insufficient; validate every 12 months minimum.'],
        corrections:[{title:'Corrective Clause 1.1 — Automatic Logging',text:'"Cold rooms shall use continuous electronic data loggers with cloud backup. Alarms trigger via email/SMS if temperature exceeds 4.0°C for over 15 minutes."'}]
    },
    'hygiene': {
        title:'Hygiene_Sanitization_SOP.txt', size:'4.1 KB',
        content:`STANDARD OPERATING PROCEDURE: PERSONAL HYGIENE & VAT SANITIZATION\n\n1. EMPLOYEES\n1.1 Handwashing: 20 seconds with warm water and soap.\n1.2 Hairnets and clean uniforms mandatory.\n\n2. EQUIPMENT WASH\n2.1 Mixing vats rinsed daily. <mark>Vats must be scrubbed using hot water only</mark>.\n\n3. HEALTH CHECKS\n3.1 Workers with symptoms report to QA. <mark>Personnel will return to production immediately</mark> after symptoms stop without clinical clearance.`,
        score:75, haccp:'7/10', fssai:'Satisfactory', risk:'Medium Risk',
        gaps:['Hot water alone does not eradicate bacterial biofilms — food-grade sanitizer required.','Returning workers must present medical clearance certificate before resuming food contact work.'],
        corrections:[{title:'Corrective Clause 2.1 — Sanitizer',text:'"After hot water pre-rinse, vats must be treated with alkaline detergent and sanitized using FSSAI-approved chlorine solution (100–200 ppm)."'},{title:'Corrective Clause 3.1 — Medical Clearance',text:'"Staff recovering from infectious illness must be cleared in writing by a registered medical practitioner before floor entry."'}]
    }
};

function runDocumentAnalysis(docKey) {
    const doc = templates[docKey];
    docResults.classList.add('hidden');
    docLoading.classList.remove('hidden');
    docTitle.textContent = doc.title;
    document.querySelector('.file-size').textContent = doc.size;
    docContentView.innerHTML = doc.content;
    setTimeout(() => {
        docLoading.classList.add('hidden');
        docResults.classList.remove('hidden');
        docCompBadge.innerHTML = `<span class="compliance-score ${doc.score >= 85 ? 'text-success' : doc.score >= 70 ? 'text-warning' : 'text-danger'}">${doc.score}%</span> Score`;
        haccpAlign.textContent = doc.haccp; haccpAlign.className = 'score-card-val text-success';
        fssaiAlign.textContent = doc.fssai; fssaiAlign.className = `score-card-val ${doc.fssai.includes('Critical') ? 'text-danger' : 'text-warning'}`;
        riskAlign.textContent  = doc.risk;  riskAlign.className  = `score-card-val ${doc.risk.includes('High') ? 'text-danger' : doc.risk.includes('Medium') ? 'text-warning' : 'text-success'}`;
        gapList.innerHTML = '';
        doc.gaps.forEach(g => {
            const li = document.createElement('li');
            li.className = 'gap-item';
            li.innerHTML = `<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i><span>${g}</span>`;
            gapList.appendChild(li);
        });
        correctionsList.innerHTML = '';
        doc.corrections.forEach(c => {
            const card = document.createElement('div');
            card.className = 'correction-card';
            card.innerHTML = `<div class="correction-title"><i class="fa-solid fa-circle-check" aria-hidden="true"></i> ${c.title}</div><div class="correction-text">${c.text}</div>`;
            correctionsList.appendChild(card);
        });
    }, 1400);
}

templateBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        templateBtns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
        btn.classList.add('active'); btn.setAttribute('aria-pressed','true');
        runDocumentAnalysis(btn.getAttribute('data-doc'));
    });
});
runDocumentAnalysis('pest-control');

// Upload zone
['dragover','dragenter'].forEach(ev => uploadZone.addEventListener(ev, e => { e.preventDefault(); uploadZone.classList.add('drag-over'); }));
['dragleave','dragend'].forEach(ev => uploadZone.addEventListener(ev, () => uploadZone.classList.remove('drag-over')));
uploadZone.addEventListener('drop', e => { e.preventDefault(); uploadZone.classList.remove('drag-over'); if (e.dataTransfer.files[0]) handleDocUpload(e.dataTransfer.files[0]); });
uploadZone.addEventListener('click', () => docFileInput.click());
uploadZone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); docFileInput.click(); }});
docFileInput.addEventListener('change', () => { if (docFileInput.files[0]) handleDocUpload(docFileInput.files[0]); });

function handleDocUpload(file) {
    docResults.classList.add('hidden');
    docLoading.classList.remove('hidden');
    docTitle.textContent = file.name;
    document.querySelector('.file-size').textContent = `${(file.size/1024).toFixed(1)} KB`;
    docContentView.textContent = `Simulating upload analysis of: "${file.name}"\nRunning NLP entities scanner...`;
    showToast({ title: 'Document Uploaded', message: `Analyzing ${file.name}...`, type: 'info' });
    setTimeout(() => {
        docLoading.classList.add('hidden');
        docResults.classList.remove('hidden');
        docCompBadge.innerHTML = '<span class="compliance-score text-warning">78%</span> Score';
        haccpAlign.textContent = '8/10'; haccpAlign.className = 'score-card-val text-success';
        fssaiAlign.textContent = 'Minor Gaps'; fssaiAlign.className = 'score-card-val text-warning';
        riskAlign.textContent  = 'Low Risk';   riskAlign.className  = 'score-card-val text-success';
        gapList.innerHTML = '<li class="gap-item"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i><span>Document contains general hygiene protocols but lacks specific CCP metrics.</span></li>';
        correctionsList.innerHTML = '<div class="correction-card"><div class="correction-title"><i class="fa-solid fa-circle-info" aria-hidden="true"></i> Recommendation</div><div class="correction-text">"Append HACCP CCP sheets with limits, probe numbers, and safety tolerances."</div></div>';
        showToast({ title: 'Analysis Complete', message: 'Document compliance scan finished.', type: 'success' });
    }, 1500);
}

/* -------------------------------------------------------
   MODULE 4: FOOD LABEL VALIDATOR
   ------------------------------------------------------- */
const productSelect     = document.getElementById('product-sample');
const labelImageDisplay = document.getElementById('label-image-display');
const btnStartScan      = document.getElementById('btn-start-scan');
const scanLaser         = document.getElementById('scan-laser');
const scanningOverlay   = document.getElementById('scanning-overlay');
const scannerWindow     = document.getElementById('scanner-window');
const labelBadge        = document.getElementById('label-overall-badge');
const nutriPills        = document.getElementById('nutri-pills-container');
const ingredientWarns   = document.getElementById('ingredient-warnings-container');
const mandatoryBox      = document.getElementById('mandatory-warnings-box');
const verdictBox        = document.getElementById('compliance-verdict-box');

let uploadedFile = null;
const labelFileInput = document.createElement('input');
labelFileInput.type = 'file'; labelFileInput.accept = 'image/*'; labelFileInput.style.display = 'none';
document.body.appendChild(labelFileInput);

const uploadHint = document.createElement('div');
uploadHint.setAttribute('aria-hidden', 'true');
uploadHint.style.cssText = 'position:absolute;bottom:10px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.55);color:#fff;font-size:0.68rem;padding:4px 12px;border-radius:20px;pointer-events:none;white-space:nowrap;z-index:10;letter-spacing:0.3px;';
uploadHint.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Click to upload your label image';
scannerWindow.appendChild(uploadHint);

scannerWindow.addEventListener('click', e => { if (!e.target.closest('#btn-start-scan')) labelFileInput.click(); });
scannerWindow.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('#btn-start-scan')) { e.preventDefault(); labelFileInput.click(); }});
labelFileInput.addEventListener('change', () => {
    const file = labelFileInput.files[0];
    if (!file) return;
    uploadedFile = file;
    const reader = new FileReader();
    reader.onload = e => {
        uploadedFile._dataUrl = e.target.result;
        labelImageDisplay.innerHTML = `<img src="${e.target.result}" alt="Uploaded label preview" style="width:100%;height:100%;object-fit:contain;border-radius:8px;">`;
        labelBadge.textContent = 'Ready to Scan';
        labelBadge.className = 'badge badge-orange-glow';
        nutriPills.innerHTML = ''; ingredientWarns.innerHTML = '';
        mandatoryBox.innerHTML = '<i class="fa-solid fa-cloud-arrow-up" aria-hidden="true"></i> Image loaded. Click Scan to analyse.';
        verdictBox.className = 'compliance-verdict-box hidden';
        showToast({ title: 'Image Loaded', message: 'Click "Scan Label" to run AI analysis.', type: 'info' });
    };
    reader.readAsDataURL(file);
    labelFileInput.value = '';
});

const products = {
    'energy-drink': {
        labelHTML:`<div class="mock-label"><h4>HYPERVOLT ENERGY</h4><div class="label-section"><div class="label-row label-bold"><span>Nutrition Facts</span></div><div class="label-row"><span>Serving Size: 500ml</span></div></div><div class="label-section"><div class="label-row label-bold"><span>Amount Per Serving</span></div><div class="label-row"><span>Calories</span><span>210 kcal</span></div><div class="label-row"><span>Total Fat</span><span>0g</span></div><div class="label-row label-bold"><span>Total Sugar</span><span>70g (14%)</span></div><div class="label-row label-bold"><span>Caffeine</span><span>160mg</span></div></div><div class="ingredients-box"><strong>Ingredients:</strong> Carbonated Water, HFCS, Caffeine, Citric Acid, Taurine, Sodium Benzoate, Yellow 5 (Tartrazine).</div></div>`,
        overallBadge:{text:'Rejected (45%)',class:'badge badge-danger-glow'},
        nutriPills:[{text:'Sugar: 70g (HIGH)',class:'warn'},{text:'Caffeine: 320mg/L (CRITICAL)',class:'warn'},{text:'Fat: 0g (Passed)',class:'pass'}],
        warnings:[{text:'Caffeine concentration (320 mg/L) violates FSSAI max of 145 mg/L for carbonated drinks.',class:'danger-warning'},{text:'Contains Yellow 5 (Tartrazine) — requires artificial colouring declaration.',class:'info-warning'}],
        mandatory:'"CONTAINS CAFFEINE. NOT RECOMMENDED FOR CHILDREN, PREGNANT OR LACTATING WOMEN." — WARNING STATEMENT MISSING',
        verdict:{class:'verdict-rejected',icon:'<i class="fa-solid fa-circle-xmark" aria-hidden="true"></i>',title:'REJECTED: Regulatory Breach',desc:'Caffeine exceeds carbonated drink limits and mandatory health warning is absent.'}
    },
    'potato-chips': {
        labelHTML:`<div class="mock-label"><h4>SPICY MASALA CHIPS</h4><div class="label-section"><div class="label-row label-bold"><span>Nutrition Facts</span></div><div class="label-row"><span>Serving Size: 30g</span></div></div><div class="label-section"><div class="label-row label-bold"><span>Amount Per Serving</span></div><div class="label-row"><span>Total Fat</span><span>11g (17%)</span></div><div class="label-row"><span>Saturated Fat</span><span>4.5g (23%)</span></div><div class="label-row"><span>Sodium</span><span>380mg (16%)</span></div><div class="label-row"><span>Sugars</span><span>0.5g</span></div></div><div class="ingredients-box"><strong>Ingredients:</strong> Potatoes, Vegetable Oil, MSG, Chili Powder, Garlic Extract, Salt.</div></div>`,
        overallBadge:{text:'Warning (75%)',class:'badge badge-warning-glow'},
        nutriPills:[{text:'Sodium: 380mg (HIGH)',class:'warn'},{text:'Saturated Fat: 4.5g (HIGH)',class:'warn'},{text:'Sugar: 0.5g (Low)',class:'pass'}],
        warnings:[{text:'Contains MSG (flavour enhancer 621) — not explicitly listed in allergen warnings block.',class:'danger-warning'}],
        mandatory:'"CONTAINS ADDED MONOSODIUM GLUTAMATE. NOT RECOMMENDED FOR INFANTS." — Present on side, verified.',
        verdict:{class:'verdict-warning',icon:'<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>',title:'WARNING: High Sodium & Saturated Fats',desc:'Label passes legal declarations but triggers high sodium/fat warnings requiring front-of-pack red stickers.'}
    },
    'baby-cereal': {
        labelHTML:`<div class="mock-label"><h4>GROWMAX BABY CEREAL</h4><div class="label-section"><div class="label-row label-bold"><span>Nutrition Facts</span></div><div class="label-row"><span>Serving Size: 50g</span></div></div><div class="label-section"><div class="label-row label-bold"><span>Amount Per Serving</span></div><div class="label-row"><span>Protein</span><span>6.2g</span></div><div class="label-row"><span>Sugars</span><span>2g</span></div><div class="label-row"><span>Iron (Fortified)</span><span>5mg (60%)</span></div><div class="label-row"><span>Calcium</span><span>120mg</span></div></div><div class="ingredients-box"><strong>Ingredients:</strong> Whole Wheat Flour, Skimmed Milk Powder, Honey, Iron Pyrophosphate, Calcium Carbonate.</div></div>`,
        overallBadge:{text:'Approved (96%)',class:'badge badge-success-glow'},
        nutriPills:[{text:'Added Sugar: 2g (Passed)',class:'pass'},{text:'Protein: 6.2g (Optimal)',class:'pass'},{text:'Iron: Fortified (Optimal)',class:'pass'}],
        warnings:[{text:'Contains Wheat (Gluten) and Milk — allergen declaration correctly highlighted.',class:'info-warning'}],
        mandatory:'"INFANT FOOD. USE ONLY UNDER MEDICAL ADVICE." — Present on front panel, verified.',
        verdict:{class:'verdict-approved',icon:'<i class="fa-solid fa-circle-check" aria-hidden="true"></i>',title:'APPROVED: Fully Compliant',desc:'All allergen callouts and mandatory infant disclaimer sentences are correct.'}
    }
};

function updateLabelGraphic() {
    labelImageDisplay.innerHTML = products[productSelect.value].labelHTML;
    uploadedFile = null;
    labelBadge.textContent = 'Awaiting Scan'; labelBadge.className = 'badge badge-secondary';
    nutriPills.innerHTML = ''; ingredientWarns.innerHTML = '';
    mandatoryBox.textContent = 'Please run the scan to parse nutritional details.';
    verdictBox.className = 'compliance-verdict-box hidden';
}
productSelect.addEventListener('change', updateLabelGraphic);
updateLabelGraphic();

function renderLabelReport(data) {
    labelBadge.textContent = data.overallBadge.text;
    labelBadge.className   = data.overallBadge.class;
    nutriPills.innerHTML = '';
    data.nutriPills.forEach(pill => {
        const span = document.createElement('span');
        span.className = `nutri-pill ${pill.class}`;
        span.innerHTML = `${pill.class === 'pass' ? '<i class="fa-solid fa-circle-check" aria-hidden="true"></i>' : '<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>'} ${pill.text}`;
        nutriPills.appendChild(span);
    });
    ingredientWarns.innerHTML = '';
    data.warnings.forEach(w => {
        const div = document.createElement('div');
        div.className = `warning-item ${w.class}`;
        div.innerHTML = `<i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i><span>${w.text}</span>`;
        ingredientWarns.appendChild(div);
    });
    mandatoryBox.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-warning" aria-hidden="true"></i> <span>${data.mandatory}</span>`;
    verdictBox.className = `compliance-verdict-box ${data.verdict.class}`;
    verdictBox.innerHTML = `<div class="verdict-icon">${data.verdict.icon}</div><div class="verdict-info"><span class="verdict-title">${data.verdict.title}</span><span class="verdict-desc">${data.verdict.desc}</span></div>`;
}

btnStartScan.addEventListener('click', async () => {
    scannerWindow.classList.add('scan-active');
    scanningOverlay.classList.remove('hidden');
    btnStartScan.disabled = true;
    btnStartScan.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> Scanning...';

    if (uploadedFile) {
        scanningOverlay.querySelector('p').textContent = 'Running AI compliance analysis...';
        try {
            const formData = new FormData();
            formData.append('labelImage', uploadedFile);
            const res = await fetch('/api/validate-label', { method:'POST', body:formData });
            scannerWindow.classList.remove('scan-active');
            scanningOverlay.classList.add('hidden');
            btnStartScan.disabled = false;
            btnStartScan.innerHTML = '<i class="fa-solid fa-qrcode" aria-hidden="true"></i> Scan Label & Validate Ingredients';
            const data = await res.json();
            if (data.source === 'ai' && data.report) {
                renderLabelReport(data.report);
                showToast({ title: 'AI Analysis Complete', message: 'Label compliance report generated.', type: 'success' });
            } else {
                renderLabelReport(products[productSelect.value]);
                showToast({ title: 'Fallback Mode', message: 'Using sample data — configure Gemini API key for AI analysis.', type: 'warning' });
            }
        } catch {
            scannerWindow.classList.remove('scan-active');
            scanningOverlay.classList.add('hidden');
            btnStartScan.disabled = false;
            btnStartScan.innerHTML = '<i class="fa-solid fa-qrcode" aria-hidden="true"></i> Scan Label & Validate Ingredients';
            renderLabelReport(products[productSelect.value]);
            showToast({ title: 'Network Error', message: 'Using local data as fallback.', type: 'warning' });
        }
    } else {
        setTimeout(() => {
            scannerWindow.classList.remove('scan-active');
            scanningOverlay.classList.add('hidden');
            btnStartScan.disabled = false;
            btnStartScan.innerHTML = '<i class="fa-solid fa-qrcode" aria-hidden="true"></i> Scan Label & Validate Ingredients';
            renderLabelReport(products[productSelect.value]);
            showToast({ title: 'Scan Complete', message: 'Label compliance audit report generated.', type: 'success' });
        }, 2000);
    }
});

/* -------------------------------------------------------
   MODULE 5: RECALL PREDICTION DASHBOARD
   ------------------------------------------------------- */
let recallChart = null;

function initRecallChart() {
    const ctx = document.getElementById('riskChart');
    if (!ctx || recallChart) return;
    const mkGrad = (c1, c2) => { const g = ctx.getContext('2d').createLinearGradient(0,0,0,200); g.addColorStop(0,c1); g.addColorStop(1,c2); return g; };
    recallChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan 2026','Feb 2026','Mar 2026','Apr 2026','May 2026','Jun 2026 (Proj)'],
            datasets: [
                { label:'E. coli Risk Index',    data:[15,22,19,45,68,78], borderColor:'#8B5CF6', backgroundColor:mkGrad('rgba(139,92,246,.22)','rgba(139,92,246,0)'), fill:true, tension:.4, borderWidth:2.5, pointBackgroundColor:'#8B5CF6', pointRadius:3 },
                { label:'Salmonella Outbreaks',  data:[28,30,15,24,38,42], borderColor:'#F59E0B', backgroundColor:mkGrad('rgba(245,158,11,.22)','rgba(245,158,11,0)'), fill:true, tension:.4, borderWidth:2.5, pointBackgroundColor:'#F59E0B', pointRadius:3 },
                { label:'Listeria Contamination',data:[52,48,32,20,12,8],  borderColor:'#3B82F6', backgroundColor:mkGrad('rgba(59,130,246,.22)','rgba(59,130,246,0)'),  fill:true, tension:.4, borderWidth:2.5, pointBackgroundColor:'#3B82F6', pointRadius:3 }
            ]
        },
        options: {
            responsive:true, maintainAspectRatio:false,
            plugins:{ legend:{ labels:{ color:'#64748B', font:{family:'Inter',size:10}, boxWidth:12 }}},
            scales:{
                x:{ grid:{color:'rgba(0,0,0,0.04)'}, ticks:{color:'#6B7280',font:{size:9}} },
                y:{ min:0, max:100, grid:{color:'rgba(0,0,0,0.04)'}, ticks:{color:'#6B7280',font:{size:9}, callback:v=>v+'%'}}
            }
        }
    });
}

const supplierTableBody  = document.getElementById('supplier-table-body');
const liveAlertsFeed     = document.getElementById('live-alerts-feed');
const actionDetailsPanel = document.getElementById('action-details-panel');

const supplierData = [
    { id:'S-102', batch:'B-402', pathogen:'E. coli trace risk', risk:'78%', status:'monitored' },
    { id:'S-208', batch:'B-389', pathogen:'Salmonella warning',  risk:'42%', status:'cleared' },
    { id:'S-090', batch:'B-411', pathogen:'Listeria risk',        risk:'84%', status:'quarantined' }
];

let feedAlerts = [
    { time:'2 mins ago', type:'danger',  text:'E. coli trace risk detected in Supplier S-102 Batch B-402 due to temperature deviation in logistics transport.' },
    { time:'1 hour ago', type:'info',    text:'Supplier S-208 Batch B-389 passed double sanitization verify loop. Heavy metal assay confirms safe PPM.' },
    { time:'3 hours ago',type:'warning', text:'Listeria outbreak vector warning for Supplier S-090 district. Batch quarantine initialized.' }
];

function updateSupplierTable() {
    supplierTableBody.innerHTML = '';
    supplierData.forEach(sup => {
        const tr = document.createElement('tr');
        const statusClasses = { quarantined:'status-pill quarantined', monitored:'status-pill monitored', cleared:'status-pill cleared' };
        const riskClass = sup.status==='quarantined' ? 'text-danger' : sup.status==='monitored' ? 'text-warning' : 'text-success';
        tr.innerHTML = `<td><strong>${sup.id}</strong></td><td>${sup.batch}</td><td><span class="${riskClass}">${sup.pathogen}</span></td><td><strong>${sup.risk}</strong></td><td><button class="${statusClasses[sup.status]}" data-sup="${sup.id}" aria-label="Change status for ${sup.id}">${sup.status.toUpperCase()}</button></td>`;
        const btn = tr.querySelector('.status-pill');
        btn.addEventListener('click', () => { if (sup.status==='monitored') quarantineAction(sup.id); else if (sup.status==='quarantined') clearAction(sup.id); });
        supplierTableBody.appendChild(tr);
    });
}

function renderFeed() {
    liveAlertsFeed.innerHTML = '';
    feedAlerts.forEach(alert => {
        const div = document.createElement('div');
        div.className = `feed-item feed-${alert.type}`;
        div.innerHTML = `<div class="feed-details"><span class="feed-title">${alert.type==='danger'?'Critical Risk Alarm':alert.type==='warning'?'Outbreak Vector Warning':'Assurance Approved'}</span><span class="feed-meta">${alert.text}</span></div><span class="feed-time-badge">${alert.time}</span>`;
        liveAlertsFeed.appendChild(div);
    });
}

function quarantineAction(id) {
    const sup = supplierData.find(s => s.id === id);
    if (!sup) return;
    sup.status = 'quarantined'; sup.risk = '12%';
    updateSupplierTable();
    document.getElementById('metric-risk-index').textContent = 'Moderate (35%)';
    document.getElementById('metric-risk-index').className = 'metric-value text-warning';
    document.getElementById('metric-alert-count').textContent = '1 Active';
    document.getElementById('metric-quarantine-count').textContent = '15 Batches';
    feedAlerts.unshift({ time:'Just now', type:'warning', text:`Batch ${sup.batch} from Supplier ${sup.id} quarantined. Containment procedures initiated.` });
    if (feedAlerts.length > 5) feedAlerts.pop();
    renderFeed();
    renderActionPanel();
    showToast({ title: 'Batch Quarantined', message: `Supplier ${id} Batch ${sup.batch} isolated successfully.`, type: 'warning', duration: 4000 });
}

function clearAction(id) {
    const sup = supplierData.find(s => s.id === id);
    if (!sup) return;
    sup.status = 'cleared'; sup.risk = '5%';
    updateSupplierTable();
    feedAlerts.unshift({ time:'Just now', type:'info', text:`Batch ${sup.batch} cleared from quarantine after sanitation tests.` });
    if (feedAlerts.length > 5) feedAlerts.pop();
    renderFeed();
    renderActionPanel();
    showToast({ title: 'Batch Cleared', message: `Supplier ${id} Batch ${sup.batch} cleared and released.`, type: 'success', duration: 4000 });
}

function renderActionPanel() {
    const hi = supplierData.find(s => s.status === 'monitored');
    if (hi) {
        actionDetailsPanel.innerHTML = `
            <div class="action-meta">TARGET: SUPPLIER ${hi.id} | BATCH ${hi.batch} | PROBABILITY: ${hi.risk}</div>
            <div class="action-instruction">High probability E. coli trace contamination risk. FSSAI Chapter 3 requires physical quarantine and formal supplier diagnostic auditing.</div>
            <div class="action-buttons">
                <button class="btn btn-teal" id="btn-quarantine-now"><i class="fa-solid fa-ban" aria-hidden="true"></i> Quarantine Batch</button>
                <button class="btn btn-secondary" id="btn-notify-supplier"><i class="fa-solid fa-envelope" aria-hidden="true"></i> Send Alert Email</button>
            </div>`;
        document.getElementById('btn-quarantine-now').addEventListener('click', () => quarantineAction(hi.id));
        document.getElementById('btn-notify-supplier').addEventListener('click', () => {
            showToast({ title: 'Alert Dispatched', message: `Warning notification sent to Supplier ${hi.id} for Batch ${hi.batch}.`, type: 'info', duration: 4000 });
        });
    } else {
        actionDetailsPanel.innerHTML = `<div class="action-instruction" style="color:var(--text-secondary);text-align:center;padding:1rem 0;"><i class="fa-solid fa-circle-check text-success" style="font-size:1.5rem;display:block;margin-bottom:.5rem;" aria-hidden="true"></i>All critical batches quarantined or cleared. Risks are currently stabilized.</div>`;
    }
}

updateSupplierTable();
renderFeed();
renderActionPanel();

// Live feed simulation
setInterval(() => {
    if (document.getElementById('tab-recall-dash').classList.contains('active')) {
        const pathogens = ['Listeria','Salmonella','E. coli'];
        const p = pathogens[Math.floor(Math.random() * pathogens.length)];
        const b = Math.floor(Math.random() * 200) + 100;
        feedAlerts.unshift({ time:'Just now', type: Math.random()>.5 ? 'warning':'info', text:`Real-time sensor update: Batch B-${b} assay registers clean indices for ${p}.` });
        if (feedAlerts.length > 5) feedAlerts.pop();
        renderFeed();
    }
}, 15000);

/* -------------------------------------------------------
   MODULE 6: MULTILINGUAL VOICE AGENT
   ------------------------------------------------------- */
const voiceLangSelect    = document.getElementById('voice-lang');
const soundwave          = document.getElementById('soundwave-container');
const btnMicTrigger      = document.getElementById('btn-mic-trigger');
const micStatusLabel     = document.getElementById('mic-status-label');
const voiceConversation  = document.getElementById('voice-conversation-stream');
const quickVoiceChips    = document.querySelectorAll('.voice-chip-btn');
const speechSupportAlert = document.getElementById('speech-support-alert');

const voiceAnswers = {
    'en-IN': {
        'check restaurant hygiene rule': 'Under FSSAI Schedule 4, restaurants must maintain potable water testing records, segregate foods properly, keep products off the ground, and ensure handlers have medical certification.',
        'what are organic food logo regulations': 'Organic packages must carry the Jaivik Bharat organic symbol alongside the FSSAI logo. The logo features a leaf and circle representing natural purity.',
        'recommend corrective action for bacteria': 'For bacterial contamination: quarantine the batch immediately, sanitize with quaternary ammonium at 200 ppm, and increase pasteurization to 72°C for 15 seconds.',
        'default': 'I received your command. FSSAI standards suggest checking raw material logs and scheduling regular cleaning sessions. Please repeat your query clearly.'
    },
    'hi-IN': {
        'डेयरी उत्पाद शेल्फ लाइफ नियम क्या है': 'एफएसएसएआई के नियमों के अनुसार, पास्चुरीकृत दूध को 4°C से कम तापमान पर रखा जाना चाहिए। इसकी शेल्फ लाइफ 2 से 3 दिन की होती है।',
        'हलाल और शाकाहारी मार्क नियम क्या है': 'शाकाहारी भोजन के लिए पैकेज पर हरे रंग का बिंदु होना अनिवार्य है — एक चौकोर हरे बॉक्स के अंदर हरा गोल बिंदु।',
        'default': 'मुझे आपका निर्देश मिल गया है। खाद्य सुरक्षा नियमों का पालन करें और स्वच्छता बनाए रखें।'
    },
    'ta-IN': {
        'உணவு பாதுகாப்பு உரிமம் பெறுவது எப்படி': 'வருடாந்திர வருவாய் ₹12 லட்சத்திற்கு மேல் இருந்தால் மாநில உரிமம் தேவை. ₹20 கோடிக்கு மேல் மத்திய உரிமம் கட்டாயம்.',
        'உணவு லேபிள் விதிகள் என்ன': 'உணவு லேபிள்களில் தயாரிப்பாளர் முகவரி, காலாவதி தேதி, ஊட்டச்சத்து விவரங்கள் மற்றும் அலர்ஜி எச்சரிக்கைகள் கட்டாயம் இருக்க வேண்டும்.',
        'default': 'உங்கள் கட்டளை ஏற்றுக்கொள்ளப்பட்டது. உணவு பாதுகாப்பு சட்டத்தின்படி தரம் சரிபார்க்கப்படும்.'
    }
};

const SpeechRecognition  = window.SpeechRecognition || window.webkitSpeechRecognition;
const isSpeechSupported  = !!SpeechRecognition;
if (!isSpeechSupported) speechSupportAlert.style.display = 'flex';

function speakText(text, lang) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = lang;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith(lang.split('-')[0]) && v.lang.includes('IN')) || voices.find(v => v.lang.includes('IN'));
    if (voice) utt.voice = voice;
    utt.onstart = () => soundwave.classList.add('wave-active');
    utt.onend   = () => soundwave.classList.remove('wave-active');
    window.speechSynthesis.speak(utt);
}

function appendSpeechBubble(sender, speaker, text) {
    const bubble = document.createElement('div');
    bubble.className = `speech-bubble ${sender}`;
    bubble.innerHTML = `<span class="speaker-tag">${speaker}</span><p class="speech-text">${text}</p>`;
    voiceConversation.appendChild(bubble);
    voiceConversation.scrollTop = voiceConversation.scrollHeight;
}

function triggerVoiceSimulation(utterance, lang) {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    appendSpeechBubble('user', 'QA Auditor', `"${utterance}"`);
    soundwave.classList.add('wave-active');
    micStatusLabel.textContent = 'Analyzing command...';
    setTimeout(() => {
        soundwave.classList.remove('wave-active');
        const responses = voiceAnswers[lang] || voiceAnswers['en-IN'];
        const reply = responses[utterance] || responses['default'];
        appendSpeechBubble('assistant', 'AI Safety Assistant', reply);
        micStatusLabel.textContent = 'Click the microphone and say a command';
        speakText(reply, lang);
    }, 1200);
}

let recognition = null;
if (isSpeechSupported) {
    recognition = new SpeechRecognition();
    recognition.continuous = false; recognition.interimResults = false;
    recognition.onstart  = () => { document.getElementById('tab-voice-agent').classList.add('mic-listening'); soundwave.classList.add('wave-active'); micStatusLabel.textContent = 'Listening...'; };
    recognition.onerror  = () => { soundwave.classList.remove('wave-active'); document.getElementById('tab-voice-agent').classList.remove('mic-listening'); micStatusLabel.textContent = 'Speech error. Please try again.'; };
    recognition.onend    = () => document.getElementById('tab-voice-agent').classList.remove('mic-listening');
    recognition.onresult = e => triggerVoiceSimulation(e.results[0][0].transcript, voiceLangSelect.value);
}

btnMicTrigger.addEventListener('click', () => {
    const lang = voiceLangSelect.value;
    if (isSpeechSupported) {
        recognition.lang = lang; recognition.start();
    } else {
        document.getElementById('tab-voice-agent').classList.add('mic-listening');
        soundwave.classList.add('wave-active');
        micStatusLabel.textContent = 'Listening (Simulation)...';
        setTimeout(() => {
            document.getElementById('tab-voice-agent').classList.remove('mic-listening');
            soundwave.classList.remove('wave-active');
            const phrases = { 'en-IN':['check restaurant hygiene rule','what are organic food logo regulations','recommend corrective action for bacteria'], 'hi-IN':['डेयरी उत्पाद शेल्फ लाइफ नियम क्या है','हलाल और शाकाहारी मार्क नियम क्या है'], 'ta-IN':['உணவு பாதுகாப்பு உரிமம் பெறுவது எப்படி','உணவு லேபிள் விதிகள் என்ன'] };
            const list = phrases[lang] || phrases['en-IN'];
            triggerVoiceSimulation(list[Math.floor(Math.random()*list.length)], lang);
        }, 2500);
    }
});

quickVoiceChips.forEach(chip => chip.addEventListener('click', () => {
    voiceLangSelect.value = chip.getAttribute('data-lang');
    triggerVoiceSimulation(chip.getAttribute('data-utterance'), chip.getAttribute('data-lang'));
}));

if ('speechSynthesis' in window) window.speechSynthesis.getVoices();

}); // end DOMContentLoaded
