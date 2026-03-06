/* ============================================
   Daily Updates App — Core Logic
   Auto-refresh, date nav, filtering, search
   Works with GitHub Pages (no manifest needed)
   ============================================ */

(function () {
  'use strict';

  // ---- Config ----
  const AUTO_REFRESH_INTERVAL = 60_000; // 60 seconds
  const MAX_LOOKBACK_DAYS = 30; // How far back to scan for dates

  // ---- State ----
  let currentDate = getTodayStr();
  let allUpdates = [];
  let activeCategory = 'all';
  let searchQuery = '';
  let knownDates = [];
  let autoRefreshTimer = null;

  // ---- DOM refs ----
  const $ = (sel) => document.querySelector(sel);
  const cardsGrid = $('#cardsGrid');
  const emptyState = $('#emptyState');
  const loadingState = $('#loadingState');
  const dateLabel = $('#dateLabel');
  const dateFull = $('#dateFull');
  const prevBtn = $('#prevDate');
  const nextBtn = $('#nextDate');
  const searchInput = $('#searchInput');
  const filtersEl = $('#filters');
  const totalCount = $('#totalCount');
  const freeCount = $('#freeCount');
  const trendingCount = $('#trendingCount');
  const toast = $('#toast');
  const toastText = $('#toastText');

  // ---- Platform config ----
  const PLATFORM_META = {
    web: { icon: '🌐', label: 'Web' },
    ios: { icon: '🍎', label: 'iOS' },
    android: { icon: '🤖', label: 'Android' },
    mac: { icon: '💻', label: 'Mac' },
    windows: { icon: '🪟', label: 'Windows' },
    desktop: { icon: '🖥️', label: 'Desktop' },
  };

  const CATEGORY_LABELS = {
    'ai-productivity': '🧠 AI Productivity',
    'ai-coding': '💻 AI Coding',
    'ai-image-video': '🎨 AI Image/Video',
    'ai-chatbot': '💬 AI Chatbot',
    'web-app': '🌐 Web App',
    'mobile-app': '📱 Mobile App',
  };

  // ---- Helpers ----
  function getTodayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function getDateLabel(dateStr) {
    const today = getTodayStr();
    if (dateStr === today) return 'Today';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    if (dateStr === yStr) return 'Yesterday';
    return formatDate(dateStr);
  }

  function shiftDate(dateStr, days) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // ---- Date Discovery (no manifest needed!) ----
  // Scans backward from today to find which dates have JSON files
  async function discoverDates() {
    const today = getTodayStr();
    const discovered = [];
    const checks = [];

    for (let i = 0; i < MAX_LOOKBACK_DAYS; i++) {
      const dateStr = shiftDate(today, -i);
      checks.push(
        fetch(`${dateStr}.json`, { method: 'HEAD' })
          .then((resp) => (resp.ok ? dateStr : null))
          .catch(() => null)
      );
    }

    const results = await Promise.all(checks);
    for (const dateStr of results) {
      if (dateStr) discovered.push(dateStr);
    }

    knownDates = discovered.sort();
    return knownDates;
  }

  async function loadDateData(dateStr) {
    const filename = `${dateStr}.json`;
    try {
      const resp = await fetch(`${filename}?_=${Date.now()}`);
      if (!resp.ok) throw new Error('Not found');
      const data = await resp.json();
      return data.updates || [];
    } catch {
      return null;
    }
  }

  // ---- Rendering ----
  function renderCards(updates) {
    if (!updates || updates.length === 0) {
      cardsGrid.style.display = 'none';
      emptyState.style.display = 'block';
      emptyState.querySelector('h2').textContent = 'No updates for this date';
      emptyState.querySelector('p').textContent = 'Check back tomorrow or browse a different day';
      loadingState.style.display = 'none';
      updateStats([]);
      return;
    }

    // Apply filters
    let filtered = updates;
    if (activeCategory !== 'all') {
      filtered = filtered.filter((u) => u.category === activeCategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.description.toLowerCase().includes(q)
      );
    }

    if (filtered.length === 0) {
      cardsGrid.style.display = 'none';
      emptyState.style.display = 'block';
      emptyState.querySelector('h2').textContent = 'No matches found';
      emptyState.querySelector('p').textContent = 'Try a different filter or search term';
    } else {
      cardsGrid.style.display = 'flex';
      emptyState.style.display = 'none';
    }
    loadingState.style.display = 'none';

    cardsGrid.innerHTML = filtered
      .map((item, i) => buildCard(item, i))
      .join('');

    updateStats(updates);
  }

  function buildCard(item, index) {
    const catClass = `cat-${item.category}`;
    const catLabel =
      CATEGORY_LABELS[item.category] ||
      item.category.replace(/-/g, ' ');
    const trendingClass = item.trending ? 'trending' : '';

    const badges = [];
    if (item.trending) {
      badges.push('<span class="badge badge-trending">🔥 Trending</span>');
    }
    if (item.isFree) {
      badges.push('<span class="badge badge-free">FREE</span>');
    } else {
      badges.push('<span class="badge badge-paid">PAID</span>');
    }

    const platforms = (item.platforms || [])
      .map((p) => {
        const meta = PLATFORM_META[p] || { icon: '📦', label: p };
        return `<span class="platform-pill"><span class="p-icon">${meta.icon}</span>${meta.label}</span>`;
      })
      .join('');

    return `
      <article class="card ${trendingClass}" style="animation-delay: ${index * 0.06}s">
        <div class="card-category ${catClass}">${catLabel}</div>
        <div class="card-header">
          <div class="card-title-group">
            <h3 class="card-title">
              ${escapeHtml(item.name)}
              ${badges.join('')}
            </h3>
          </div>
        </div>
        <p class="card-desc">${escapeHtml(item.description)}</p>
        <div class="card-footer">
          <div class="platforms">${platforms}</div>
          <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" class="try-btn">
            Try it
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>
          </a>
        </div>
      </article>
    `;
  }

  function escapeHtml(str) {
    const el = document.createElement('span');
    el.textContent = str;
    return el.innerHTML;
  }

  function updateStats(updates) {
    totalCount.textContent = updates.length;
    freeCount.textContent = updates.filter((u) => u.isFree).length;
    trendingCount.textContent = updates.filter((u) => u.trending).length;
  }

  function updateDateDisplay() {
    dateLabel.textContent = getDateLabel(currentDate);
    dateFull.textContent = formatDate(currentDate);

    // Disable next if current date is today or beyond
    const today = getTodayStr();
    nextBtn.disabled = currentDate >= today;

    // Disable prev if no earlier dates known
    if (knownDates.length > 0) {
      prevBtn.disabled = currentDate <= knownDates[0];
    } else {
      prevBtn.disabled = false; // Allow exploring
    }
  }

  // ---- Navigation ----
  async function goToDate(dateStr) {
    currentDate = dateStr;
    updateDateDisplay();
    showLoading();

    const updates = await loadDateData(dateStr);
    allUpdates = updates || [];
    renderCards(allUpdates);
  }

  function showLoading() {
    cardsGrid.style.display = 'none';
    emptyState.style.display = 'none';
    loadingState.style.display = 'block';
  }

  // ---- Auto-refresh ----
  async function checkForUpdates() {
    const prevDatesSet = new Set(knownDates);
    await discoverDates();

    // Check if new dates appeared
    const newDates = knownDates.filter((d) => !prevDatesSet.has(d));
    if (newDates.length > 0) {
      showToast(`New updates for ${newDates.map(formatDate).join(', ')}!`);
      // Auto-navigate to latest new date
      const today = getTodayStr();
      if (currentDate === today || newDates.includes(today)) {
        goToDate(today);
      }
      updateDateDisplay();
      return;
    }

    // Also reload current date data in case it was updated
    const freshData = await loadDateData(currentDate);
    if (freshData && JSON.stringify(freshData) !== JSON.stringify(allUpdates)) {
      allUpdates = freshData;
      renderCards(allUpdates);
      showToast('Content refreshed!');
    }
  }

  function startAutoRefresh() {
    if (autoRefreshTimer) clearInterval(autoRefreshTimer);
    autoRefreshTimer = setInterval(checkForUpdates, AUTO_REFRESH_INTERVAL);
  }

  function showToast(message) {
    toastText.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 4000);
  }

  // ---- Event handlers ----
  function setupEvents() {
    prevBtn.addEventListener('click', () => {
      const idx = knownDates.indexOf(currentDate);
      if (idx > 0) {
        goToDate(knownDates[idx - 1]);
      } else {
        // Try previous calendar day
        goToDate(shiftDate(currentDate, -1));
      }
    });

    nextBtn.addEventListener('click', () => {
      const today = getTodayStr();
      if (currentDate >= today) return;
      const idx = knownDates.indexOf(currentDate);
      if (idx >= 0 && idx < knownDates.length - 1) {
        goToDate(knownDates[idx + 1]);
      } else {
        goToDate(shiftDate(currentDate, 1));
      }
    });

    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      renderCards(allUpdates);
    });

    filtersEl.addEventListener('click', (e) => {
      const pill = e.target.closest('.filter-pill');
      if (!pill) return;
      filtersEl.querySelectorAll('.filter-pill').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      activeCategory = pill.dataset.category;
      renderCards(allUpdates);
    });
  }

  // ---- Init ----
  async function init() {
    setupEvents();
    showLoading();

    // Discover available dates (no manifest needed!)
    await discoverDates();

    // If today has no data, find the most recent date that does
    if (knownDates.length > 0 && !knownDates.includes(currentDate)) {
      currentDate = knownDates[knownDates.length - 1]; // Most recent available
    }

    updateDateDisplay();
    await goToDate(currentDate);
    startAutoRefresh();
  }

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
