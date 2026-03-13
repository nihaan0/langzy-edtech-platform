// Vocabulary Page Logic
requireAuth();

let currentLanguage = 'Tamil';
let vocabulary = [];
let filteredVocabulary = [];
let currentFilter = 'all';
let currentCardIndex = 0;

// Fetch fresh user from API to get correct language
async function initPage() {
    try {
        const data = await apiCall('/auth/me');
        const user = data.user;
        saveUser(user);
        currentLanguage = user.currentLanguage || 'Tamil';
    } catch (e) {
        const user = getUser();
        currentLanguage = (user && user.currentLanguage) ? user.currentLanguage : 'Tamil';
    }
    const langInfo = getLanguageInfo(currentLanguage);
    const el = document.getElementById('languageName');
    if (el) el.textContent = `${langInfo.flag} ${langInfo.native}`;
    await loadVocabulary();
}

// Language Picker Modal
function openVocabLangPicker() {
    const modal = document.getElementById('vocabLangModal');
    const grid = document.getElementById('vocabLangGrid');
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    grid.innerHTML = '';
    Object.entries(LANGUAGES).forEach(([lang, info]) => {
        const card = document.createElement('div');
        const isActive = lang === currentLanguage;
        card.className = 'card';
        card.style.cssText = `cursor:pointer;padding:20px 12px;text-align:center;transition:all 0.2s;border:2px solid ${isActive ? 'var(--purple)' : 'transparent'};background:${isActive ? 'rgba(124,58,237,0.15)' : ''};`;
        card.innerHTML = `<div style="font-size:36px;margin-bottom:8px;">${info.flag}</div><p style="font-weight:600;font-size:14px;margin-bottom:2px;">${lang}</p><p style="font-size:12px;color:var(--text-muted);">${info.native}</p>${isActive ? '<p style="font-size:11px;color:var(--purple);margin-top:4px;">&#10003; Active</p>' : ''}`;
        card.onmouseover = () => { if (!isActive) card.style.border = '2px solid rgba(124,58,237,0.4)'; card.style.transform = 'translateY(-2px)'; };
        card.onmouseout = () => { if (!isActive) card.style.border = '2px solid transparent'; card.style.transform = ''; };
        card.onclick = () => switchVocabLang(lang);
        grid.appendChild(card);
    });
}
function closeVocabLangPicker() {
    document.getElementById('vocabLangModal').style.display = 'none';
    document.body.style.overflow = '';
}
async function switchVocabLang(lang) {
    currentLanguage = lang;
    closeVocabLangPicker();
    const langInfo = getLanguageInfo(lang);
    const el = document.getElementById('languageName');
    if (el) el.textContent = `${langInfo.flag} ${langInfo.native}`;
    showToast(`Viewing ${lang} vocabulary`, 'info');
    await loadVocabulary();
}

// Load vocabulary
async function loadVocabulary() {
    try {
        const data = await apiCall(`/vocabulary/${currentLanguage}`);
        vocabulary = data.vocabulary || [];
        filterWords(currentFilter);
        updateMasteredCount();
    } catch (error) {
        console.error('Failed to load vocabulary:', error);
        showToast('Failed to load vocabulary', 'error');
    }
}

// Filter words
function filterWords(filter) {
    currentFilter = filter;

    // Update button styles
    document.querySelectorAll('[id^="filter"]').forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
    });
    const activeBtn = document.getElementById(`filter${filter.charAt(0).toUpperCase() + filter.slice(1)}`);
    if (activeBtn) { activeBtn.classList.remove('btn-secondary'); activeBtn.classList.add('btn-primary'); }

    // Filter using 'strength' field: gold=mastered, faded=learning, broken=needs review
    const now = new Date();
    switch (filter) {
        case 'all': filteredVocabulary = vocabulary; break;
        case 'learning': filteredVocabulary = vocabulary.filter(w => w.strength === 'faded'); break;
        case 'mastered': filteredVocabulary = vocabulary.filter(w => w.strength === 'gold'); break;
        case 'review': filteredVocabulary = vocabulary.filter(w => w.strength === 'broken' || (w.nextReview && new Date(w.nextReview) <= now)); break;
    }
    renderWordGrid();
}

// Render word grid
function renderWordGrid() {
    const grid = document.getElementById('wordGrid');
    grid.innerHTML = '';

    if (filteredVocabulary.length === 0) {
        grid.innerHTML = '<p class="text-muted" style="padding:32px;text-align:center;">No words found in this category 📭<br><small>Complete lessons to add more words!</small></p>';
        return;
    }

    filteredVocabulary.forEach((word, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.cssText = 'cursor:pointer;position:relative;transition:transform 0.2s,box-shadow 0.2s;';
        card.onclick = () => showWordDetail(index);
        card.onmouseover = () => { card.style.transform = 'translateY(-4px)'; card.style.boxShadow = '0 8px 24px rgba(124,58,237,0.3)'; };
        card.onmouseout = () => { card.style.transform = ''; card.style.boxShadow = ''; };

        const strengthIcon = word.strength === 'gold' ? '🥇' : word.strength === 'faded' ? '🟡' : '🔴';
        const strengthLabel = word.strength === 'gold' ? 'Mastered' : word.strength === 'faded' ? 'Learning' : 'Review Now';
        card.innerHTML = `
            <div class="text-center">
                <div style="position:absolute;top:8px;right:8px;font-size:18px;" title="${strengthLabel}">${strengthIcon}</div>
                <h3 style="font-size:22px;margin-bottom:8px;">${word.word}</h3>
                <p class="text-muted" style="font-size:15px;margin-bottom:8px;">${word.translation}</p>
                <p style="font-size:12px;color:var(--text-muted);">Reviewed ${word.reviewCount || 0}x</p>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Show word detail
function showWordDetail(index) {
    currentCardIndex = index;
    const word = filteredVocabulary[index];
    const langCode = getLanguageCode(currentLanguage);

    const detail = document.createElement('div');
    detail.className = 'card';
    detail.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:1000;max-width:500px;width:90%;padding:32px;';
    const strengthIcon = word.strength === 'gold' ? '🥇 Mastered' : word.strength === 'faded' ? '🟡 Learning' : '🔴 Review Now';
    detail.innerHTML = `
        <button onclick="closeDetail()" style="position:absolute;top:16px;right:16px;background:none;border:none;font-size:24px;cursor:pointer;color:var(--text-primary);">✕</button>
        <div class="text-center">
            <p style="font-size:13px;color:var(--text-muted);margin-bottom:8px;">${strengthIcon}</p>
            <h2 style="font-size:36px;margin-bottom:12px;">${word.word}</h2>
            <button class="btn btn-secondary" onclick="speak('${word.word.replace(/'/g, '')}', '${langCode}')" style="margin-bottom:12px;">🔊 Pronounce</button>
            <p style="font-size:22px;margin:16px 0;color:var(--purple);">${word.translation}</p>
            <p style="font-size:13px;color:var(--text-muted);">Language: ${currentLanguage} · Reviewed ${word.reviewCount || 0}x</p>
        </div>
    `;
    document.body.appendChild(detail);

    const backdrop = document.createElement('div');
    backdrop.id = 'detailBackdrop';
    backdrop.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:999;';
    backdrop.onclick = closeDetail;
    document.body.appendChild(backdrop);
}

// Close detail view
function closeDetail() {
    const detail = document.querySelector('.card[style*="position: fixed"]');
    const backdrop = document.getElementById('detailBackdrop');
    if (detail) detail.remove();
    if (backdrop) backdrop.remove();
}

// Mark word as mastered
async function markAsMastered(wordId) {
    try {
        await apiCall('/vocabulary/mastered', {
            method: 'POST',
            body: JSON.stringify({ wordId, language: currentLanguage })
        });
        showToast('Word mastered! 🎉', 'success');
        triggerConfetti();
        closeDetail();
        loadVocabulary();
    } catch (error) {
        showToast('Failed to update word', 'error');
    }
}

function goBack() {
    if (window.history.length > 1) window.history.back();
    else window.location.href = 'home.html';
}

function updateMasteredCount() {
    const mastered = vocabulary.filter(w => w.strength === 'gold').length;
    const el = document.getElementById('masteredCount');
    if (el) el.textContent = mastered;
}

// Initialize
initPage();
