// Games Page Logic
requireAuth();

// Convert language code (e.g. 'ta') to full name (e.g. 'Tamil')
function resolveLanguageName(lang) {
    const codeToName = {
        'ta': 'Tamil', 'hi': 'Hindi', 'te': 'Telugu', 'ml': 'Malayalam',
        'kn': 'Kannada', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
        'it': 'Italian', 'pt': 'Portuguese', 'ja': 'Japanese', 'zh': 'Chinese',
        'ko': 'Korean', 'ar': 'Arabic', 'ru': 'Russian', 'nl': 'Dutch',
        'sv': 'Swedish', 'tr': 'Turkish', 'pl': 'Polish', 'el': 'Greek'
    };
    return codeToName[lang] || lang;
}

const user = getUser();
let currentLanguage = resolveLanguageName(user.currentLanguage || 'Spanish');
let currentGameType = '';
let score = 0;
let timer = 0;
let timerInterval = null;
let vocabulary = [];
let gameState = {};

// Language to locale code mapping for speech
const LANG_LOCALE = {
    'Tamil': 'ta-IN', 'Hindi': 'hi-IN', 'Telugu': 'te-IN', 'Malayalam': 'ml-IN',
    'Kannada': 'kn-IN', 'Spanish': 'es-ES', 'French': 'fr-FR', 'German': 'de-DE',
    'Italian': 'it-IT', 'Portuguese': 'pt-PT', 'Japanese': 'ja-JP', 'Chinese': 'zh-CN',
    'Korean': 'ko-KR', 'Arabic': 'ar-SA', 'Russian': 'ru-RU', 'Dutch': 'nl-NL',
    'Swedish': 'sv-SE', 'Turkish': 'tr-TR', 'Polish': 'pl-PL', 'Greek': 'el-GR'
};

// Speak a word using Web Speech API
function speakWord(text, lang) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // stop any ongoing speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANG_LOCALE[lang || currentLanguage] || 'en-US';
    utterance.rate = 0.85;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
}

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
    const selector = document.getElementById('languageSelector');
    const oldLanguage = currentLanguage;

    // If not in game, just switch
    if (!document.getElementById('gameSelection').classList.contains('hidden')) {
        // Pause timer while modal is open
        stopTimer();

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.zIndex = '10001';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px; text-align: center; padding: 40px;">
                <div style="font-size: 64px; margin-bottom: 20px;">🌐</div>
                <h2 style="margin-bottom: 12px;">Switch Language?</h2>
                <p class="text-muted" style="margin-bottom: 32px;">Switch to <b>${language}</b>?<br>Current game progress will be lost.</p>
                
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <button id="confirmSwitchBtn" class="btn btn-primary" style="width: 100%;">Yes, Switch Language</button>
                    <button id="cancelSwitchBtn" class="btn btn-secondary" style="width: 100%;">No, Keep Playing</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('confirmSwitchBtn').onclick = () => {
            modal.remove();
            applyLanguageChange(language);
            backToGames();
        };

        document.getElementById('cancelSwitchBtn').onclick = () => {
            modal.remove();
            // Revert selector
            if (selector) selector.value = oldLanguage;
            currentLanguage = oldLanguage;
            startTimer(); // Resume timer
        };
    } else {
        applyLanguageChange(language);
    }
}

function applyLanguageChange(language) {
    currentLanguage = language;
    const langInfo = getLanguageInfo(language);
    document.getElementById('languageName').textContent = `${langInfo.flag} ${language} - Play and learn`;

    // Reload data for new language
    loadPersonalBests();
    loadVocabulary();
}

async function loadUserData() {
    const rawLang = user.currentLanguage || 'Spanish';
    currentLanguage = resolveLanguageName(rawLang);
    const langInfo = getLanguageInfo(currentLanguage);
    document.getElementById('languageName').textContent = `${langInfo.flag} ${currentLanguage} - Play and learn`;

    const selector = document.getElementById('languageSelector');
    if (selector) selector.value = currentLanguage;

    await loadPersonalBests();
    await loadVocabulary();
}

async function loadPersonalBests() {
    try {
        const response = await apiCall(`/games/personal-best?language=${currentLanguage}`);
        const bests = response.personalBests || {};

        // Find highest score
        let highScore = 0;
        Object.values(bests).forEach(game => {
            if (game && game.score > highScore) highScore = game.score;
        });

        document.getElementById('highScore').textContent = highScore;
    } catch (error) {
        console.error('Failed to load personal bests:', error);
    }
}

async function loadVocabulary() {
    try {
        const response = await apiCall(`/vocabulary/${currentLanguage}`);
        const vocabList = response.vocabulary || response.words || [];
        vocabulary = (vocabList.length > 0) ? vocabList : generateSampleVocabulary();
    } catch (error) {
        console.warn('Using sample vocabulary fallback');
        vocabulary = generateSampleVocabulary();
    }
}

function startGame(gameType) {
    currentGameType = gameType;
    score = 0;
    timer = 0;

    document.getElementById('gameSelection').classList.add('hidden');
    document.getElementById('gamePlayArea').classList.remove('hidden');

    const titles = {
        'word-match': '🎯 Word Match',
        'word-scramble': '🔤 Word Scramble',
        'speed-cards': '⚡ Speed Cards',
        'memory-game': '🧠 Memory Game',
        'typing-challenge': '⌨️ Typing Challenge'
    };

    document.getElementById('gameTitle').textContent = titles[gameType];
    updateScore();
    startTimer();

    switch (gameType) {
        case 'word-match':
            initWordMatch();
            break;
        case 'word-scramble':
            initWordScramble();
            break;
        case 'speed-cards':
            initSpeedCards();
            break;
        case 'memory-game':
            initMemoryGame();
            break;
        case 'typing-challenge':
            initTypingChallenge();
            break;
    }
}

// Word Match Game
function initWordMatch() {
    const words = vocabulary.slice(0, 6);
    const leftItems = words.map(w => w.word);
    const rightItems = words.map(w => w.translation).sort(() => Math.random() - 0.5);

    gameState = {
        words: words,
        matched: [],
        selectedLeft: null,
        selectedRight: null
    };

    const content = document.getElementById('gameContent');
    content.innerHTML = `
        <h2 class="text-center mb-3">Match words with their translations</h2>
        <div class="grid-2" style="gap: 24px;">
            <div id="leftColumn">
                ${leftItems.map((item, i) => `
                    <button class="card match-btn" onclick="speakWord('${item.replace(/'/g, "\\'")}'); selectMatchWord('left', '${item.replace(/'/g, "\\'")}', ${i})"
                        data-value="${item}" style="cursor: pointer; padding: 20px; margin-bottom: 12px; font-size: 20px; display:flex; align-items:center; justify-content:space-between; gap:8px;">
                        <span>${item}</span><span style="font-size:16px; opacity:0.6;">🔊</span>
                    </button>
                `).join('')}
            </div>
            <div id="rightColumn">
                ${rightItems.map((item, i) => `
                    <button class="card match-btn" onclick="speakWord('${item.replace(/'/g, "\\'")}', 'English'); selectMatchWord('right', '${item.replace(/'/g, "\\'")}', ${i})"
                        data-value="${item}" style="cursor: pointer; padding: 20px; margin-bottom: 12px; font-size: 20px; display:flex; align-items:center; justify-content:space-between; gap:8px;">
                        <span>${item}</span><span style="font-size:16px; opacity:0.6;">🔊</span>
                    </button>
                `).join('')}
            </div>
        </div>
    `;
}

function selectMatchWord(side, value, index) {
    if (side === 'left') {
        document.querySelectorAll('#leftColumn .match-btn').forEach(btn => {
            btn.style.border = '1px solid var(--border-color, rgba(0, 0, 0, 0.1))';
        });
        gameState.selectedLeft = value;
        event.target.style.border = '3px solid var(--purple)';
    } else {
        gameState.selectedRight = value;
        event.target.style.border = '3px solid var(--blue)';
    }

    if (gameState.selectedLeft && gameState.selectedRight) {
        const word = gameState.words.find(w => w.word === gameState.selectedLeft);
        if (word && word.translation === gameState.selectedRight) {
            // Correct match
            score += 100;
            updateScore();
            gameState.matched.push(gameState.selectedLeft);

            document.querySelectorAll('.match-btn').forEach(btn => {
                if (btn.dataset.value === gameState.selectedLeft || btn.dataset.value === gameState.selectedRight) {
                    btn.style.background = 'var(--green)';
                    btn.style.pointerEvents = 'none';
                    btn.style.opacity = '0.5';
                }
            });

            if (gameState.matched.length === gameState.words.length) {
                endGame();
            }
        } else {
            // Wrong match
            score -= 20;
            if (score < 0) score = 0;
            updateScore();

            showToast('Incorrect match!', 'error');
        }

        gameState.selectedLeft = null;
        gameState.selectedRight = null;
        document.querySelectorAll('.match-btn').forEach(btn => {
            if (btn.style.border !== '1px solid var(--border-color, rgba(0, 0, 0, 0.1))' && btn.style.pointerEvents !== 'none') {
                btn.style.border = '1px solid var(--border-color, rgba(0, 0, 0, 0.1))';
            }
        });
    }
}

// Word Scramble Game
function initWordScramble() {
    gameState = {
        currentIndex: 0,
        words: vocabulary.slice(0, 10)
    };

    loadScrambleWord();
}

function loadScrambleWord() {
    if (gameState.currentIndex >= gameState.words.length) {
        endGame();
        return;
    }

    const word = gameState.words[gameState.currentIndex];

    // Speak the hint (English translation)
    speakWord(word.translation, 'English');

    // Split into characters
    const letters = Array.from(word.word);
    const scrambled = [...letters].sort(() => Math.random() - 0.5);

    gameState.builtWord = '';
    gameState.originalLetters = [...scrambled];
    gameState.remainingLetters = [...scrambled];

    const content = document.getElementById('gameContent');
    content.innerHTML = `
        <div class="text-center">
            <h2 class="mb-2">Unscramble this word</h2>
            <p class="text-muted mb-3" style="cursor: pointer; display: inline-block;" onclick="speakWord('${word.translation.replace(/'/g, "\\'")}', 'English')" title="Click to hear hint">
                Hint: ${word.translation} <span style="font-size: 14px; opacity: 0.6; margin-left: 4px;">🔊</span>
            </p>
            
            <div id="builtWordDisplay" class="card scramble-card" style="margin: 24px 0; min-height: 80px; display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; border: 2px dashed var(--border-color);">
                <span style="color: var(--text-muted); font-style: italic;">Select letters below...</span>
            </div>

            <div id="letterButtons" style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 32px;">
                ${scrambled.map((char, i) => `
                    <button class="card letter-btn" onclick="addLetter('${char.replace(/'/g, "\\'")}', ${i})" id="letter-${i}"
                        style="cursor: pointer; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; transition: all 0.2s;">
                        ${char}
                    </button>
                `).join('')}
            </div>

            <div class="flex gap-2" style="justify-content: center;">
                <button class="btn btn-secondary" onclick="clearBuiltWord()">Clear</button>
                <button class="btn btn-primary" onclick="checkScramble('${word.word.replace(/'/g, "\\'")}')">
                    Check Answer
                </button>
            </div>
        </div>
    `;
}

function addLetter(char, index) {
    const btn = document.getElementById(`letter-${index}`);
    if (btn.style.opacity === '0.3') return; // Already used

    // Hide the button
    btn.style.opacity = '0.3';
    btn.style.pointerEvents = 'none';
    btn.style.transform = 'scale(0.9)';

    gameState.builtWord += char;
    updateBuiltWordDisplay();

    // Auto-speak the character
    speakWord(char);
}

function clearBuiltWord() {
    gameState.builtWord = '';
    updateBuiltWordDisplay();
    // Re-enable all buttons
    document.querySelectorAll('.letter-btn').forEach(btn => {
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
        btn.style.transform = 'scale(1)';
    });
}

function updateBuiltWordDisplay() {
    const display = document.getElementById('builtWordDisplay');
    if (gameState.builtWord.length === 0) {
        display.innerHTML = '<span style="color: var(--text-muted); font-style: italic;">Select letters below...</span>';
        return;
    }

    display.innerHTML = Array.from(gameState.builtWord).map(char => `
        <div class="card" style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 700; background: var(--emerald-light, #10B981); color: white; border: none; box-shadow: 0 4px 0 rgba(0,0,0,0.2);">
            ${char}
        </div>
    `).join('');
}

// Normalize text: remove accents so English keyboard users can type without special chars
// e.g. "Sí" → "si", "Adiós" → "adios", "வணக்கம்" stays as-is
function normalizeText(str) {
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function checkScramble(correctWord) {
    const input = gameState.builtWord || '';

    if (normalizeText(input) === normalizeText(correctWord)) {
        score += 50;
        updateScore();
        showToast('Correct! 🎉', 'success');
        playCorrectSound();

        // Speak the built word
        speakWord(correctWord);

        // Remove incorrect hint if shown
        const hint = document.getElementById('correctHint');
        if (hint) hint.remove();
        gameState.currentIndex++;
        setTimeout(loadScrambleWord, 1000);
    } else {
        score -= 10;
        if (score < 0) score = 0;
        updateScore();
        playWrongSound();
        showToast('Incorrect! ❌', 'error');
        // Show correct answer below buttons
        let hint = document.getElementById('correctHint');
        if (!hint) {
            hint = document.createElement('p');
            hint.id = 'correctHint';
            hint.style.cssText = 'color:#ef4444; font-weight:700; margin-top:12px; font-size:18px; text-align:center;';
            const letterButtons = document.getElementById('letterButtons');
            if (letterButtons) letterButtons.insertAdjacentElement('afterend', hint);
        }
        hint.innerHTML = `✅ Correct answer: <span style="color:var(--emerald,#10b981);">${correctWord}</span>`;
        speakWord(correctWord);
    }
}

// Correct answer sound - short happy beep
function playCorrectSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        [600, 900].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'sine'; osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
            gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i * 0.12 + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.25);
            osc.start(ctx.currentTime + i * 0.12);
            osc.stop(ctx.currentTime + i * 0.12 + 0.28);
        });
    } catch (e) { }
}

// Wrong answer sound - low buzz
function playWrongSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sawtooth'; osc.frequency.value = 160;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.32);
    } catch (e) { }
}

// Speed Cards Game
function initSpeedCards() {
    gameState = {
        currentIndex: 0,
        words: vocabulary.slice(0, 20),
        timeLimit: 60 // 60 seconds
    };

    loadSpeedCard();
}

function loadSpeedCard() {
    if (gameState.currentIndex >= gameState.words.length || timer >= gameState.timeLimit) {
        endGame();
        return;
    }

    const word = gameState.words[gameState.currentIndex];

    // Auto-pronounce the question word
    speakWord(word.word);

    const letters = Array.from(word.translation);
    const scrambled = [...letters].sort(() => Math.random() - 0.5);

    gameState.builtWord = '';

    const content = document.getElementById('gameContent');
    content.innerHTML = `
        <div class="text-center">
            <h2 class="mb-3">Translate quickly!</h2>
            <div class="card scramble-card" style="margin: 32px 0; cursor: pointer; position: relative;" onclick="speakWord('${word.word.replace(/'/g, "\\'")}')" title="Click to hear again">
                <h1 style="font-size: 56px; color: var(--text-primary);">${word.word}</h1>
                <div style="position: absolute; top: 12px; right: 16px; font-size: 20px; opacity: 0.5;">🔊</div>
            </div>
            
            <div id="builtWordDisplaySpeed" class="card scramble-card" style="margin: 24px 0; min-height: 80px; display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; border: 2px dashed var(--border-color);">
                <span style="color: var(--text-muted); font-style: italic;">Select letters below...</span>
            </div>

            <div id="letterButtonsSpeed" style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-bottom: 24px;">
                ${scrambled.map((char, i) => `
                    <button class="card letter-btn" onclick="addLetterToSpeed('${char.replace(/'/g, "\\'")}', ${i})" id="letter-speed-${i}"
                        style="cursor: pointer; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; transition: all 0.2s;">
                        ${char}
                    </button>
                `).join('')}
            </div>

            <div class="flex gap-2" style="justify-content: center;">
                <button class="btn btn-secondary" onclick="clearSpeedInput()">Clear</button>
                <button class="btn btn-primary" onclick="checkSpeedCard('${word.translation.replace(/'/g, "\\'")}')">Check</button>
            </div>
        </div>
    `;
}

function addLetterToSpeed(char, index) {
    const btn = document.getElementById(`letter-speed-${index}`);
    if (btn.style.opacity === '0.3') return;

    btn.style.opacity = '0.3';
    btn.style.pointerEvents = 'none';

    gameState.builtWord += char;
    updateBuiltWordDisplaySpeed();
    speakWord(char);
}

function clearSpeedInput() {
    gameState.builtWord = '';
    updateBuiltWordDisplaySpeed();
    document.querySelectorAll('#letterButtonsSpeed .letter-btn').forEach(btn => {
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
    });
}

function updateBuiltWordDisplaySpeed() {
    const display = document.getElementById('builtWordDisplaySpeed');
    if (gameState.builtWord.length === 0) {
        display.innerHTML = '<span style="color: var(--text-muted); font-style: italic;">Select letters below...</span>';
        return;
    }
    display.innerHTML = Array.from(gameState.builtWord).map(char => `
        <div class="card" style="width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; background: var(--purple-light, #8B5CF6); color: white; border: none; box-shadow: 0 4px 0 rgba(0,0,0,0.2);">
            ${char}
        </div>
    `).join('');
}

function checkSpeedCard(correctAnswer) {
    const input = gameState.builtWord || '';

    if (normalizeText(input) === normalizeText(correctAnswer)) {
        score += 25;
        updateScore();
        playCorrectSound();

        // Pronounce the correct answer
        speakWord(correctAnswer, 'English');

        gameState.currentIndex++;
        // Small delay before next card to let pronunciation start
        setTimeout(loadSpeedCard, 600);
    } else {
        playWrongSound();
        showToast('Incorrect!', 'error');
        clearSpeedInput();
    }
}

// Memory Game
function initMemoryGame() {
    const pairs = vocabulary.slice(0, 6);
    const cards = [];

    pairs.forEach((word, i) => {
        cards.push({ id: i, text: word.word, type: 'word', pairId: i });
        cards.push({ id: i + 100, text: word.translation, type: 'translation', pairId: i });
    });

    const shuffled = cards.sort(() => Math.random() - 0.5);

    gameState = {
        cards: shuffled,
        flipped: [],
        matched: [],
        firstCard: null,
        secondCard: null
    };

    const content = document.getElementById('gameContent');
    content.innerHTML = `
        <h2 class="text-center mb-3">Match the pairs!</h2>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; perspective: 1000px;">
            ${shuffled.map((card, i) => `
                <div class="card memory-card" onclick="flipMemoryCard(${i})" id="card-${i}"
                    style="cursor: pointer; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; padding: 0; position: relative; background: transparent; border: none; box-shadow: none; transition: transform 0.2s;">
                    <!-- Back of card -->
                    <div class="card-back" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: var(--gradient-primary); border-radius: 12px; border: 3px solid rgba(255,255,255,0.3); box-shadow: var(--shadow-md);">
                        <span style="font-size: 48px; color: white; font-weight: 900;">?</span>
                    </div>
                    <!-- Front of card (hidden by default) -->
                    <div class="card-front" style="display: none; width: 100%; height: 100%; align-items: center; justify-content: center; background: #ffffff; color: #000000; border-radius: 12px; border: 4px solid var(--purple); padding: 10px; animation: pop-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
                        <span style="font-size: 26px; font-weight: 800; line-height: 1.2; word-break: break-word; text-align: center;">${card.text}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function flipMemoryCard(index) {
    if (gameState.flipped.includes(index) || gameState.matched.includes(index)) return;
    if (gameState.firstCard !== null && gameState.secondCard !== null) return;

    const cardData = gameState.cards[index];
    const cardElement = document.getElementById(`card-${index}`);

    // Pronounce the word on flip
    if (cardData.type === 'translation') {
        speakWord(cardData.text, 'English');
    } else {
        speakWord(cardData.text);
    }

    cardElement.querySelector('.card-back').style.display = 'none';
    cardElement.querySelector('.card-front').style.display = 'flex';
    cardElement.style.transform = 'scale(1.05)';
    gameState.flipped.push(index);

    if (gameState.firstCard === null) {
        gameState.firstCard = index;
    } else {
        gameState.secondCard = index;

        const card1 = gameState.cards[gameState.firstCard];
        const card2 = gameState.cards[gameState.secondCard];

        if (card1.pairId === card2.pairId) {
            // Match!
            score += 100;
            updateScore();
            playCorrectSound();
            gameState.matched.push(gameState.firstCard, gameState.secondCard);

            // Keep them visible and highlight
            document.getElementById(`card-${gameState.firstCard}`).style.boxShadow = '0 0 20px var(--green)';
            document.getElementById(`card-${gameState.secondCard}`).style.boxShadow = '0 0 20px var(--green)';

            if (gameState.matched.length === gameState.cards.length) {
                setTimeout(endGame, 1000);
            }

            gameState.firstCard = null;
            gameState.secondCard = null;
        } else {
            // No match
            setTimeout(() => {
                const el1 = document.getElementById(`card-${gameState.firstCard}`);
                const el2 = document.getElementById(`card-${gameState.secondCard}`);

                if (el1) {
                    el1.querySelector('.card-back').style.display = 'flex';
                    el1.querySelector('.card-front').style.display = 'none';
                    el1.style.transform = 'scale(1)';
                }
                if (el2) {
                    el2.querySelector('.card-back').style.display = 'flex';
                    el2.querySelector('.card-front').style.display = 'none';
                    el2.style.transform = 'scale(1)';
                }

                gameState.flipped = gameState.flipped.filter(i => i !== gameState.firstCard && i !== gameState.secondCard);
                gameState.firstCard = null;
                gameState.secondCard = null;
            }, 1000);
        }
    }
}

// Typing Challenge
function initTypingChallenge() {
    gameState = {
        currentIndex: 0,
        words: vocabulary.slice(0, 15)
    };

    loadTypingWord();
}

function loadTypingWord() {
    if (gameState.currentIndex >= gameState.words.length) {
        endGame();
        return;
    }

    const word = gameState.words[gameState.currentIndex];

    // Speak the target word
    speakWord(word.word);

    const letters = Array.from(word.translation);
    const scrambled = [...letters].sort(() => Math.random() - 0.5);

    gameState.builtWord = '';

    const content = document.getElementById('gameContent');
    content.innerHTML = `
        <div class="text-center">
            <h2 class="mb-2">Type the translation!</h2>
            <div class="card scramble-card" style="margin: 32px 0; cursor: pointer; position: relative;" onclick="speakWord('${word.word.replace(/'/g, "\\'")}')" title="Click to hear again">
                <h1 style="font-size: 48px; color: var(--text-primary);">${word.word}</h1>
                <div style="position: absolute; top: 12px; right: 16px; font-size: 20px; opacity: 0.5;">🔊</div>
            </div>

            <div id="builtWordDisplayTyping" class="card scramble-card" style="margin: 24px 0; min-height: 80px; display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; border: 2px dashed var(--border-color);">
                <span style="color: var(--text-muted); font-style: italic;">Select letters below...</span>
            </div>

            <div id="letterButtonsTyping" style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-bottom: 24px;">
                ${scrambled.map((char, i) => `
                    <button class="card letter-btn" onclick="addLetterToTyping('${char.replace(/'/g, "\\'")}', ${i})" id="letter-typing-${i}"
                        style="cursor: pointer; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 700; transition: all 0.2s;">
                        ${char}
                    </button>
                `).join('')}
            </div>

            <div class="flex gap-2" style="justify-content: center;">
                <button class="btn btn-secondary" onclick="clearTypingInput()">Clear</button>
                <button class="btn btn-primary" onclick="checkTyping('${word.translation.replace(/'/g, "\\'")}')">Check Answer</button>
            </div>
        </div>
    `;
}

function addLetterToTyping(char, index) {
    const btn = document.getElementById(`letter-typing-${index}`);
    if (btn.style.opacity === '0.3') return;

    btn.style.opacity = '0.3';
    btn.style.pointerEvents = 'none';

    gameState.builtWord += char;
    updateBuiltWordDisplayTyping();
    speakWord(char);
}

function clearTypingInput() {
    gameState.builtWord = '';
    updateBuiltWordDisplayTyping();
    document.querySelectorAll('#letterButtonsTyping .letter-btn').forEach(btn => {
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
    });
}

function updateBuiltWordDisplayTyping() {
    const display = document.getElementById('builtWordDisplayTyping');
    if (gameState.builtWord.length === 0) {
        display.innerHTML = '<span style="color: var(--text-muted); font-style: italic;">Select letters below...</span>';
        return;
    }
    display.innerHTML = Array.from(gameState.builtWord).map(char => `
        <div class="card" style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; background: var(--emerald-light, #10B981); color: white; border: none; box-shadow: 0 4px 0 rgba(0,0,0,0.2);">
            ${char}
        </div>
    `).join('');
}

function checkTyping(correctAnswer) {
    const input = gameState.builtWord || '';

    if (normalizeText(input) === normalizeText(correctAnswer)) {
        score += 30;
        updateScore();
        playCorrectSound();

        // Speak the translation
        speakWord(correctAnswer, 'English');

        showToast('Correct! 🎉', 'success');
        // Remove incorrect hint if shown
        const hint = document.getElementById('correctHintTyping');
        if (hint) hint.remove();
        gameState.currentIndex++;
        setTimeout(loadTypingWord, 500);
    } else {
        score -= 5;
        if (score < 0) score = 0;
        updateScore();
        playWrongSound();
        showToast('Incorrect! ❌', 'error');
        // Show correct answer below buttons
        let hint = document.getElementById('correctHintTyping');
        if (!hint) {
            hint = document.createElement('p');
            hint.id = 'correctHintTyping';
            hint.style.cssText = 'color:#ef4444; font-weight:700; margin-top:12px; font-size:18px; text-align:center;';
            const letterButtons = document.getElementById('letterButtonsTyping');
            if (letterButtons) letterButtons.insertAdjacentElement('afterend', hint);
        }
        hint.innerHTML = `✅ Correct answer: <span style="color:var(--emerald,#10b981);">${correctAnswer}</span>`;
        speakWord(correctAnswer);
        clearTypingInput();
    }
}

// Utility Functions
function startTimer() {
    timerInterval = setInterval(() => {
        timer++;
        const minutes = Math.floor(timer / 60);
        const seconds = timer % 60;
        document.getElementById('timer').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateScore() {
    document.getElementById('score').textContent = score;
}

async function endGame() {
    stopTimer();

    const maxScores = {
        'word-match': 600,
        'word-scramble': 500,
        'speed-cards': 500,
        'memory-game': 1200,
        'typing-challenge': 450
    };

    const maxScore = maxScores[currentGameType] || 1000;

    // Save game result
    try {
        const response = await apiCall('/games/complete', {
            method: 'POST',
            body: JSON.stringify({
                language: currentLanguage,
                gameType: currentGameType,
                score: score,
                maxScore: maxScore,
                duration: timer
            })
        });

        document.getElementById('xpEarned').textContent = `+${response.xpEarned} XP`;
    } catch (error) {
        console.error('Failed to save game:', error);
        document.getElementById('xpEarned').textContent = '+0 XP';
    }

    // Show results
    document.getElementById('gamePlayArea').classList.add('hidden');
    document.getElementById('resultsScreen').classList.remove('hidden');

    document.getElementById('finalScore').textContent = score;
    const minutes = Math.floor(timer / 60);
    const seconds = timer % 60;
    document.getElementById('finalTime').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    playSuccessSound();
    triggerConfetti();
}

// Cute victory sound using Web Audio API
function playSuccessSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.18);
            gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + i * 0.18 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.4);
            osc.start(ctx.currentTime + i * 0.18);
            osc.stop(ctx.currentTime + i * 0.18 + 0.45);
        });
    } catch (e) {
        // Audio not supported, skip
    }
}

function exitGame() {
    // Pause timer while modal is open
    stopTimer();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.zIndex = '10001'; // Ensure it's above everything
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px; text-align: center; padding: 40px;">
            <div style="font-size: 64px; margin-bottom: 20px;">🚪</div>
            <h2 style="margin-bottom: 12px;">Exit Game?</h2>
            <p class="text-muted" style="margin-bottom: 32px;">Your current progress and score will be lost.</p>
            
            <div style="display: flex; flex-direction: column; gap: 12px;">
                <button id="confirmExitBtn" class="btn btn-danger" style="width: 100%;">Yes, Exit Game</button>
                <button id="cancelExitBtn" class="btn btn-secondary" style="width: 100%;">No, Keep Playing</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('confirmExitBtn').onclick = () => {
        modal.remove();
        backToGames();
    };

    document.getElementById('cancelExitBtn').onclick = () => {
        modal.remove();
        startTimer(); // Resume timer
    };
}

function playAgain() {
    document.getElementById('resultsScreen').classList.add('hidden');
    startGame(currentGameType);
}

function backToGames() {
    stopTimer();
    document.getElementById('gamePlayArea').classList.add('hidden');
    document.getElementById('resultsScreen').classList.add('hidden');
    document.getElementById('gameSelection').classList.remove('hidden');
}

async function loadLeaderboard(gameType) {
    try {
        const response = await apiCall(`/games/leaderboard/${gameType}?language=${currentLanguage}`);
        const leaderboard = response.leaderboard || [];

        const content = document.getElementById('leaderboardContent');
        if (leaderboard.length === 0) {
            content.innerHTML = '<p class="text-muted text-center" style="padding: 24px;">No scores yet. Be the first!</p>';
            return;
        }

        content.innerHTML = leaderboard.slice(0, 10).map((entry, i) => `
            <div class="card mb-1" style="display: flex; justify-content: space-between; padding: 12px;">
                <div class="flex gap-2" style="align-items: center;">
                    <span style="font-size: 20px; font-weight: 700; width: 30px;">#${i + 1}</span>
                    <span>${entry.name || entry.username}</span>
                </div>
                <span style="color: var(--purple); font-weight: 600;">${entry.score} pts</span>
            </div>
        `).join('');

        // Update tab buttons
        document.querySelectorAll('#leaderboardTabs button').forEach(btn => {
            btn.className = 'btn btn-secondary';
        });
        event.target.className = 'btn btn-primary';
    } catch (error) {
        console.error('Failed to load leaderboard:', error);
    }
}

function generateSampleVocabulary(language) {
    const lang = language || currentLanguage;
    const vocabMap = {
        'Spanish': [
            { word: 'Hola', translation: 'Hello' },
            { word: 'Gracias', translation: 'Thank you' },
            { word: 'Sí', translation: 'Yes' },
            { word: 'No', translation: 'No' },
            { word: 'Agua', translation: 'Water' },
            { word: 'Comida', translation: 'Food' },
            { word: 'Casa', translation: 'House' },
            { word: 'Amor', translation: 'Love' },
            { word: 'Felicidad', translation: 'Happiness' },
            { word: 'Amigo', translation: 'Friend' }
        ],
        'Tamil': [
            { word: 'வணக்கம்', translation: 'Hello' },
            { word: 'நன்றி', translation: 'Thank you' },
            { word: 'சரி', translation: 'Okay' },
            { word: 'இல்லை', translation: 'No' },
            { word: 'ஆம்', translation: 'Yes' },
            { word: 'தண்ணீர்', translation: 'Water' },
            { word: 'உணவு', translation: 'Food' },
            { word: 'வீடு', translation: 'House' },
            { word: 'அன்பு', translation: 'Love' },
            { word: 'மகிழ்ச்சி', translation: 'Happiness' }
        ],
        'Hindi': [
            { word: 'नमस्ते', translation: 'Hello' },
            { word: 'धन्यवाद', translation: 'Thank you' },
            { word: 'हाँ', translation: 'Yes' },
            { word: 'नहीं', translation: 'No' },
            { word: 'पानी', translation: 'Water' },
            { word: 'खाना', translation: 'Food' },
            { word: 'घर', translation: 'House' },
            { word: 'प्यार', translation: 'Love' },
            { word: 'खुशी', translation: 'Happiness' },
            { word: 'दोस्त', translation: 'Friend' }
        ],
        'Telugu': [
            { word: 'నమస్కారం', translation: 'Hello' },
            { word: 'ధన్యవాదాలు', translation: 'Thank you' },
            { word: 'అవును', translation: 'Yes' },
            { word: 'కాదు', translation: 'No' },
            { word: 'నీరు', translation: 'Water' },
            { word: 'ఆహారం', translation: 'Food' },
            { word: 'ఇల్లు', translation: 'House' },
            { word: 'ప్రేమ', translation: 'Love' },
            { word: 'సంతోషం', translation: 'Happiness' },
            { word: 'స్నేహితుడు', translation: 'Friend' }
        ],
        'French': [
            { word: 'Bonjour', translation: 'Hello' },
            { word: 'Merci', translation: 'Thank you' },
            { word: 'Oui', translation: 'Yes' },
            { word: 'Non', translation: 'No' },
            { word: 'Eau', translation: 'Water' },
            { word: 'Maison', translation: 'House' },
            { word: 'Amour', translation: 'Love' },
            { word: 'Bonne nuit', translation: 'Good night' },
            { word: 'Au revoir', translation: 'Goodbye' },
            { word: 'S\'il vous plaît', translation: 'Please' }
        ],
        'German': [
            { word: 'Hallo', translation: 'Hello' },
            { word: 'Danke', translation: 'Thank you' },
            { word: 'Ja', translation: 'Yes' },
            { word: 'Nein', translation: 'No' },
            { word: 'Wasser', translation: 'Water' },
            { word: 'Haus', translation: 'House' },
            { word: 'Liebe', translation: 'Love' },
            { word: 'Guten Morgen', translation: 'Good morning' },
            { word: 'Auf Wiedersehen', translation: 'Goodbye' },
            { word: 'Bitte', translation: 'Please' }
        ],
        'Japanese': [
            { word: 'こんにちは', translation: 'Hello' },
            { word: 'ありがとう', translation: 'Thank you' },
            { word: 'はい', translation: 'Yes' },
            { word: 'いいえ', translation: 'No' },
            { word: 'みず', translation: 'Water' },
            { word: 'いえ', translation: 'House' },
            { word: 'あい', translation: 'Love' },
            { word: 'うれしい', translation: 'Happy' },
            { word: 'かなしい', translation: 'Sad' },
            { word: 'きれい', translation: 'Beautiful' }
        ],
        Italian: [
            { word: 'Ciao', translation: 'Hello' },
            { word: 'Arrivederci', translation: 'Goodbye' },
            { word: 'Grazie', translation: 'Thank you' },
            { word: 'Per favore', translation: 'Please' },
            { word: 'Sì', translation: 'Yes' },
            { word: 'No', translation: 'No' },
            { word: 'Amore', translation: 'Love' },
            { word: 'Felice', translation: 'Happy' },
            { word: 'Triste', translation: 'Sad' },
            { word: 'Casa', translation: 'House' }
        ],
        Portuguese: [
            { word: 'Olá', translation: 'Hello' },
            { word: 'Adeus', translation: 'Goodbye' },
            { word: 'Obrigado', translation: 'Thank you' },
            { word: 'Por favor', translation: 'Please' },
            { word: 'Sim', translation: 'Yes' },
            { word: 'Não', translation: 'No' },
            { word: 'Amor', translation: 'Love' },
            { word: 'Feliz', translation: 'Happy' },
            { word: 'Triste', translation: 'Sad' },
            { word: 'Casa', translation: 'House' }
        ],
        Malayalam: [
            { word: 'Namaskaram', translation: 'Hello' },
            { word: 'Pokunnu', translation: 'Goodbye' },
            { word: 'Nandi', translation: 'Thank you' },
            { word: 'Dayavayi', translation: 'Please' },
            { word: 'Athe', translation: 'Yes' },
            { word: 'Alla', translation: 'No' },
            { word: 'Sneham', translation: 'Love' },
            { word: 'Santhosham', translation: 'Happy' },
            { word: 'Dukham', translation: 'Sad' },
            { word: 'Veedu', translation: 'House' }
        ],
        Kannada: [
            { word: 'Namaskara', translation: 'Hello' },
            { word: 'Hogi Baruttene', translation: 'Goodbye' },
            { word: 'Dhanyavadagalu', translation: 'Thank you' },
            { word: 'Dayavittu', translation: 'Please' },
            { word: 'Houdhu', translation: 'Yes' },
            { word: 'Illa', translation: 'No' },
            { word: 'Prema', translation: 'Love' },
            { word: 'Santhosha', translation: 'Happy' },
            { word: 'Dukha', translation: 'Sad' },
            { word: 'Mane', translation: 'House' }
        ],
        Chinese: [
            { word: 'Nǐ hǎo', translation: 'Hello' },
            { word: 'Zàijiàn', translation: 'Goodbye' },
            { word: 'Xièxiè', translation: 'Thank you' },
            { word: 'Qǐng', translation: 'Please' },
            { word: 'Shì', translation: 'Yes' },
            { word: 'Bù', translation: 'No' },
            { word: 'Ài', translation: 'Love' },
            { word: 'Kuàilè', translation: 'Happy' },
            { word: 'Nánguò', translation: 'Sad' },
            { word: 'Jiā', translation: 'House' }
        ],
        Korean: [
            { word: 'Annyeonghaseyo', translation: 'Hello' },
            { word: 'Annyeong', translation: 'Goodbye' },
            { word: 'Gamsahamnida', translation: 'Thank you' },
            { word: 'Juseyo', translation: 'Please' },
            { word: 'Ne', translation: 'Yes' },
            { word: 'Aniyo', translation: 'No' },
            { word: 'Sarang', translation: 'Love' },
            { word: 'Haengbok', translation: 'Happy' },
            { word: 'Seulpeum', translation: 'Sad' },
            { word: 'Jip', translation: 'House' }
        ],
        Arabic: [
            { word: 'Marhaba', translation: 'Hello' },
            { word: 'Ma assalama', translation: 'Goodbye' },
            { word: 'Shukran', translation: 'Thank you' },
            { word: 'Min fadlak', translation: 'Please' },
            { word: "Na'am", translation: 'Yes' },
            { word: 'La', translation: 'No' },
            { word: 'Hubb', translation: 'Love' },
            { word: 'Saeed', translation: 'Happy' },
            { word: 'Hazeen', translation: 'Sad' },
            { word: 'Bayt', translation: 'House' }
        ],
        Russian: [
            { word: 'Privet', translation: 'Hello' },
            { word: 'Poka', translation: 'Goodbye' },
            { word: 'Spasibo', translation: 'Thank you' },
            { word: 'Pozhaluysta', translation: 'Please' },
            { word: 'Da', translation: 'Yes' },
            { word: 'Net', translation: 'No' },
            { word: 'Lyubov', translation: 'Love' },
            { word: 'Schastlivy', translation: 'Happy' },
            { word: 'Grustniy', translation: 'Sad' },
            { word: 'Dom', translation: 'House' }
        ],
        Dutch: [
            { word: 'Hallo', translation: 'Hello' },
            { word: 'Tot ziens', translation: 'Goodbye' },
            { word: 'Dank je', translation: 'Thank you' },
            { word: 'Alsjeblieft', translation: 'Please' },
            { word: 'Ja', translation: 'Yes' },
            { word: 'Nee', translation: 'No' },
            { word: 'Liefde', translation: 'Love' },
            { word: 'Gelukkig', translation: 'Happy' },
            { word: 'Verdrietig', translation: 'Sad' },
            { word: 'Huis', translation: 'House' }
        ],
        Swedish: [
            { word: 'Hej', translation: 'Hello' },
            { word: 'Hej då', translation: 'Goodbye' },
            { word: 'Tack', translation: 'Thank you' },
            { word: 'Snälla', translation: 'Please' },
            { word: 'Ja', translation: 'Yes' },
            { word: 'Nej', translation: 'No' },
            { word: 'Kärlek', translation: 'Love' },
            { word: 'Glad', translation: 'Happy' },
            { word: 'Ledsen', translation: 'Sad' },
            { word: 'Hus', translation: 'House' }
        ],
        Turkish: [
            { word: 'Merhaba', translation: 'Hello' },
            { word: 'Hoşça kal', translation: 'Goodbye' },
            { word: 'Teşekkür ederim', translation: 'Thank you' },
            { word: 'Lütfen', translation: 'Please' },
            { word: 'Evet', translation: 'Yes' },
            { word: 'Hayır', translation: 'No' },
            { word: 'Aşk', translation: 'Love' },
            { word: 'Mutlu', translation: 'Happy' },
            { word: 'Üzgün', translation: 'Sad' },
            { word: 'Ev', translation: 'House' }
        ],
        Polish: [
            { word: 'Cześć', translation: 'Hello' },
            { word: 'Do widzenia', translation: 'Goodbye' },
            { word: 'Dziękuję', translation: 'Thank you' },
            { word: 'Proszę', translation: 'Please' },
            { word: 'Tak', translation: 'Yes' },
            { word: 'Nie', translation: 'No' },
            { word: 'Miłość', translation: 'Love' },
            { word: 'Szczęśliwy', translation: 'Happy' },
            { word: 'Smutny', translation: 'Sad' },
            { word: 'Dom', translation: 'House' }
        ],
        Greek: [
            { word: 'Yassas', translation: 'Hello' },
            { word: 'Andio', translation: 'Goodbye' },
            { word: 'Efharisto', translation: 'Thank you' },
            { word: 'Parakalo', translation: 'Please' },
            { word: 'Nai', translation: 'Yes' },
            { word: 'Ohi', translation: 'No' },
            { word: 'Agapi', translation: 'Love' },
            { word: 'Eftyhistos', translation: 'Happy' },
            { word: 'Tristos', translation: 'Sad' },
            { word: 'Spiti', translation: 'House' }
        ]
    };

    const words = vocabMap[lang] || vocabMap['Spanish'];
    return words.map(w => ({
        word: w.word,
        translation: w.translation
    }));
}
