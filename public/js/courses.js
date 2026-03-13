// Courses Page Logic
requireAuth();

const LANG_CODE_MAP = {
    'ta': 'Tamil', 'hi': 'Hindi', 'te': 'Telugu', 'ml': 'Malayalam', 'kn': 'Kannada',
    'es': 'Spanish', 'fr': 'French', 'de': 'German', 'it': 'Italian', 'pt': 'Portuguese',
    'nl': 'Dutch', 'sv': 'Swedish', 'tr': 'Turkish', 'pl': 'Polish', 'el': 'Greek',
    'ru': 'Russian', 'ja': 'Japanese', 'zh': 'Chinese', 'ko': 'Korean', 'ar': 'Arabic',
    'en': 'English', 'ta-IN': 'Tamil', 'hi-IN': 'Hindi', 'ja-JP': 'Japanese',
    'zh-CN': 'Chinese', 'ko-KR': 'Korean', 'ar-SA': 'Arabic'
};

function resolveLanguage(lang) {
    if (!lang) return 'Spanish';
    return LANG_CODE_MAP[lang] || LANG_CODE_MAP[lang.toLowerCase()] || lang;
}

// Language Picker Modal
function openLangPicker() {
    const modal = document.getElementById('langPickerModal');
    const grid = document.getElementById('langPickerGrid');
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';

    grid.innerHTML = '';
    Object.entries(LANGUAGES).forEach(([lang, info]) => {
        const card = document.createElement('div');
        const isActive = lang === currentLanguage;
        card.className = 'card';
        card.style.cssText = `cursor:pointer;padding:20px 12px;text-align:center;transition:all 0.2s;border:2px solid ${isActive ? 'var(--purple)' : 'transparent'};background:${isActive ? 'rgba(124,58,237,0.15)' : ''};`;
        card.innerHTML = `<div style="font-size:36px;margin-bottom:8px;">${info.flag}</div><p style="font-weight:600;font-size:14px;margin-bottom:2px;">${lang}</p><p style="font-size:12px;color:var(--text-muted);">${info.native}</p>${isActive ? '<p style="font-size:11px;color:var(--purple);margin-top:4px;">✓ Active</p>' : ''}`;
        card.onmouseover = () => { if (!isActive) card.style.border = '2px solid rgba(124,58,237,0.4)'; card.style.transform = 'translateY(-2px)'; };
        card.onmouseout = () => { if (!isActive) card.style.border = '2px solid transparent'; card.style.transform = ''; };
        card.onclick = () => switchLanguage(lang);
        grid.appendChild(card);
    });
}

function closeLangPicker() {
    document.getElementById('langPickerModal').style.display = 'none';
    document.body.style.overflow = '';
}

async function switchLanguage(lang) {
    if (lang === currentLanguage) { closeLangPicker(); return; }
    try {
        showToast(`Switching to ${lang}...`, 'info');
        await apiCall('/auth/profile', { method: 'PUT', body: JSON.stringify({ currentLanguage: lang }) });
        const user = getUser();
        if (user) { user.currentLanguage = lang; saveUser(user); }
        currentLanguage = lang;
        closeLangPicker();
        showToast(`${lang} selected! 🎉`, 'success');
        // Reload lessons for new language
        const languageInfo = getLanguageInfo(currentLanguage);
        document.getElementById('courseTitle').innerHTML = `${languageInfo.flag} ${currentLanguage} Courses`;
        document.getElementById('languageName').textContent = languageInfo.native || currentLanguage;
        ['beginnerLessons', 'intermediateLessons', 'advancedLessons'].forEach(id => {
            const el = document.getElementById(id); if (el) el.innerHTML = '<p class="text-muted">Loading...</p>';
        });
        await loadProgress();
        await loadLessons();
    } catch (error) {
        console.error('Language switch error:', error);
        showToast('Failed to switch language: ' + error.message, 'error');
    }
}

let currentLanguage = 'Spanish';
let userProgress = null;

// Load user stats — always fetch fresh from API to avoid stale localStorage
async function loadUserStats() {
    try {
        const data = await apiCall('/auth/me');
        const user = data.user;
        saveUser(user);

        // Resolve language code to full name
        currentLanguage = resolveLanguage(user.currentLanguage);

        document.getElementById('userStreak').textContent = user.streak || 0;
        document.getElementById('userXP').textContent = formatNumber(user.xp || 0);

        const heartsCount = user.hearts || 5;
        const hearts = '❤️'.repeat(Math.min(heartsCount, 5)) + '🖤'.repeat(Math.max(0, 5 - heartsCount));
        document.getElementById('heartsDisplay').innerHTML = hearts;

        // Update page title with full language name
        const languageInfo = getLanguageInfo(currentLanguage);
        document.getElementById('courseTitle').innerHTML = `${languageInfo.flag} ${currentLanguage} Courses`;
        document.getElementById('languageName').textContent = languageInfo.native || currentLanguage;

    } catch (error) {
        console.error('Failed to load user stats:', error);
        // Fallback to localStorage
        const user = getUser();
        if (user) {
            currentLanguage = resolveLanguage(user.currentLanguage);
        }
    }
}

// Load progress for current language
async function loadProgress() {
    try {
        const data = await apiCall(`/progress/${currentLanguage}`);
        userProgress = data.progress;

        document.getElementById('lessonsCompleted').textContent =
            userProgress?.lessonsCompleted?.length || 0;
        document.getElementById('accuracyRate').textContent =
            Math.round(userProgress?.accuracy || 0) + '%';
        document.getElementById('vocabularyCount').textContent =
            userProgress?.vocabularyMastered || 0;
    } catch (error) {
        console.error('Failed to load progress:', error);
        userProgress = {
            lessonsCompleted: [],
            accuracy: 0,
            vocabularyMastered: 0,
            unlockedLessons: []
        };
    }
}

// Load lessons for current language
async function loadLessons() {
    try {
        console.log('Loading lessons for language:', currentLanguage);
        const data = await apiCall(`/lessons/${encodeURIComponent(currentLanguage)}`);
        const lessons = data.lessons || [];
        console.log('Lessons received:', lessons.length);

        if (lessons.length === 0) {
            ['beginnerLessons', 'intermediateLessons', 'advancedLessons'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = '<p class="text-muted">No lessons available yet</p>';
            });
            return;
        }

        const beginnerLessons = lessons.filter(l => l.difficulty === 'beginner');
        const intermediateLessons = lessons.filter(l => l.difficulty === 'intermediate');
        const advancedLessons = lessons.filter(l => l.difficulty === 'advanced');

        renderLessons('beginnerLessons', beginnerLessons);
        renderLessons('intermediateLessons', intermediateLessons);
        renderLessons('advancedLessons', advancedLessons);
    } catch (error) {
        console.error('Failed to load lessons:', error);
        showToast('Failed to load lessons: ' + error.message, 'error');
    }
}

// Render lesson cards
function renderLessons(containerId, lessons) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    if (lessons.length === 0) {
        container.innerHTML = '<p class="text-muted">No lessons available yet</p>';
        return;
    }

    lessons.sort((a, b) => (a.order || 0) - (b.order || 0)).forEach((lesson, index) => {
        const completedIds = userProgress?.lessonsCompleted?.map(c => c.lessonId) || [];
        const unlockedIds = userProgress?.unlockedLessons || [];

        const isCompleted = completedIds.includes(lesson.lessonId);
        // First lesson always unlocked, or in unlock list
        const isUnlocked = index === 0 || lesson.unlocked || unlockedIds.includes(lesson.lessonId);

        const card = document.createElement('div');
        card.className = 'card';
        card.style.cssText = `cursor:${isUnlocked ? 'pointer' : 'not-allowed'}; opacity:${isUnlocked ? '1' : '0.6'}; position:relative; transition:transform 0.2s, box-shadow 0.2s;`;

        if (isUnlocked) {
            card.onmouseover = () => { card.style.transform = 'translateY(-4px)'; card.style.boxShadow = '0 8px 24px rgba(124,58,237,0.3)'; };
            card.onmouseout = () => { card.style.transform = ''; card.style.boxShadow = ''; };
        }

        const badge = isCompleted ? '<div style="position:absolute;top:12px;right:12px;font-size:22px;">✅</div>' : '';
        const lockIcon = !isUnlocked ? '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:40px;opacity:0.6;">🔒</div>' : '';

        card.innerHTML = `
            ${badge}
            ${lockIcon}
            <div class="text-center">
                <div style="font-size:48px;margin-bottom:12px;">${lesson.icon || '📖'}</div>
                <h3 style="margin-bottom:8px;">${lesson.title}</h3>
                <p class="text-muted" style="font-size:13px;margin-bottom:12px;">${lesson.description}</p>
                <div class="flex-between" style="font-size:12px;">
                    <span class="text-muted">⭐ ${lesson.xpReward || 10} XP</span>
                    <span class="text-muted">📝 ${lesson.quizzes?.length || 0} quizzes</span>
                </div>
            </div>
        `;

        if (isUnlocked) {
            card.onclick = () => startLesson(lesson);
        }

        container.appendChild(card);
    });
}

// Start a lesson
function startLesson(lesson) {
    localStorage.setItem('currentLesson', JSON.stringify(lesson));
    window.location.href = 'lesson.html';
}

// Back button — go home if no history
function goBack() {
    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.location.href = 'home.html';
    }
}

// Initialize — load stats first to get correct language, then load lessons
async function init() {
    await loadUserStats();
    await loadProgress();
    await loadLessons();
}

init();
