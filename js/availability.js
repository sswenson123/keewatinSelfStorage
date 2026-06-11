/**
 * Keewatin Self Storage — Live Availability Badges
 * Reads data/availability.json and updates all unit cards on the page.
 * - Available units  → green badge + Reserve button
 * - Unavailable units → red badge + Join Waiting List button (modal)
 */
(function () {
  const JSON_PATH = 'data/availability.json';

  // Unit size labels for the modal title
  const LABELS = {
    '8x10':  '8×10 Unit (80 sq ft) — $60/mo',
    '10x10': '10×10 Unit (100 sq ft) — $85/mo',
    '12x10': '12×10 Unit (120 sq ft) — $90/mo',
    '10x24': '10×24 Unit (240 sq ft) — $115/mo',
  };

  function applyAvailability(data) {
    const units = data.units || {};

    Object.entries(units).forEach(([key, unit]) => {
      document.querySelectorAll(`[data-unit="${key}"]`).forEach(card => {

        // ── Availability badge ──────────────────────────────────
        card.querySelectorAll('.avail-badge').forEach(b => b.remove());
        const badge = document.createElement('div');
        badge.className   = 'avail-badge ' + (unit.available ? 'avail-yes' : 'avail-no');
        badge.textContent = unit.available ? '✅ Available' : '🔴 Not Available';
        card.insertBefore(badge, card.firstChild);

        // ── Primary action button ───────────────────────────────
        // Find the last <a> or <button> in the card (the CTA)
        const btns = card.querySelectorAll('a.btn, button.btn');
        const cta  = btns[btns.length - 1];
        if (!cta) return;

        if (unit.available) {
          // Unit is open — show Reserve button, remove any waitlist button
          cta.style.display = '';
          card.querySelectorAll('.waitlist-btn').forEach(b => b.remove());
        } else {
          // Unit is full — hide Reserve button, show Join Waiting List
          cta.style.display = 'none';
          card.querySelectorAll('.waitlist-btn').forEach(b => b.remove());

          const wlBtn = document.createElement('button');
          wlBtn.className       = 'btn btn-block waitlist-btn';
          wlBtn.style.cssText   = 'background:#1755a8;color:#fff;border:2px solid #1755a8;width:100%;margin-top:auto;cursor:pointer;font-family:inherit;';
          wlBtn.textContent     = '📋 Join Waiting List';
          wlBtn.dataset.waitlist = key;
          wlBtn.dataset.label    = LABELS[key] || key;
          cta.parentNode.insertBefore(wlBtn, cta.nextSibling);
        }
      });
    });

    // Last-updated timestamp
    const ts = document.getElementById('avail-timestamp');
    if (ts && data.lastUpdated) {
      const d = new Date(data.lastUpdated);
      ts.textContent = 'Availability last checked: ' + d.toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit'
      });
    }
  }

  fetch(JSON_PATH + '?v=' + Date.now())
    .then(r => r.json())
    .then(applyAvailability)
    .catch(() => { /* silently fail — site works without JSON */ });
}());
