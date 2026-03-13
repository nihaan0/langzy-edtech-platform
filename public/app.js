// Global Configuration and Utilities
const API_URL = 'http://localhost:5000/api';

// Get auth token
function getToken() {
    return localStorage.getItem('token');
}

// Set auth token
function setToken(token) {
    localStorage.setItem('token', token);
}

// Clear auth
function clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

// Get current user
function getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

// Save user
function saveUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
}

// API Call Helper
async function apiCall(endpoint, options = {}) {
    const token = getToken();

    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        }
    };

    try {
        const response = await fetch(`${API_URL}${endpoint}`, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 24px;
    background: ${type === 'success' ? 'var(--green)' : type === 'error' ? 'var(--red)' : 'var(--purple)'};
    color: white;
    border-radius: 12px;
    box-shadow: var(--shadow-lg);
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Check if user is authenticated
function isAuthenticated() {
    return !!getToken();
}

// Redirect to login if not authenticated
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = '/index.html';
        return false;
    }
    return true;
}

// Format number with commas
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Calculate level from XP
function calculateLevel(xp) {
    return Math.min(Math.floor(xp / 100) + 1, 100);
}

// Calculate XP for current level
function calculateLevelXP(xp) {
    const level = calculateLevel(xp);
    const xpForCurrentLevel = (level - 1) * 100;
    const xpForNextLevel = level * 100;
    const currentLevelXP = xp - xpForCurrentLevel;
    const xpNeeded = xpForNextLevel - xpForCurrentLevel;

    return {
        current: currentLevelXP,
        needed: xpNeeded,
        percent: (currentLevelXP / xpNeeded) * 100
    };
}

// Language flags and names
const LANGUAGES = {
    Spanish: { flag: '🇪🇸', native: 'Español' },
    French: { flag: '🇫🇷', native: 'Français' },
    German: { flag: '🇩🇪', native: 'Deutsch' },
    Italian: { flag: '🇮🇹', native: 'Italiano' },
    Portuguese: { flag: '🇵🇹', native: 'Português' },
    Dutch: { flag: '🇳🇱', native: 'Nederlands' },
    Swedish: { flag: '🇸🇪', native: 'Svenska' },
    Norwegian: { flag: '🇳🇴', native: 'Norsk' },
    Danish: { flag: '🇩🇰', native: 'Dansk' },
    Polish: { flag: '🇵🇱', native: 'Polski' },
    Russian: { flag: '🇷🇺', native: 'Русский' },
    Greek: { flag: '🇬🇷', native: 'Ελληνικά' },
    Turkish: { flag: '🇹🇷', native: 'Türkçe' },
    Tamil: { flag: '🇮🇳', native: 'தமிழ்' },
    Hindi: { flag: '🇮🇳', native: 'हिन्दी' },
    Japanese: { flag: '🇯🇵', native: '日本語' },
    Chinese: { flag: '🇨🇳', native: '中文' },
    Korean: { flag: '🇰🇷', native: '한국어' },
    Thai: { flag: '🇹🇭', native: 'ไทย' },
    Vietnamese: { flag: '🇻🇳', native: 'Tiếng Việt' },
    Indonesian: { flag: '🇮🇩', native: 'Bahasa Indonesia' },
    Arabic: { flag: '🇸🇦', native: 'العربية' },
    English: { flag: '🇬🇧', native: 'English' }
};

// Get language info
function getLanguageInfo(lang) {
    return LANGUAGES[lang] || { flag: '🌍', native: lang };
}

// Get standard language code for TTS/STT
function getLanguageCode(lang) {
    const codes = {
        Spanish: 'es-ES', French: 'fr-FR', German: 'de-DE', Italian: 'it-IT',
        Portuguese: 'pt-PT', Dutch: 'nl-NL', Swedish: 'sv-SE', Norwegian: 'no-NO',
        Danish: 'da-DK', Polish: 'pl-PL', Russian: 'ru-RU', Greek: 'el-GR',
        Turkish: 'tr-TR', Tamil: 'ta-IN', Hindi: 'hi-IN', Japanese: 'ja-JP',
        Chinese: 'zh-CN', Korean: 'ko-KR', Thai: 'th-TH', Vietnamese: 'vi-VN',
        Indonesian: 'id-ID', Arabic: 'ar-SA', English: 'en-US'
    };
    return codes[lang] || 'en-US';
}

// Play success sound (rising chime) using Web Audio API
function playSuccessSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const times = [0, 0.1, 0.2];
        const freqs = [523, 659, 784]; // C, E, G
        times.forEach((t, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = freqs[i];
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.3, ctx.currentTime + t);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3);
            osc.start(ctx.currentTime + t);
            osc.stop(ctx.currentTime + t + 0.3);
        });
    } catch (e) { }
}

// Play fail sound (low buzz) using Web Audio API
function playFailSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 220;
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
    } catch (e) { }
}

// Confetti animation
function triggerConfetti() {
    const colors = ['#8B5CF6', '#6366F1', '#10B981', '#F59E0B', '#EF4444'];
    const confettiCount = 50;

    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.style.cssText = `
      position: fixed;
      width: 10px;
      height: 10px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      left: ${Math.random() * 100}%;
      top: -10px;
      opacity: 1;
      transform: rotate(0deg);
      pointer-events: none;
      z-index: 9999;
      animation: confetti-fall ${2 + Math.random() * 2}s linear forwards;
    `;

        document.body.appendChild(confetti);

        setTimeout(() => confetti.remove(), 4000);
    }
}

// Loading overlay
function showLoading() {
    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.innerHTML = '<div class="spinner"></div>';
    overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(10, 14, 39, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;
    document.body.appendChild(overlay);
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.remove();
}

let currentUtterance = null;

// Speech synthesis (Text-to-Speech)
function speak(text, language = 'en-US') {
    if (!('speechSynthesis' in window)) return;

    // Stop current speech and reset
    window.speechSynthesis.cancel();

    // Clean text by stripping English labels and transliterations
    let textToSpeak = text.split('|')[0].trim();
    textToSpeak = textToSpeak.replace(/^(📝\s*Translation:|💬\s*Reply:|Translation:|Reply:)/i, '').trim();
    textToSpeak = textToSpeak.replace(/\s*\([^)]+\)/g, '').trim();

    if (!textToSpeak) return;

    function doSpeak() {
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        currentUtterance = utterance; // Keep reference to prevent garbage collection

        utterance.lang = language;
        utterance.rate = 0.9; // Slightly faster for natural feel
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            const langPrefix = language.split('-')[0];
            // CRITICAL: Prioritize LOCAL voices (v.localService) for instant speech.
            // Remote/Network voices (like Google's cloud) often have a massive delay or fail.
            const match = voices.find(v => v.lang === language && v.localService === true)
                || voices.find(v => v.lang.startsWith(langPrefix) && v.localService === true)
                || voices.find(v => v.lang === language)
                || voices.find(v => v.lang.startsWith(langPrefix))
                || voices.find(v => v.default);

            if (match) {
                utterance.voice = match;
                console.log(`Using voice: ${match.name} (Local: ${match.localService})`);
            }
        }

        // Failsafe: Chrome sometimes gets stuck. Resume ensures the engine is active.
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
    }

    // Small delay after cancel() ensures the internal state is ready
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
        setTimeout(doSpeak, 50);
    } else {
        // First time loading voices
        window.speechSynthesis.onvoiceschanged = () => {
            window.speechSynthesis.onvoiceschanged = null;
            doSpeak();
        };
        // Faster fallback
        setTimeout(doSpeak, 200);
    }
}

// Speech recognition (Speech-to-Text)
function startSpeechRecognition(callback, language = 'en-US', onEndCallback = null) {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.lang = language;
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            callback(transcript);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            showToast('Voice recognition failed: ' + event.error, 'error');
            if (onEndCallback) onEndCallback();
        };

        recognition.onend = () => {
            if (onEndCallback) onEndCallback();
        }

        recognition.start();
        return recognition;
    } else {
        showToast('Voice recognition not supported in this browser', 'error');
        return null;
    }
}

// ==================== SMART WORD HELPER ====================

// Translate a single word
async function translateWord(word, sourceLang, targetLang, context = '') {
    try {
        const data = await apiCall('/translate/word', 'POST', {
            word,
            sourceLang,
            targetLang,
            context
        });
        return data;
    } catch (error) {
        console.error('Failed to translate word:', error);
        showToast('Translation failed', 'error');
        return null;
    }
}

// Get word breakdown (etymology)
async function getWordBreakdown(word, language) {
    try {
        const data = await apiCall(`/translate/breakdown/${encodeURIComponent(word)}?language=${language}`);
        return data;
    } catch (error) {
        console.error('Failed to get word breakdown:', error);
        return null;
    }
}

// Show word tooltip with translation
async function showWordTooltip(word, event, sourceLang, targetLang, context = '') {
    // Remove existing tooltips
    const existing = document.querySelector('.word-tooltip');
    if (existing) existing.remove();

    // Show loading tooltip
    const loadingTooltip = document.createElement('div');
    loadingTooltip.className = 'word-tooltip';
    loadingTooltip.style.cssText = `
        position: fixed;
        background: var(--bg-card);
        border: 2px solid var(--purple);
        border-radius: 8px;
        padding: 12px;
        z-index: 10000;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        max-width: 300px;
        font-size: 14px;
    `;
    loadingTooltip.style.left = event.clientX + 'px';
    loadingTooltip.style.top = (event.clientY + 20) + 'px';
    loadingTooltip.innerHTML = '<p style="color: var(--purple);">⏳ Translating...</p>';
    document.body.appendChild(loadingTooltip);

    // Get translation
    const wordData = await translateWord(word, sourceLang, targetLang, context);

    if (wordData) {
        loadingTooltip.innerHTML = `
            <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <strong style="color: var(--purple); font-size: 16px;">${wordData.word}</strong>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                            style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 18px;">✕</button>
                </div>
                <p style="margin: 4px 0;"><strong>Translation:</strong> ${wordData.translation}</p>
                ${wordData.pronunciation ? `<p style="margin: 4px 0; color: var(--text-muted);">${wordData.pronunciation}</p>` : ''}
                ${wordData.partOfSpeech ? `<p style="margin: 4px 0; font-style: italic; color: var(--text-muted);">${wordData.partOfSpeech}</p>` : ''}
                ${wordData.definition ? `<p style="margin: 8px 0; font-size: 12px;">${wordData.definition}</p>` : ''}
                ${wordData.example ? `<div style="margin-top: 8px; padding: 8px; background: var(--bg-secondary); border-radius: 4px;">
                    <p style="margin: 2px 0; font-size: 12px;">"${wordData.example}"</p>
                    ${wordData.exampleTranslation ? `<p style="margin: 2px 0; font-size: 12px; color: var(--text-muted);">"${wordData.exampleTranslation}"</p>` : ''}
                </div>` : ''}
                <div style="margin-top: 8px; display: flex; gap: 8px;">
                    <button onclick="showWordBreakdownModal('${word}', '${sourceLang}')" class="btn btn-secondary" style="padding: 4px 8px; font-size: 12px;">
                        📖 Breakdown
                    </button>
                    <button onclick="saveToVocabulary('${word}', '${wordData.translation}', '${sourceLang}')" class="btn btn-primary" style="padding: 4px 8px; font-size: 12px;">
                        ⭐ Save
                    </button>
                </div>
            </div>
        `;
    }
}

// Show word breakdown modal
async function showWordBreakdownModal(word, language) {
    // Close tooltip
    const tooltip = document.querySelector('.word-tooltip');
    if (tooltip) tooltip.remove();

    showLoading();
    const breakdown = await getWordBreakdown(word, language);
    hideLoading();

    if (!breakdown) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <h2 style="margin-bottom: 16px;">📖 Word Breakdown: ${breakdown.word}</h2>
            
            ${breakdown.etymology ? `
                <div class="card mb-2" style="background: var(--bg-secondary);">
                    <h4 style="color: var(--purple); margin-bottom: 8px;">Etymology</h4>
                    <p style="font-size: 14px;">${breakdown.etymology}</p>
                </div>
            ` : ''}
            
            <div class="grid-2 gap-2 mb-2">
                ${breakdown.root ? `
                    <div class="card" style="background: var(--bg-secondary);text-align: center;">
                        <p style="color: var(--text-muted); font-size: 12px; margin-bottom: 4px;">Root</p>
                        <p style="font-size: 16px; font-weight: bold;">${breakdown.root}</p>
                    </div>
                ` : ''}
                ${breakdown.prefix ? `
                    <div class="card" style="background: var(--bg-secondary);text-align: center;">
                        <p style="color: var(--text-muted); font-size: 12px; margin-bottom: 4px;">Prefix</p>
                        <p style="font-size: 16px; color: var(--blue);">${breakdown.prefix}</p>
                    </div>
                ` : ''}
                ${breakdown.suffix ? `
                    <div class="card" style="background: var(--bg-secondary);text-align: center;">
                        <p style="color: var(--text-muted); font-size: 12px; margin-bottom: 4px;">Suffix</p>
                        <p style="font-size: 16px; color: var(--green);">${breakdown.suffix}</p>
                    </div>
                ` : ''}
            </div>

            ${breakdown.relatedWords && breakdown.relatedWords.length > 0 ? `
                <div class="card mb-2" style="background: var(--bg-secondary);">
                    <h4 style="color: var(--purple); margin-bottom: 8px;">Related Words</h4>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${breakdown.relatedWords.map(w => `<span class="badge" style="background: var(--purple); padding: 6px 12px;">${w}</span>`).join('')}
                    </div>
                </div>
            ` : ''}

            ${breakdown.memoryTip ? `
                <div class="card" style="background: linear-gradient(135deg, var(--purple), var(--blue)); padding: 16px;">
                    <h4 style="margin-bottom: 8px;">💡 Memory Tip</h4>
                    <p style="font-size: 14px;">${breakdown.memoryTip}</p>
                </div>
            ` : ''}

            <button class="btn btn-secondary mt-2" onclick="this.closest('.modal-overlay').remove()">Close</button>
        </div>
    `;
    document.body.appendChild(modal);
}

// Make words in a text element clickable
function makeWordsClickable(element, sourceLang, targetLang) {
    if (!element || !element.textContent) return;

    const text = element.textContent;
    const words = text.split(/(\s+|[.,!?;:])/); // Split but keep delimiters

    element.innerHTML = '';
    words.forEach(word => {
        if (word.trim() && !/^[.,!?;:\s]+$/.test(word)) {
            // It's a word, make it clickable
            const span = document.createElement('span');
            span.textContent = word;
            span.style.cssText = 'cursor: pointer; transition: color 0.2s;';
            span.className = 'clickable-word';
            span.addEventListener('mouseenter', function () {
                this.style.color = 'var(--purple)';
                this.style.textDecoration = 'underline';
            });
            span.addEventListener('mouseleave', function () {
                this.style.color = '';
                this.style.textDecoration = '';
            });
            span.addEventListener('click', function (e) {
                e.stopPropagation();
                const context = element.textContent;
                showWordTooltip(word.trim(), e, sourceLang, targetLang, context);
            });
            element.appendChild(span);
        } else {
            // It's a delimiter or whitespace
            element.appendChild(document.createTextNode(word));
        }
    });
}

// Save word to vocabulary
async function saveToVocabulary(word, translation, language) {
    try {
        await apiCall('/vocabulary', 'POST', {
            word,
            translation,
            language
        });
        showToast('Saved to vocabulary! ⭐', 'success');

        // Close tooltip
        const tooltip = document.querySelector('.word-tooltip');
        if (tooltip) tooltip.remove();
    } catch (error) {
        console.error('Failed to save vocabulary:', error);
        showToast('Failed to save', 'error');
    }
}

// ==================== THEME & SETTINGS ====================

// Load theme on page load
function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');

    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        if (themeToggle) themeToggle.checked = true;
        if (themeIcon) themeIcon.textContent = '☀️';
    }
}

// Toggle theme
function toggleTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');

    if (themeToggle.checked) {
        document.body.classList.add('light-theme');
        localStorage.setItem('theme', 'light');
        if (themeIcon) themeIcon.textContent = '☀️';
        showToast('Light mode activated ☀️', 'success');
    } else {
        document.body.classList.remove('light-theme');
        localStorage.setItem('theme', 'dark');
        if (themeIcon) themeIcon.textContent = '🌙';
        showToast('Dark mode activated 🌙', 'success');
    }
}

// Update header with profile name
function updateHeaderProfile() {
    const user = getUser();
    const profileContainers = document.querySelectorAll('.header-profile-name');

    if (user && profileContainers.length > 0) {
        profileContainers.forEach(container => {
            container.textContent = user.name;
            container.style.display = 'inline-block';
        });
    }
}

// Load settings on page load
function loadSettings() {
    loadTheme();
    updateHeaderProfile();

    const notifications = localStorage.getItem('notifications') !== 'false';
    const sound = localStorage.getItem('sound') !== 'false';
    const autoVoice = localStorage.getItem('autoVoice') === 'true';

    const notifToggle = document.getElementById('notificationsToggle');
    const soundToggle = document.getElementById('soundToggle');
    const voiceToggle = document.getElementById('autoVoiceToggle');

    if (notifToggle) notifToggle.checked = notifications;
    if (soundToggle) soundToggle.checked = sound;
    if (voiceToggle) voiceToggle.checked = autoVoice;

    // Add event listeners
    if (notifToggle) {
        notifToggle.addEventListener('change', () => {
            localStorage.setItem('notifications', notifToggle.checked);
            showToast(notifToggle.checked ? 'Notifications enabled 🔔' : 'Notifications disabled 🔕', 'success');
        });
    }

    if (soundToggle) {
        soundToggle.addEventListener('change', () => {
            localStorage.setItem('sound', soundToggle.checked);
            showToast(soundToggle.checked ? 'Sound effects enabled 🔊' : 'Sound effects muted 🔇', 'success');
        });
    }

    if (voiceToggle) {
        voiceToggle.addEventListener('change', () => {
            localStorage.setItem('autoVoice', voiceToggle.checked);
            showToast(voiceToggle.checked ? 'Auto-play voice enabled 🗣️' : 'Auto-play voice disabled', 'success');
        });
    }
}

// Initialize theme and settings when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSettings);
} else {
    loadSettings();
}
