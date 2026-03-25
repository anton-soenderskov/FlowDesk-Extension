const STORAGE_KEY = 'blockedSites';
const ENABLED_KEY = 'blockingEnabled';
const TIMER_END_KEY = 'timerEndAt';

let countdownInterval = null;

const siteInput = document.getElementById('siteInput');
const addBtn = document.getElementById('addBtn');
const siteList = document.getElementById('siteList');
const errorMsg = document.getElementById('errorMsg');
const emptyMsg = document.getElementById('emptyMsg');
const countEl = document.getElementById('count');
const toggle = document.getElementById('enabledToggle');
const toggleLabel = document.getElementById('toggleLabel');
const timerBtn = document.querySelector('.timerBtn');
const timerDisplay = document.getElementById('timerDisplay');
const statusBar = document.getElementById('statusBar');
const statusText = document.getElementById('statusText');

// ── Helpers ────────────────────────────────────

function normalizeDomain(raw) {
    return raw.trim().toLowerCase()
        .replace(/^https?:\/\//i, '')
        .replace(/^www\./i, '')
        .split('/')[0];
}

function isValidDomain(domain) {
    return /^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?(\.[a-z0-9\-]+)+$/.test(domain);
}

function showError(msg) { errorMsg.textContent = msg; }
function clearError() { errorMsg.textContent = ''; }

// ── Storage ────────────────────────────────────

function loadSites(cb) {
    chrome.storage.local.get(STORAGE_KEY, (r) => cb(r[STORAGE_KEY] || []));
}

function saveSites(sites, cb) {
    chrome.storage.local.set({ [STORAGE_KEY]: sites }, cb);
}

function loadEnabled(cb) {
    chrome.storage.local.get(ENABLED_KEY, (r) => cb(r[ENABLED_KEY] ?? false));
}

function saveEnabled(val, cb) {
    chrome.storage.local.set({ [ENABLED_KEY]: val }, cb);
}

// ── Toggle UI ──────────────────────────────────

function applyEnabledState(enabled) {
    toggle.checked = enabled;
    toggleLabel.textContent = enabled ? 'On' : 'Off';
    siteInput.disabled = !enabled;
    addBtn.disabled = !enabled;

    if (statusBar) {
        statusBar.className = 'status-bar ' + (enabled ? 'active' : 'inactive');
        statusText.textContent = enabled ? 'Blocking active' : 'Blocking inactive';
    }
}

// ── Render list ────────────────────────────────

function renderList(sites) {
    siteList.innerHTML = '';
    countEl.textContent = sites.length;
    emptyMsg.style.display = sites.length === 0 ? 'block' : 'none';

    sites.forEach((site) => {
        const li = document.createElement('li');
        li.className = 'site-item';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'site-name';
        nameSpan.textContent = site;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = '×';
        removeBtn.title = 'Remove';
        removeBtn.addEventListener('click', () => removeSite(site));

        li.appendChild(nameSpan);
        li.appendChild(removeBtn);
        siteList.appendChild(li);
    });
}

// ── Actions ────────────────────────────────────

function addSite() {
    const domain = normalizeDomain(siteInput.value);
    if (!domain) { showError('Enter a domain.'); return; }
    if (!isValidDomain(domain)) { showError('Invalid domain (e.g. reddit.com).'); return; }

    clearError();
    loadSites((sites) => {
        if (sites.includes(domain)) { showError(`${domain} is already blocked.`); return; }
        const updated = [domain, ...sites];
        saveSites(updated, () => {
            renderList(updated);
            siteInput.value = '';
            siteInput.focus();
        });
    });
}

function removeSite(domain) {
    loadSites((sites) => {
        const updated = sites.filter((s) => s !== domain);
        saveSites(updated, () => renderList(updated));
    });
}

function addTime() {
    chrome.storage.local.get(TIMER_END_KEY, (result) => {
        const now = Date.now();
        const currentEnd = result[TIMER_END_KEY] || now;
        const base = currentEnd > now ? currentEnd : now;
        const newEnd = base + 5 * 60 * 1000;

        chrome.storage.local.set({ [TIMER_END_KEY]: newEnd });
        saveEnabled(true, () => applyEnabledState(true));
        startCountdown(newEnd);
    });
}

function updateTimerDisplay(remainingMs) {
    const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function startCountdown(endAt) {
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
        const remaining = endAt - Date.now();
        if (remaining <= 0) {
            clearInterval(countdownInterval);
            countdownInterval = null;
            updateTimerDisplay(0);
            return;
        }
        updateTimerDisplay(remaining);
    }, 500);
}

// ── Init ───────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get([STORAGE_KEY, ENABLED_KEY, TIMER_END_KEY], (result) => {
        renderList(result[STORAGE_KEY] || []);
        applyEnabledState(result[ENABLED_KEY] ?? false);

        const endAt = result[TIMER_END_KEY] || 0;
        const remaining = endAt - Date.now();
        updateTimerDisplay(Math.max(0, remaining));
        if (remaining > 0) startCountdown(endAt);
    });

    timerBtn.addEventListener('click', addTime);

    toggle.addEventListener('change', () => {
        chrome.storage.local.get(TIMER_END_KEY, (r) => {
            if (!toggle.checked && r[TIMER_END_KEY] > Date.now()) {
                toggle.checked = true;
                return;
            }
            saveEnabled(toggle.checked, () => applyEnabledState(toggle.checked));
        });
    });

    addBtn.addEventListener('click', addSite);
    siteInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addSite(); });
    siteInput.addEventListener('input', clearError);
});