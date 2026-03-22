(function () {
    const STORAGE_KEY = 'blockedSites';
    const ENABLED_KEY = 'blockingEnabled';

    function normalizeDomain(hostname) {
        return hostname.toLowerCase().replace(/^www\./, '');
    }

    chrome.storage.local.get([STORAGE_KEY, ENABLED_KEY], (result) => {
        const enabled = result[ENABLED_KEY] ?? false;
        if (!enabled) return;

        const blocked = result[STORAGE_KEY] || [];
        const current = normalizeDomain(window.location.hostname);

        const isBlocked = blocked.some((site) =>
            current === site || current.endsWith('.' + site)
        );

        if (!isBlocked) return;

        document.documentElement.innerHTML = '';
        document.head.innerHTML = `
            <meta charset="UTF-8">
            <title>Blocked — FlowDesk</title>
            <style>
                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                body {
                    background: #111;
                    color: #e0e0e0;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    text-align: center;
                }
                .card {
                    max-width: 420px;
                    padding: 48px 40px;
                    background: #1a1a1a;
                    border: 1px solid #242424;
                    border-radius: 12px;
                }
                .icon { font-size: 36px; margin-bottom: 20px; display: block; }
                h1 { font-size: 20px; font-weight: 600; color: #fff; margin-bottom: 10px; }
                p { font-size: 14px; color: #666; line-height: 1.6; }
                .domain { color: #4a80ff; font-weight: 500; }
                .back-btn {
                    display: inline-block;
                    margin-top: 28px;
                    padding: 9px 20px;
                    background: #1e1e1e;
                    border: 1px solid #2e2e2e;
                    border-radius: 6px;
                    color: #aaa;
                    font-size: 13px;
                    cursor: pointer;
                    text-decoration: none;
                    transition: background 0.15s;
                }
                .back-btn:hover { background: #252525; }
            </style>
        `;
        document.body.innerHTML = `
            <div class="card">
                <span class="icon">🚫</span>
                <h1>This site is blocked</h1>
                <p><span class="domain">${current}</span> is on your FlowDesk block list. Stay focused.</p>
                <a class="back-btn" href="javascript:history.back()">← Go back</a>
            </div>
        `;
    });
})();