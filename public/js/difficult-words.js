// Difficult Words Page Logic
requireAuth();

const user = getUser();
let currentLanguage = user.currentLanguage || 'Spanish';
let difficultWords = [];
let filteredWords = [];
let currentFilter = 'all';
let selectedWord = null;

// All available languages
const AVAILABLE_LANGUAGES = [
    'Spanish', 'French', 'German', 'Italian', 'Portuguese',
    'Tamil', 'Hindi', 'Telugu', 'Malayalam', 'Kannada',
    'Japanese', 'Chinese', 'Korean', 'Arabic', 'Russian',
    'Dutch', 'Swedish', 'Turkish', 'Polish', 'Greek'
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    populateLanguageSelector();
    loadUserData();
});

// Populate language selector
function populateLanguageSelector() {
    const selector = document.getElementById('languageSelector');
    if (!selector) return;

    selector.innerHTML = AVAILABLE_LANGUAGES.map(lang => {
        const langInfo = getLanguageInfo(lang);
        return `<option value="${lang}" ${lang === currentLanguage ? 'selected' : ''}>
            ${langInfo.flag} ${lang}
        </option>`;
    }).join('');
}

// Change language
function changeLanguage(language) {
    currentLanguage = language;
    const langInfo = getLanguageInfo(language);
    document.getElementById('languageName').textContent = `${langInfo.flag} ${language}`;

    // Close modal if open
    closeModal();

    // Reload words for new language
    loadDifficultWords();
}

async function loadUserData() {
    currentLanguage = user.currentLanguage || 'Spanish';
    const langInfo = getLanguageInfo(currentLanguage);
    document.getElementById('languageName').textContent = `${langInfo.flag} ${currentLanguage}`;

    const selector = document.getElementById('languageSelector');
    if (selector) selector.value = currentLanguage;

    await loadDifficultWords();
}

async function loadDifficultWords() {
    showLoading();

    try {
        const response = await apiCall(`/difficult-words?language=${currentLanguage}`);
        difficultWords = response.words || [];
    } catch (error) {
        console.error('Failed to load difficult words:', error);
        difficultWords = [];
    }

    hideLoading();
    filterWords('all');
    updateStats();
}

function filterWords(filter) {
    currentFilter = filter;

    // Update button styles
    document.querySelectorAll('[id^="filter"]').forEach(btn => {
        btn.className = 'btn btn-secondary';
    });
    document.getElementById(`filter${filter.charAt(0).toUpperCase() + filter.slice(1)}`).className = 'btn btn-primary';

    // Filter words
    switch (filter) {
        case 'all':
            filteredWords = difficultWords;
            break;
        case 'learning':
            filteredWords = difficultWords.filter(w => !w.mastered);
            break;
        case 'mastered':
            filteredWords = difficultWords.filter(w => w.mastered);
            break;
    }

    renderWords();
}

function renderWords() {
    const container = document.getElementById('wordsList');
    const emptyState = document.getElementById('emptyState');

    if (filteredWords.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    container.innerHTML = filteredWords.map(word => `
        <div class="card mb-2" onclick="showWordDetail('${word._id}')" style="cursor: pointer;">
            <div class="flex-between" style="align-items: start;">
                <div style="flex: 1;">
                    <div class="flex gap-2" style="align-items: center; margin-bottom: 8px;">
                        <h3 style="margin: 0;">${word.word}</h3>
                        ${word.mastered ? '<span style="background: var(--green); padding: 4px 12px; border-radius: 20px; font-size: 12px;">✅ Mastered</span>' : ''}
                    </div>
                    <p style="color: var(--blue); margin-bottom: 8px;">${word.translation}</p>
                    ${word.context ? `<p class="text-muted" style="font-size: 14px; font-style: italic;">"${word.context}"</p>` : ''}
                    <div class="text-muted" style="font-size: 12px; margin-top: 8px;">
                        ${word.practiceCount ? `Practiced ${word.practiceCount} times` : 'Not practiced yet'}
                        ${word.lastPracticedAt ? ` • Last: ${new Date(word.lastPracticedAt).toLocaleDateString()}` : ''}
                    </div>
                </div>
                <div class="flex gap-1">
                    <button class="btn btn-primary" onclick="event.stopPropagation(); playWordAudio('${word.word.replace(/'/g, "\\'")}')">
                        🔊
                    </button>
                    <button class="btn btn-danger" onclick="event.stopPropagation(); removeWordQuick('${word._id}')">
                        🗑️
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

async function addWord() {
    const word = document.getElementById('newWord').value.trim();
    const translation = document.getElementById('newTranslation').value.trim();
    const context = document.getElementById('newContext').value.trim();

    if (!word || !translation) {
        showToast('Please enter both word and translation', 'error');
        return;
    }

    showLoading();

    try {
        const response = await apiCall('/difficult-words', {
            method: 'POST',
            body: JSON.stringify({
                language: currentLanguage,
                word: word,
                translation: translation,
                context: context
            })
        });

        difficultWords.unshift(response.word);

        // Clear inputs
        document.getElementById('newWord').value = '';
        document.getElementById('newTranslation').value = '';
        document.getElementById('newContext').value = '';

        filterWords(currentFilter);
        updateStats();
        showToast('Word added successfully! 📖', 'success');
    } catch (error) {
        showToast('Failed to add word: ' + error.message, 'error');
    }

    hideLoading();
}

function searchWords() {
    const query = document.getElementById('searchInput').value.toLowerCase();

    if (!query) {
        filteredWords = difficultWords.filter(w => {
            if (currentFilter === 'all') return true;
            if (currentFilter === 'learning') return !w.mastered;
            if (currentFilter === 'mastered') return w.mastered;
            return true;
        });
    } else {
        filteredWords = difficultWords.filter(w => {
            const matchesFilter = currentFilter === 'all' ||
                (currentFilter === 'learning' && !w.mastered) ||
                (currentFilter === 'mastered' && w.mastered);

            const matchesSearch = w.word.toLowerCase().includes(query) ||
                w.translation.toLowerCase().includes(query) ||
                (w.context && w.context.toLowerCase().includes(query));

            return matchesFilter && matchesSearch;
        });
    }

    renderWords();
}

function showWordDetail(wordId) {
    selectedWord = difficultWords.find(w => w._id === wordId);
    if (!selectedWord) return;

    document.getElementById('modalWord').textContent = selectedWord.word;
    document.getElementById('modalTranslation').textContent = selectedWord.translation;
    document.getElementById('contextText').textContent = selectedWord.context || 'No context provided';
    document.getElementById('notesInput').value = selectedWord.notes || '';

    document.getElementById('wordModal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('wordModal').classList.add('hidden');
    selectedWord = null;
}

async function saveNotes() {
    if (!selectedWord) return;

    const notes = document.getElementById('notesInput').value.trim();

    try {
        await apiCall(`/difficult-words/${selectedWord._id}`, {
            method: 'PUT',
            body: JSON.stringify({ notes: notes })
        });

        selectedWord.notes = notes;
        showToast('Notes saved!', 'success');
    } catch (error) {
        showToast('Failed to save notes', 'error');
    }
}

async function markAsMastered() {
    if (!selectedWord) return;

    try {
        await apiCall(`/difficult-words/${selectedWord._id}`, {
            method: 'PUT',
            body: JSON.stringify({ mastered: true })
        });

        selectedWord.mastered = true;
        selectedWord.masteredAt = new Date();

        closeModal();
        filterWords(currentFilter);
        updateStats();
        showToast('Word marked as mastered! 🎉', 'success');
    } catch (error) {
        showToast('Failed to update word', 'error');
    }
}

async function removeWord() {
    if (!selectedWord) return;

    if (!confirm(`Remove "${selectedWord.word}" from difficult words?`)) return;

    try {
        await apiCall(`/difficult-words/${selectedWord._id}`, {
            method: 'DELETE'
        });

        difficultWords = difficultWords.filter(w => w._id !== selectedWord._id);

        closeModal();
        filterWords(currentFilter);
        updateStats();
        showToast('Word removed', 'info');
    } catch (error) {
        showToast('Failed to remove word', 'error');
    }
}

async function removeWordQuick(wordId) {
    if (!confirm('Remove this word from difficult words?')) return;

    try {
        await apiCall(`/difficult-words/${wordId}`, {
            method: 'DELETE'
        });

        difficultWords = difficultWords.filter(w => w._id !== wordId);

        filterWords(currentFilter);
        updateStats();
        showToast('Word removed', 'info');
    } catch (error) {
        showToast('Failed to remove word', 'error');
    }
}

function updateStats() {
    const total = difficultWords.length;
    const mastered = difficultWords.filter(w => w.mastered).length;
    const learning = total - mastered;

    document.getElementById('wordCount').textContent = total;
    document.getElementById('totalWords').textContent = total;
    document.getElementById('learningWords').textContent = learning;
    document.getElementById('masteredWords').textContent = mastered;
}

function playWordAudio(word) {
    const langCode = getLanguageCode(currentLanguage);
    speak(word, langCode);
}

function getLanguageCode(lang) {
    const codes = {
        Spanish: 'es-ES', French: 'fr-FR', German: 'de-DE', Italian: 'it-IT',
        Tamil: 'ta-IN', Hindi: 'hi-IN', Japanese: 'ja-JP', Chinese: 'zh-CN',
        Korean: 'ko-KR', Arabic: 'ar-SA', English: 'en-US'
    };
    return codes[lang] || 'en-US';
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('wordModal');
    if (e.target === modal) {
        closeModal();
    }
});
