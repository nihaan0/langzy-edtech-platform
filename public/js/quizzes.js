// Quizzes Page Logic
requireAuth();

const user = getUser();
let currentLanguage = user.currentLanguage || 'Spanish';
let quizType = '';
let quizzes = [];
let currentQuizIndex = 0;
let hearts = 5;
let correctAnswers = 0;
let userAnswer = null;

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

    // Reset quiz if in progress
    if (!document.getElementById('quizSelection').classList.contains('hidden')) {
        // Already in selection screen, nothing to reset
    } else {
        // In quiz, ask to restart
        if (confirm(`Switch to ${language}? Current quiz progress will be lost.`)) {
            resetQuiz();
        } else {
            // Revert selector
            document.getElementById('languageSelector').value = currentLanguage;
        }
    }
}

async function loadUserData() {
    const user = getUser();
    currentLanguage = user.currentLanguage || 'Spanish';
    hearts = user.hearts || 5;

    const langInfo = getLanguageInfo(currentLanguage);
    document.getElementById('languageName').textContent = `${langInfo.flag} ${currentLanguage}`;
    document.getElementById('languageSelector').value = currentLanguage;

    updateHeartsDisplay();
}

// Start quiz
async function startQuiz(type) {
    quizType = type;

    showLoading();

    // Fetch quizzes from backend (or use sample data)
    try {
        const response = await apiCall(`/lessons/quizzes?language=${currentLanguage}&type=${type}`);
        quizzes = (response.quizzes && response.quizzes.length > 0) ? response.quizzes : generateSampleQuizzes(type);
    } catch (error) {
        console.warn('Using sample quizzes');
        quizzes = generateSampleQuizzes(type);
    }

    hideLoading();

    // Hide selection, show quiz interface
    document.getElementById('quizSelection').classList.add('hidden');
    document.getElementById('quizInterface').classList.remove('hidden');

    // Update quiz type title
    const titles = {
        'multiple-choice': '✔️ Multiple Choice',
        'translation': '🔄 Translation',
        'listening': '🎧 Listening',
        'writing': '✍️ Writing Master'
    };
    document.getElementById('quizTypeTitle').textContent = titles[type];
    document.getElementById('totalQuestions').textContent = quizzes.length;

    currentQuizIndex = 0;
    correctAnswers = 0;
    loadQuiz();
}

// Load current quiz
function loadQuiz() {
    const quiz = quizzes[currentQuizIndex];
    const container = document.getElementById('quizContent');

    // Update progress
    document.getElementById('currentQuestion').textContent = currentQuizIndex + 1;

    // Reset UI
    const checkBtn = document.getElementById('checkBtn');
    checkBtn.disabled = true;
    checkBtn.textContent = 'Check Answer';
    checkBtn.onclick = checkAnswer;

    document.getElementById('skipBtn').disabled = false;
    document.getElementById('feedbackArea').classList.add('hidden');
    userAnswer = null;
    window.isChecking = false; // Flag to prevent multiple checks

    // Render quiz based on type
    switch (quizType) {
        case 'multiple-choice':
        case 'multiple_choice':
            renderMultipleChoice(quiz);
            break;
        case 'fill-blank':
        case 'fill_blank':
            renderFillBlank(quiz);
            break;
        case 'translation':
            renderTranslation(quiz);
            break;
        case 'listening':
            renderListening(quiz);
            break;
        case 'writing':
            renderFillBlank(quiz);
            break;
        default:
            renderMultipleChoice(quiz);
    }

}

// Render multiple choice quiz
function renderMultipleChoice(quiz) {
    const container = document.getElementById('quizContent');
    container.innerHTML = `
        <div class="text-center mb-1 pop-in">
            <div class="quiz-icon" style="font-size: 80px; margin-bottom: 20px;">${quiz.icon || '❓'}</div>
            <h2 style="margin-bottom: 32px; font-size: 28px;">${quiz.question}</h2>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 20px;" id="optionsContainer">
            ${quiz.options.map((option, index) => {
        // Parse option pattern: "Script (Translit) | Meaning"
        let script = option;
        let translit = '';
        let meaning = '';

        if (option.includes('|')) {
            const parts = option.split('|').map(p => p.trim());
            script = parts[0];
            meaning = parts[1];
        } else if (option.includes('(') && option.includes(')')) {
            const m = script.match(/(.*)\s*\((.*)\)/);
            if (m) {
                script = m[1].trim();
                translit = m[2].trim();
            }
        }

        return `
                <button class="card option-btn pop-in" data-index="${index}" onclick="selectOption('${option.replace(/'/g, "\\'")}', ${index})" 
                    style="cursor: pointer; padding: 24px; border-radius: 20px; animation-delay: ${index * 0.1}s; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 120px; border: 2px solid #e2e8f0; transition: all 0.2s ease;">
                    <div style="font-size: 20px; font-weight: 800; color: var(--text-primary);">${script}</div>
                    ${translit ? `<div style="font-size: 14px; color: #64748b; font-style: italic; margin-top: 4px;">(${translit})</div>` : ''}
                    ${meaning ? `<div style="margin-top: 10px; padding: 4px 12px; background: #f1f5f9; border-radius: 8px; font-size: 12px; font-weight: 700; color: var(--purple); text-transform: uppercase;">${meaning}</div>` : ''}
                </button>
                `;
    }).join('')}
        </div>
    `;
}

function renderFillBlank(quiz) {
    const container = document.getElementById('quizContent');
    container.innerHTML = `
        <div class="text-center mb-3 pop-in">
            <div class="quiz-icon" style="font-size: 80px; margin-bottom: 20px;">${quiz.icon || '✏️'}</div>
            <h2 style="margin-bottom: 24px; font-size: 24px;">${quiz.question}</h2>
            <input type="text" id="fillBlankInput" placeholder="Type your answer here..."
                style="font-size: 22px; padding: 16px 24px; border-radius: 12px; border: 2px solid var(--border-color); width: 100%; max-width: 400px; text-align: center; outline: none; background: var(--bg-secondary); color: var(--text-primary);"
                oninput="userAnswer = this.value; document.getElementById('checkBtn').disabled = !this.value.trim();"
                onkeydown="if(event.key==='Enter' && this.value.trim()) checkAnswer();" aria-label="Answer input" />
            <p class="text-muted" style="margin-top: 12px; font-size: 14px;">💡 Hint: ${quiz.hint || 'Think carefully!'}</p>
            <div id="keyboardContainer"></div>
        </div>
    `;

    // Render keyboard for specific languages
    renderLanguageKeyboard(currentLanguage);

    setTimeout(() => { const el = document.getElementById('fillBlankInput'); if (el) el.focus(); }, 100);
    userAnswer = null;
}

// Render on-screen keyboard for non-Latin scripts
function renderLanguageKeyboard(language) {
    const container = document.getElementById('keyboardContainer');
    if (!container) return;

    const layouts = {
        'Russian': 'йцукенгшщзхъфывапролджэячсмитьбю'.split(''),
        'Tamil': 'அஆஇஈஉஊஎஏஐஒஓஔகசடதபயரலவழளறன'.split(''),
        'Hindi': 'अआइईउऊऋएऐओऔकखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसह'.split(''),
    };

    const chars = layouts[language];
    if (!chars) return;

    container.className = 'keyboard-container';
    container.innerHTML = chars.map(char => `
        <button class="key-btn" onclick="insertChar('${char}')">${char}</button>
    `).join('');
}

function insertChar(char) {
    const input = document.getElementById('fillBlankInput');
    if (!input) return;

    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;
    input.value = text.substring(0, start) + char + text.substring(end);
    input.selectionStart = input.selectionEnd = start + char.length;
    input.focus();

    userAnswer = input.value;
    document.getElementById('checkBtn').disabled = !input.value.trim();
}

// Render translation quiz — always uses word bank tiles (no typing required)
function renderTranslation(quiz) {
    renderWordBank(quiz);
}

// Render Word Bank UI — always used for translation quizzes
function renderWordBank(quiz) {
    const container = document.getElementById('quizContent');

    // Get correct answer and split into words
    // For Tamil, we might have "வணக்கம் (Vanakkam)", we just want the script part for the bank
    const cleanAnswer = quiz.correctAnswer.replace(/\(.*\)/, '').trim();
    const correctWords = cleanAnswer.split(/\s+/).filter(w => w.length > 0);

    // Per-language distractor word banks
    const langDistractors = {
        'Tamil': ['தமிழ்', 'வணக்கம்', 'நன்றி', 'இல்ளை', 'உங்கள்', 'என்ன', 'அவர்', 'இத்', 'சாப்பிட'],
        'Hindi': ['नमस्ते', 'धन्नवाद', 'आप', 'मैं', 'हाँ', 'नहीं', 'कैसे', 'घर', 'खाना'],
        'Japanese': ['はい', 'いいえ', 'これ', 'それ', '私', 'ありがとう', 'すみません', 'こんにちは', 'さようなら'],
        'Chinese': ['是', '不', '我', '你', '他', '谢谢', '学校', '今天', '小'],
        'Korean': ['네', '아니요', '저', '우리', '감사합니다', '안녕', '집', '밥', '오늘'],
        'Arabic': ['نعم', 'لا', 'شكراً', 'أنا', 'هو', 'بيت', 'ماء', 'خبز', 'كتاب'],
        'Russian': ['да', 'нет', 'спасибо', 'привет', 'я', 'он', 'дом', 'еда', 'школа'],
        'Spanish': ['hola', 'gracias', 'por favor', 'adios', 'bueno', 'agua', 'casa', 'hoy', 'no'],
        'French': ['bonjour', 'merci', 's\'il vous plaît', 'au revoir', 'oui', 'non', 'eau', 'maison', 'aujourd\'hui'],
        'German': ['hallo', 'danke', 'bitte', 'ja', 'nein', 'haus', 'wasser', 'heute', 'schule'],
        'Italian': ['ciao', 'grazie', 'per favore', 'sì', 'no', 'acqua', 'casa', 'oggi', 'scuola'],
        'Portuguese': ['olá', 'obrigado', 'por favor', 'sim', 'não', 'água', 'casa', 'hoje', 'escola'],
    };

    const distractors = langDistractors[currentLanguage] || ['yes', 'no', 'the', 'and', 'is', 'a', 'to', 'in'];
    const extras = distractors.filter(d => !correctWords.includes(d)).slice(0, 4);
    const pool = [...correctWords, ...extras].sort(() => Math.random() - 0.5);

    container.innerHTML = `
        <div class="text-center mb-3 pop-in">
            <div class="quiz-icon">${quiz.icon || '🔄'}</div>
            <h2 style="margin-bottom: 16px;">Translate this sentence</h2>
            <div class="card" style="background: var(--bg-secondary); padding: 24px; margin: 16px 0; cursor: pointer;" onclick="playAudio('${(quiz.sentence || quiz.question).replace(/'/g, "\\'")}')">
                <p style="font-size: 24px; font-weight: bold;">
                    <span style="margin-right: 10px;">🔊</span>
                    ${quiz.sentence || quiz.question}
                </p>
            </div>
        </div>

        <div id="selectedWords" class="pop-in" style="min-height:56px; border:2px dashed rgba(124,58,237,0.3); border-radius:12px; padding:10px 14px; display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-bottom:12px;">
            <p class="text-muted" id="wordBankPlaceholder" style="margin:0;">Tap words below to build your answer ↓</p>
        </div>

        <div class="word-bank pop-in">
            ${pool.map((word, idx) => `
                <button class="word-bubble" onclick="selectWordBubble(this, '${word.replace(/'/g, "\\'")}')"
                    data-idx="${idx}" data-word="${word.replace(/"/g, '&quot;')}">
                    ${word}
                </button>
            `).join('')}
        </div>

        <div class="text-center mt-2">
            <button class="btn btn-secondary" onclick="resetWordBank()" style="padding:8px 16px;font-size:14px;">🔄 Clear</button>
        </div>
    `;

    window.selectedBubbles = [];
    userAnswer = '';
}

function selectWordBubble(el, word) {
    if (el.classList.contains('selected')) return;

    // Pronounce the word when tapped
    const langCode = getLanguageCode(currentLanguage);
    speak(word, langCode);

    const placeholder = document.getElementById('wordBankPlaceholder');
    if (placeholder) placeholder.remove();

    el.classList.add('selected');
    el.style.opacity = '0.35';
    el.style.pointerEvents = 'none';
    window.selectedBubbles.push(word);

    const selectedArea = document.getElementById('selectedWords');
    const newBubble = document.createElement('button');
    newBubble.className = 'word-bubble pop-in';
    newBubble.textContent = word;
    newBubble.style.cssText = 'background: rgba(124,58,237,0.25); border-color: var(--purple);';
    newBubble.title = 'Click to remove';
    newBubble.onclick = () => {
        // Remove this word from selected list
        const idx = window.selectedBubbles.indexOf(word);
        if (idx !== -1) window.selectedBubbles.splice(idx, 1);
        newBubble.remove();
        // Re-enable the source bubble
        el.classList.remove('selected');
        el.style.opacity = '';
        el.style.pointerEvents = '';
        // Put placeholder back if empty
        if (window.selectedBubbles.length === 0) {
            const ph = document.createElement('p');
            ph.className = 'text-muted';
            ph.id = 'wordBankPlaceholder';
            ph.style.margin = '0';
            ph.textContent = 'Tap words below to build your answer ↓';
            selectedArea.appendChild(ph);
        }
        userAnswer = window.selectedBubbles.join(' ');
        if (window.selectedBubbles.length === 0) document.getElementById('checkBtn').disabled = true;
    };

    selectedArea.appendChild(newBubble);
    userAnswer = window.selectedBubbles.join(' ');
    enableCheckButton();
}

function resetWordBank() {
    loadQuiz(); // Just reload the current quiz question to reset
}

// Render listening quiz — uses options from DB quiz data
function renderListening(quiz) {
    const container = document.getElementById('quizContent');

    // audioWord is the target-language word to speak; correctAnswer is the English meaning
    const audioWord = quiz.audioWord || quiz.audioText || quiz.correctAnswer;
    // Generic placeholders to avoid
    const placeholders = ['Something else', 'I don\'t know', 'None of these', 'Other'];
    const fallbackDistractors = ['Water', 'Apple', 'Tea', 'Coffee', 'Milk', 'Bread', 'Rice', 'Food', 'Hello', 'Thank you'];

    let pool = (quiz.options && quiz.options.length > 0) ? [...quiz.options] : [quiz.correctAnswer];

    // Filter out placeholders and ensure we have at least 4 unique options
    pool = pool.filter(opt => !placeholders.includes(opt));
    if (!pool.includes(quiz.correctAnswer)) pool.push(quiz.correctAnswer);

    while (pool.length < 4) {
        const randomDist = fallbackDistractors[Math.floor(Math.random() * fallbackDistractors.length)];
        if (!pool.includes(randomDist)) pool.push(randomDist);
    }
    pool = pool.sort(() => Math.random() - 0.5);

    container.innerHTML = `
        <div class="text-center mb-3">
            <h2 style="margin-bottom: 24px;">🎧 What do you hear?</h2>
            <button class="btn btn-primary" onclick="playAudio('${audioWord.replace(/'/g, "\\'")}')" 
                style="font-size: 64px; padding: 40px; border-radius: 50%; width: 140px; height: 140px; margin-bottom: 8px;">
                🔊
            </button>
            <p class="text-muted" style="font-size: 14px; margin-bottom: 20px;">Tap 🔊 to hear — then pick the meaning</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr; gap: 16px; margin-top: 20px;" id="optionsContainer">
            ${pool.map((word, idx) => `
                <button class="card option-btn pop-in" data-index="${idx}"
                    onclick="selectListeningAnswer(this, '${word.replace(/'/g, "\\'")}')" 
                    style="cursor:pointer; padding:24px; font-size:16px; font-weight:bold; text-align:center; min-height: 80px; border-radius: 16px; animation-delay:${idx * 0.1}s;">
                    ${word}
                </button>
            `).join('')}
        </div>
    `;

    // Auto-play audio when question loads
    setTimeout(() => playAudio(audioWord), 400);
    userAnswer = null;
}

function selectListeningAnswer(el, word) {
    // Deselect all option buttons
    document.querySelectorAll('.option-btn').forEach(b => {
        b.style.border = '1px solid var(--border-color, rgba(0,0,0,0.1))';
        b.style.background = '';
    });
    // Highlight selected
    el.style.border = '3px solid var(--purple)';
    el.style.background = 'rgba(124,58,237,0.1)';
    userAnswer = word;
    enableCheckButton();
}


// speaking functionality removed
// Matching quiz removed

// Select option (multiple choice)
function selectOption(option, index) {
    userAnswer = option;
    window.lastSelectedIndex = index; // Store for animation

    // Speak the selected option
    speak(option, getLanguageCode(currentLanguage));

    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.style.border = '1px solid var(--border-color, rgba(0, 0, 0, 0.1))';
    });

    const btn = document.querySelector(`.option-btn[data-index="${index}"]`);
    if (btn) btn.style.border = '3px solid var(--purple)';
    document.getElementById('checkBtn').disabled = false;
}

// Select match item
// selectMatchItem removed

// Enable check button
function enableCheckButton() {
    document.getElementById('checkBtn').disabled = false;
}

// Check answer
async function checkAnswer() {
    if (window.isChecking) return;
    window.isChecking = true;

    const quiz = quizzes[currentQuizIndex];
    let isCorrect = false;

    // Disable all inputs in the current content
    const inputs = document.getElementById('quizContent').querySelectorAll('button, input, textarea');
    inputs.forEach(el => el.disabled = true);
    document.getElementById('skipBtn').disabled = true;

    // Normalization logic for language-specific scripts (Tamil/Hindi)
    function normalize(text) {
        return text.toLowerCase().replace(/\(.*\)/, '').trim();
    }

    function getTranslit(text) {
        const match = text.match(/\((.*)\)/);
        return match ? match[1].toLowerCase().trim() : null;
    }

    switch (quizType) {
        case 'multiple-choice':
        case 'multiple_choice':
            isCorrect = userAnswer.trim() === quiz.correctAnswer.trim();
            break;
        case 'translation':
            const transValue = userAnswer || document.getElementById('translationInput')?.value.trim().toLowerCase() || '';
            const normalizedTValue = transValue.trim().toLowerCase();
            const targetScript = normalize(quiz.correctAnswer);
            const targetPhonetic = getTranslit(quiz.correctAnswer);

            isCorrect = (normalizedTValue === targetScript) || (targetPhonetic && normalizedTValue === targetPhonetic);
            break;
        case 'fill-blank':
        case 'fill_blank':
        case 'writing':
            const fillInput = document.getElementById('fillBlankInput');
            const fillValue = (userAnswer || fillInput?.value || '').trim().toLowerCase();
            isCorrect = fillValue === (quiz.correctAnswer || '').trim().toLowerCase();
            break;
        case 'listening':
            isCorrect = (userAnswer || '').trim().toLowerCase() === (quiz.correctAnswer || '').trim().toLowerCase();
            break;
    }

    showFeedback(isCorrect, quiz);

    if (isCorrect) {
        correctAnswers++;
    } else {
        hearts--;
        updateHeartsDisplay();

        if (hearts === 0) {
            setTimeout(() => showOutOfHeartsScreen(), 1500);
            return;
        }
    }

    // Change button to Continue
    const checkBtn = document.getElementById('checkBtn');
    checkBtn.textContent = 'Continue';
    checkBtn.onclick = handleNextStep;
    checkBtn.disabled = false;
}

// Handle moving to the next question
function handleNextStep() {
    currentQuizIndex++;
    if (currentQuizIndex < quizzes.length) {
        loadQuiz();
    } else {
        completeQuiz();
    }
}

// Show feedback
function showFeedback(isCorrect, quiz) {
    const feedback = document.getElementById('feedbackArea');
    const selectedBtn = document.querySelector(`.option-btn[data-index="${window.lastSelectedIndex}"]`);

    if (selectedBtn) {
        selectedBtn.classList.add(isCorrect ? 'correct-bounce' : 'wrong-shake');
    }

    // Appreciation messages
    const appreciations = ['Amazing!', 'Great job!', 'Spectacular!', 'Brilliant!', 'Keep it up!', 'Awesome!', 'Perfect!'];
    const randomAppreciation = appreciations[Math.floor(Math.random() * appreciations.length)];

    feedback.className = 'card mt-2 pop-in';
    feedback.style.background = isCorrect ? 'var(--green)' : 'var(--red)';
    feedback.style.padding = '24px';
    feedback.style.color = 'white';

    feedback.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 20px;">
            <div style="font-size: 40px;">${isCorrect ? '✅' : '❌'}</div>
            <div style="flex: 1;">
                <h3 style="font-size: 24px; margin-bottom: 8px; color: white;">
                    ${isCorrect ? randomAppreciation : (currentLanguage === 'Tamil' ? 'தப்பு! (Wrong)' : 'Good try!')}
                </h3>
                ${!isCorrect ? `
                    <div style="background: rgba(0,0,0,0.1); padding: 12px; border-radius: 8px;">
                        <p style="font-size: 14px; opacity: 0.9; margin-bottom: 4px;">Correct answer:</p>
                        <p style="font-size: 18px; font-weight: bold;">${quiz.correctAnswer}</p>
                    </div>
                ` : ''}
                ${quiz.explanation ? `<p style="margin-top: 12px; font-size: 14px; opacity: 0.9;">${quiz.explanation}</p>` : ''}
            </div>
        </div>
    `;

    if (isCorrect) {
        triggerConfetti();
        playSuccessSound();
    } else {
        playFailSound();
    }
}

// Complete quiz
async function completeQuiz() {
    const accuracy = Math.round((correctAnswers / quizzes.length) * 100);
    let xpEarned = 0;

    if (accuracy >= 90) xpEarned = 50;
    else if (accuracy >= 75) xpEarned = 35;
    else if (accuracy >= 50) xpEarned = 20;
    else xpEarned = 10;

    // Update user XP
    try {
        await apiCall('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify({
                xp: (user.xp || 0) + xpEarned,
                hearts: hearts
            })
        });
    } catch (error) {
        console.error('Failed to update XP:', error);
    }

    // Show results
    document.getElementById('quizInterface').classList.add('hidden');
    document.getElementById('resultsScreen').classList.remove('hidden');

    document.getElementById('finalScore').textContent = `${correctAnswers}/${quizzes.length}`;
    document.getElementById('accuracyPercent').textContent = accuracy + '%';
    document.getElementById('xpEarned').textContent = `+${xpEarned} XP`;

    triggerConfetti();
}

// Update hearts display
function updateHeartsDisplay() {
    const heartsHTML = '❤️'.repeat(hearts) + '🖤'.repeat(5 - hearts);
    document.getElementById('heartsDisplay').innerHTML = heartsHTML;
}

// Show out of hearts screen
function showOutOfHeartsScreen() {
    const container = document.getElementById('quizContent');
    container.innerHTML = `
        <div class="text-center" style="padding: 48px;">
            <div style="font-size: 100px; margin-bottom: 24px;">💔</div>
            <h1 style="font-size: 36px; margin-bottom: 16px;">Out of Hearts!</h1>
            <p class="text-muted" style="font-size: 18px; margin-bottom: 32px;">
                Come back later or practice other skills
            </p>
            <button class="btn btn-primary" onclick="window.location.href='home.html'">
                Back to Home
            </button>
        </div>
    `;

    document.getElementById('checkBtn').style.display = 'none';
    document.getElementById('skipBtn').style.display = 'none';
}

// Skip question
function skipQuestion() {
    currentQuizIndex++;
    if (currentQuizIndex < quizzes.length) {
        loadQuiz();
    } else {
        completeQuiz();
    }
}

// Exit quiz
function exitQuiz() {
    if (confirm('Are you sure you want to exit? Your progress will be lost.')) {
        window.location.href = 'home.html';
    }
}

// Reset quiz
function resetQuiz() {
    document.getElementById('resultsScreen').classList.add('hidden');
    document.getElementById('quizSelection').classList.remove('hidden');
    currentQuizIndex = 0;
    correctAnswers = 0;
}

// Play audio
function playAudio(text) {
    const langCode = getLanguageCode(currentLanguage);
    speak(text, langCode);
}

// Start recording
function startRecording() {
    const btn = document.getElementById('recordBtn');
    const status = document.getElementById('recordingStatus');
    btn.textContent = '🔴';
    btn.classList.add('pulse');
    btn.disabled = true;
    status.textContent = 'Listening...';

    const langCode = getLanguageCode(currentLanguage);

    const resetBtn = () => {
        btn.textContent = '🎤';
        btn.classList.remove('pulse');
        btn.disabled = false;
        if (!userAnswer) status.textContent = 'Click to record';
    };

    startSpeechRecognition((transcript) => {
        userAnswer = transcript;
        btn.textContent = '✅';
        status.textContent = 'Recorded: ' + transcript;
        showToast('Recorded: ' + transcript, 'success');
        document.getElementById('checkBtn').disabled = false;

        setTimeout(resetBtn, 1500);
    }, langCode, resetBtn);
}

// Removed local getLanguageCode to use the global one in app.js

// Generate sample quizzes
function generateSampleQuizzes(type) {

    // Language-specific multiple choice quiz data
    const multipleChoiceByLanguage = {
        'Tamil': [
            { question: '"வணக்கம்" என்பதன் பொருள் என்ன?', icon: '🙏', options: ['Hello / Greetings', 'Goodbye', 'Thank you', 'Sorry'], correctAnswer: 'Hello / Greetings', explanation: '"வணக்கம்" means Hello/Greetings in Tamil' },
            { question: '"நன்றி" என்பதன் பொருள் என்ன?', icon: '😊', options: ['Thank you', 'Sorry', 'Please', 'Welcome'], correctAnswer: 'Thank you', explanation: '"நன்றி" means Thank you in Tamil' },
            { question: '"எப்படி இருக்கீங்க?" என்பதன் பொருள் என்ன?', icon: '💬', options: ['How are you?', 'What is your name?', 'Where are you from?', 'How old are you?'], correctAnswer: 'How are you?', explanation: '"எப்படி இருக்கீங்க?" means How are you? in Tamil' },
            { question: '"உங்கள் பெயர் என்ன?" என்பதன் பொருள் என்ன?', icon: '👤', options: ['What is your name?', 'Where do you live?', 'How old are you?', 'What do you do?'], correctAnswer: 'What is your name?', explanation: '"உங்கள் பெயர் என்ன?" means What is your name? in Tamil' },
            { question: '"சாப்பிட்டீர்களா?" என்பதன் பொருள் என்ன?', icon: '🍽️', options: ['Have you eaten?', 'Are you hungry?', 'Do you like food?', 'What did you eat?'], correctAnswer: 'Have you eaten?', explanation: '"சாப்பிட்டீர்களா?" means Have you eaten? in Tamil' },
            { question: '"நேற்று" என்பதன் பொருள் என்ன?', icon: '📅', options: ['Yesterday', 'Today', 'Tomorrow', 'Last week'], correctAnswer: 'Yesterday', explanation: '"நேற்று" means Yesterday in Tamil' },
            { question: '"நாளை" என்பதன் பொருள் என்ன?', icon: '🌅', options: ['Tomorrow', 'Yesterday', 'Today', 'Next week'], correctAnswer: 'Tomorrow', explanation: '"நாளை" means Tomorrow in Tamil' },
            { question: '"இன்று" என்பதன் பொருள் என்ன?', icon: '☀️', options: ['Today', 'Yesterday', 'Tomorrow', 'This week'], correctAnswer: 'Today', explanation: '"இன்று" means Today in Tamil' },
            { question: '"வீடு" என்பதன் பொருள் என்ன?', icon: '🏠', options: ['House / Home', 'School', 'Office', 'Hospital'], correctAnswer: 'House / Home', explanation: '"வீடு" means House/Home in Tamil' },
            { question: '"தண்ணீர்" என்பதன் பொருள் என்ன?', icon: '💧', options: ['Water', 'Milk', 'Juice', 'Coffee'], correctAnswer: 'Water', explanation: '"தண்ணீர்" means Water in Tamil' }
        ],
        'Hindi': [
            { question: '"नमस्ते" का अर्थ क्या है?', icon: '🙏', options: ['Hello / Greetings', 'Goodbye', 'Thank you', 'Sorry'], correctAnswer: 'Hello / Greetings', explanation: '"नमस्ते" means Hello/Greetings in Hindi' },
            { question: '"धन्यवाद" का अर्थ क्या है?', icon: '😊', options: ['Thank you', 'Sorry', 'Please', 'Welcome'], correctAnswer: 'Thank you', explanation: '"धन्यवाद" means Thank you in Hindi' },
            { question: '"आप कैसे हैं?" का अर्थ क्या है?', icon: '💬', options: ['How are you?', 'What is your name?', 'Where are you from?', 'How old are you?'], correctAnswer: 'How are you?', explanation: '"आप कैसे हैं?" means How are you? in Hindi' },
            { question: '"आपका नाम क्या है?" का अर्थ क्या है?', icon: '👤', options: ['What is your name?', 'Where do you live?', 'How old are you?', 'What do you do?'], correctAnswer: 'What is your name?', explanation: '"आपका नाम क्या है?" means What is your name? in Hindi' },
            { question: '"पानी" का अर्थ क्या है?', icon: '💧', options: ['Water', 'Milk', 'Juice', 'Coffee'], correctAnswer: 'Water', explanation: '"पानी" means Water in Hindi' },
            { question: '"घर" का अर्थ क्या है?', icon: '🏠', options: ['House / Home', 'School', 'Office', 'Market'], correctAnswer: 'House / Home', explanation: '"घर" means House/Home in Hindi' },
            { question: '"कल" (पिछला) का अर्थ क्या है?', icon: '📅', options: ['Yesterday', 'Today', 'Tomorrow', 'Last week'], correctAnswer: 'Yesterday', explanation: '"कल" means Yesterday (or Tomorrow - context dependent) in Hindi' },
            { question: '"आज" का अर्थ क्या है?', icon: '☀️', options: ['Today', 'Yesterday', 'Tomorrow', 'This week'], correctAnswer: 'Today', explanation: '"आज" means Today in Hindi' },
            { question: '"खाना" का अर्थ क्या है?', icon: '🍽️', options: ['Food', 'Water', 'Fruit', 'Vegetable'], correctAnswer: 'Food', explanation: '"खाना" means Food in Hindi' },
            { question: '"सुप्रभात" का अर्थ क्या है?', icon: '🌅', options: ['Good morning', 'Good night', 'Good afternoon', 'Good evening'], correctAnswer: 'Good morning', explanation: '"सुप्रभात" means Good morning in Hindi' }
        ],
        'Spanish': [
            { question: '¿Qué significa "Hola"?', icon: '👋', options: ['Hello', 'Goodbye', 'Thank you', 'Sorry'], correctAnswer: 'Hello', explanation: '"Hola" means Hello in Spanish' },
            { question: '¿Qué significa "Gracias"?', icon: '😊', options: ['Thank you', 'Sorry', 'Please', 'Welcome'], correctAnswer: 'Thank you', explanation: '"Gracias" means Thank you in Spanish' },
            { question: '¿Cómo estás? means...', icon: '💬', options: ['How are you?', 'What is your name?', 'Where are you from?', 'How old are you?'], correctAnswer: 'How are you?', explanation: '"¿Cómo estás?" means How are you? in Spanish' },
            { question: 'What is "Good morning" in Spanish?', icon: '🌅', options: ['Buenos días', 'Buenas noches', 'Buenas tardes', 'Hola'], correctAnswer: 'Buenos días', explanation: '"Buenos días" means Good morning in Spanish' },
            { question: 'What does "Adios" mean?', icon: '👋', options: ['Goodbye', 'Hello', 'Thank you', 'Please'], correctAnswer: 'Goodbye', explanation: '"Adiós" means Goodbye in Spanish' },
            { question: 'What is "Water" in Spanish?', icon: '💧', options: ['Agua', 'Leche', 'Jugo', 'Café'], correctAnswer: 'Agua', explanation: '"Agua" means Water in Spanish' },
            { question: 'What is "House" in Spanish?', icon: '🏠', options: ['Casa', 'Escuela', 'Oficina', 'Hospital'], correctAnswer: 'Casa', explanation: '"Casa" means House in Spanish' },
            { question: 'What does "Por favor" mean?', icon: '🙏', options: ['Please', 'Thank you', 'Sorry', 'Hello'], correctAnswer: 'Please', explanation: '"Por favor" means Please in Spanish' },
            { question: 'What is "Today" in Spanish?', icon: '☀️', options: ['Hoy', 'Ayer', 'Mañana', 'Ahora'], correctAnswer: 'Hoy', explanation: '"Hoy" means Today in Spanish' },
            { question: 'What is "Food" in Spanish?', icon: '🍽️', options: ['Comida', 'Bebida', 'Fruta', 'Pan'], correctAnswer: 'Comida', explanation: '"Comida" means Food in Spanish' }
        ],
        'French': [
            { question: 'What does "Bonjour" mean?', icon: '👋', options: ['Hello / Good day', 'Goodbye', 'Thank you', 'Sorry'], correctAnswer: 'Hello / Good day', explanation: '"Bonjour" means Hello/Good day in French' },
            { question: 'What does "Merci" mean?', icon: '😊', options: ['Thank you', 'Sorry', 'Please', 'Welcome'], correctAnswer: 'Thank you', explanation: '"Merci" means Thank you in French' },
            { question: 'What does "Comment allez-vous?" mean?', icon: '💬', options: ['How are you?', 'What is your name?', 'Where are you from?', 'How old are you?'], correctAnswer: 'How are you?', explanation: '"Comment allez-vous?" means How are you? in French' },
            { question: 'What is "Goodbye" in French?', icon: '👋', options: ['Au revoir', 'Bonjour', 'Bonsoir', 'Salut'], correctAnswer: 'Au revoir', explanation: '"Au revoir" means Goodbye in French' },
            { question: 'What does "S\'il vous plaît" mean?', icon: '🙏', options: ['Please', 'Thank you', 'Sorry', 'Hello'], correctAnswer: 'Please', explanation: '"S\'il vous plaît" means Please in French' },
            { question: 'What is "Water" in French?', icon: '💧', options: ['Eau', 'Lait', 'Jus', 'Café'], correctAnswer: 'Eau', explanation: '"Eau" means Water in French' },
            { question: 'What is "House" in French?', icon: '🏠', options: ['Maison', 'École', 'Bureau', 'Hôpital'], correctAnswer: 'Maison', explanation: '"Maison" means House in French' },
            { question: 'What does "Oui" mean?', icon: '✅', options: ['Yes', 'No', 'Maybe', 'I don\'t know'], correctAnswer: 'Yes', explanation: '"Oui" means Yes in French' },
            { question: 'What does "Non" mean?', icon: '❌', options: ['No', 'Yes', 'Maybe', 'Never'], correctAnswer: 'No', explanation: '"Non" means No in French' },
            { question: 'What is "Today" in French?', icon: '☀️', options: ["Aujourd'hui", 'Hier', 'Demain', 'Maintenant'], correctAnswer: "Aujourd'hui", explanation: '"Aujourd\'hui" means Today in French' }
        ],
        'German': [
            { question: 'What does "Hallo" mean?', icon: '👋', options: ['Hello', 'Goodbye', 'Thank you', 'Sorry'], correctAnswer: 'Hello', explanation: '"Hallo" means Hello in German' },
            { question: 'What does "Danke" mean?', icon: '😊', options: ['Thank you', 'Sorry', 'Please', 'Welcome'], correctAnswer: 'Thank you', explanation: '"Danke" means Thank you in German' },
            { question: 'What does "Wie geht es Ihnen?" mean?', icon: '💬', options: ['How are you?', 'What is your name?', 'Where are you from?', 'How old are you?'], correctAnswer: 'How are you?', explanation: '"Wie geht es Ihnen?" means How are you? in German' },
            { question: 'What is "Goodbye" in German?', icon: '👋', options: ['Auf Wiedersehen', 'Hallo', 'Guten Morgen', 'Hei'], correctAnswer: 'Auf Wiedersehen', explanation: '"Auf Wiedersehen" means Goodbye in German' },
            { question: 'What does "Bitte" mean?', icon: '🙏', options: ['Please / You\'re welcome', 'Thank you', 'Sorry', 'Hello'], correctAnswer: 'Please / You\'re welcome', explanation: '"Bitte" means Please/You\'re welcome in German' },
            { question: 'What is "Water" in German?', icon: '💧', options: ['Wasser', 'Milch', 'Saft', 'Kaffee'], correctAnswer: 'Wasser', explanation: '"Wasser" means Water in German' },
            { question: 'What is "House" in German?', icon: '🏠', options: ['Haus', 'Schule', 'Büro', 'Krankenhaus'], correctAnswer: 'Haus', explanation: '"Haus" means House in German' },
            { question: 'What does "Ja" mean?', icon: '✅', options: ['Yes', 'No', 'Maybe', 'Hello'], correctAnswer: 'Yes', explanation: '"Ja" means Yes in German' },
            { question: 'What is "Good morning" in German?', icon: '🌅', options: ['Guten Morgen', 'Guten Abend', 'Gute Nacht', 'Guten Tag'], correctAnswer: 'Guten Morgen', explanation: '"Guten Morgen" means Good morning in German' },
            { question: 'What is "Today" in German?', icon: '☀️', options: ['Heute', 'Gestern', 'Morgen', 'Jetzt'], correctAnswer: 'Heute', explanation: '"Heute" means Today in German' }
        ],
        'Japanese': [
            { question: '"こんにちは" means?', icon: '👋', options: ['Hello / Good afternoon', 'Goodbye', 'Thank you', 'Sorry'], correctAnswer: 'Hello / Good afternoon', explanation: '"こんにちは" (Konnichiwa) means Hello in Japanese' },
            { question: '"ありがとう" means?', icon: '😊', options: ['Thank you', 'Sorry', 'Please', 'Welcome'], correctAnswer: 'Thank you', explanation: '"ありがとう" (Arigatou) means Thank you in Japanese' },
            { question: '"おはようございます" means?', icon: '🌅', options: ['Good morning', 'Good night', 'Good afternoon', 'Goodbye'], correctAnswer: 'Good morning', explanation: '"おはようございます" (Ohayou gozaimasu) means Good morning in Japanese' },
            { question: '"さようなら" means?', icon: '👋', options: ['Goodbye', 'Hello', 'Thank you', 'Sorry'], correctAnswer: 'Goodbye', explanation: '"さようなら" (Sayounara) means Goodbye in Japanese' },
            { question: '"すみません" means?', icon: '🙏', options: ['Excuse me / Sorry', 'Thank you', 'Please', 'Hello'], correctAnswer: 'Excuse me / Sorry', explanation: '"すみません" (Sumimasen) means Excuse me/Sorry in Japanese' },
            { question: '"みず" (水) means?', icon: '💧', options: ['Water', 'Milk', 'Juice', 'Tea'], correctAnswer: 'Water', explanation: '"みず" (Mizu) means Water in Japanese' },
            { question: '"いえ/うち" means?', icon: '🏠', options: ['House / Home', 'School', 'Office', 'Hospital'], correctAnswer: 'House / Home', explanation: '"いえ/うち" (Ie/Uchi) means House/Home in Japanese' },
            { question: '"はい" means?', icon: '✅', options: ['Yes', 'No', 'Maybe', 'I don\'t know'], correctAnswer: 'Yes', explanation: '"はい" (Hai) means Yes in Japanese' },
            { question: '"いいえ" means?', icon: '❌', options: ['No', 'Yes', 'Maybe', 'Never'], correctAnswer: 'No', explanation: '"いいえ" (Iie) means No in Japanese' },
            { question: '"きょう" (今日) means?', icon: '☀️', options: ['Today', 'Yesterday', 'Tomorrow', 'Now'], correctAnswer: 'Today', explanation: '"きょう" (Kyou) means Today in Japanese' }
        ],
        'Korean': [
            { question: '"안녕하세요" means?', icon: '👋', options: ['Hello / Greetings', 'Goodbye', 'Thank you', 'Sorry'], correctAnswer: 'Hello / Greetings', explanation: '"안녕하세요" (Annyeonghaseyo) means Hello in Korean' },
            { question: '"감사합니다" means?', icon: '😊', options: ['Thank you', 'Sorry', 'Please', 'Welcome'], correctAnswer: 'Thank you', explanation: '"감사합니다" (Gamsahamnida) means Thank you in Korean' },
            { question: '"잘 지내세요?" means?', icon: '💬', options: ['How are you?', 'What is your name?', 'Where are you from?', 'How old are you?'], correctAnswer: 'How are you?', explanation: '"잘 지내세요?" means How are you? in Korean' },
            { question: '"물" means?', icon: '💧', options: ['Water', 'Milk', 'Juice', 'Tea'], correctAnswer: 'Water', explanation: '"물" (Mul) means Water in Korean' },
            { question: '"집" means?', icon: '🏠', options: ['House / Home', 'School', 'Office', 'Hospital'], correctAnswer: 'House / Home', explanation: '"집" (Jip) means House/Home in Korean' },
            { question: '"네" means?', icon: '✅', options: ['Yes', 'No', 'Maybe', 'Hello'], correctAnswer: 'Yes', explanation: '"네" (Ne) means Yes in Korean' },
            { question: '"아니요" means?', icon: '❌', options: ['No', 'Yes', 'Maybe', 'Never'], correctAnswer: 'No', explanation: '"아니요" (Aniyo) means No in Korean' },
            { question: '"오늘" means?', icon: '☀️', options: ['Today', 'Yesterday', 'Tomorrow', 'Now'], correctAnswer: 'Today', explanation: '"오늘" (Oneul) means Today in Korean' },
            { question: '"안녕히 가세요" means?', icon: '👋', options: ['Goodbye (to person leaving)', 'Hello', 'Good morning', 'Good night'], correctAnswer: 'Goodbye (to person leaving)', explanation: '"안녕히 가세요" means Goodbye in Korean' },
            { question: '"밥" means?', icon: '🍚', options: ['Rice / Food', 'Water', 'Fruit', 'Bread'], correctAnswer: 'Rice / Food', explanation: '"밥" (Bap) means Rice/Food in Korean' }
        ],
        'Chinese': [
            { question: '"你好" means?', icon: '👋', options: ['Hello', 'Goodbye', 'Thank you', 'Sorry'], correctAnswer: 'Hello', explanation: '"你好" (Nǐ hǎo) means Hello in Chinese' },
            { question: '"谢谢" means?', icon: '😊', options: ['Thank you', 'Sorry', 'Please', 'Welcome'], correctAnswer: 'Thank you', explanation: '"谢谢" (Xièxiè) means Thank you in Chinese' },
            { question: '"你好吗?" means?', icon: '💬', options: ['How are you?', 'What is your name?', 'Where are you from?', 'How old are you?'], correctAnswer: 'How are you?', explanation: '"你好吗?" means How are you? in Chinese' },
            { question: '"再见" means?', icon: '👋', options: ['Goodbye', 'Hello', 'Thank you', 'Sorry'], correctAnswer: 'Goodbye', explanation: '"再见" (Zàijiàn) means Goodbye in Chinese' },
            { question: '"水" means?', icon: '💧', options: ['Water', 'Milk', 'Juice', 'Tea'], correctAnswer: 'Water', explanation: '"水" (Shuǐ) means Water in Chinese' },
            { question: '"家" means?', icon: '🏠', options: ['House / Home', 'School', 'Office', 'Hospital'], correctAnswer: 'House / Home', explanation: '"家" (Jiā) means House/Home in Chinese' },
            { question: '"是" means?', icon: '✅', options: ['Yes / Is', 'No', 'Maybe', 'Hello'], correctAnswer: 'Yes / Is', explanation: '"是" (Shì) means Yes/Is in Chinese' },
            { question: '"今天" means?', icon: '☀️', options: ['Today', 'Yesterday', 'Tomorrow', 'Now'], correctAnswer: 'Today', explanation: '"今天" (Jīntiān) means Today in Chinese' },
            { question: '"早上好" means?', icon: '🌅', options: ['Good morning', 'Good night', 'Good afternoon', 'Goodbye'], correctAnswer: 'Good morning', explanation: '"早上好" (Zǎoshang hǎo) means Good morning in Chinese' },
            { question: '"吃饭" means?', icon: '🍽️', options: ['Eat food / Have a meal', 'Drink water', 'Sleep', 'Go home'], correctAnswer: 'Eat food / Have a meal', explanation: '"吃饭" (Chīfàn) means to eat/have a meal in Chinese' }
        ],
        'Arabic': [
            { question: '"مرحبا" means?', icon: '👋', options: ['Hello', 'Goodbye', 'Thank you', 'Sorry'], correctAnswer: 'Hello', explanation: '"مرحبا" (Marhaba) means Hello in Arabic' },
            { question: '"شكراً" means?', icon: '😊', options: ['Thank you', 'Sorry', 'Please', 'Welcome'], correctAnswer: 'Thank you', explanation: '"شكراً" (Shukran) means Thank you in Arabic' },
            { question: '"كيف حالك؟" means?', icon: '💬', options: ['How are you?', 'What is your name?', 'Where are you from?', 'How old are you?'], correctAnswer: 'How are you?', explanation: '"كيف حالك?" means How are you? in Arabic' },
            { question: '"ماء" means?', icon: '💧', options: ['Water', 'Milk', 'Juice', 'Tea'], correctAnswer: 'Water', explanation: '"ماء" (Maa) means Water in Arabic' },
            { question: '"بيت" means?', icon: '🏠', options: ['House / Home', 'School', 'Office', 'Hospital'], correctAnswer: 'House / Home', explanation: '"بيت" (Bayt) means House/Home in Arabic' },
            { question: '"نعم" means?', icon: '✅', options: ['Yes', 'No', 'Maybe', 'Hello'], correctAnswer: 'Yes', explanation: '"نعم" (Naʿam) means Yes in Arabic' },
            { question: '"لا" means?', icon: '❌', options: ['No', 'Yes', 'Maybe', 'Never'], correctAnswer: 'No', explanation: '"لا" (Lā) means No in Arabic' },
            { question: '"السلام عليكم" means?', icon: '🙏', options: ['Peace be upon you (Hello)', 'Goodbye', 'Thank you', 'Sorry'], correctAnswer: 'Peace be upon you (Hello)', explanation: '"السلام عليكم" is a common greeting meaning Peace be upon you' },
            { question: '"صباح الخير" means?', icon: '🌅', options: ['Good morning', 'Good night', 'Good afternoon', 'Goodbye'], correctAnswer: 'Good morning', explanation: '"صباح الخير" (Sabah al-khair) means Good morning in Arabic' },
            { question: '"طعام" means?', icon: '🍽️', options: ['Food', 'Water', 'Fruit', 'Bread'], correctAnswer: 'Food', explanation: '"طعام" (Taam) means Food in Arabic' }
        ],
        'Italian': [
            { question: 'What does "Ciao" mean?', icon: '👋', options: ['Hello / Goodbye', 'Thank you', 'Sorry', 'Please'], correctAnswer: 'Hello / Goodbye', explanation: '"Ciao" means both Hello and Goodbye in Italian' },
            { question: 'What does "Grazie" mean?', icon: '😊', options: ['Thank you', 'Sorry', 'Please', 'Welcome'], correctAnswer: 'Thank you', explanation: '"Grazie" means Thank you in Italian' },
            { question: 'What does "Come stai?" mean?', icon: '💬', options: ['How are you?', 'What is your name?', 'Where are you from?', 'How old are you?'], correctAnswer: 'How are you?', explanation: '"Come stai?" means How are you? in Italian' },
            { question: 'What is "Water" in Italian?', icon: '💧', options: ['Acqua', 'Latte', 'Succo', 'Caffè'], correctAnswer: 'Acqua', explanation: '"Acqua" means Water in Italian' },
            { question: 'What is "House" in Italian?', icon: '🏠', options: ['Casa', 'Scuola', 'Ufficio', 'Ospedale'], correctAnswer: 'Casa', explanation: '"Casa" means House in Italian' },
            { question: 'What does "Per favore" mean?', icon: '🙏', options: ['Please', 'Thank you', 'Sorry', 'Hello'], correctAnswer: 'Please', explanation: '"Per favore" means Please in Italian' },
            { question: 'What does "Sì" mean?', icon: '✅', options: ['Yes', 'No', 'Maybe', 'Hello'], correctAnswer: 'Yes', explanation: '"Sì" means Yes in Italian' },
            { question: 'What is "Good morning" in Italian?', icon: '🌅', options: ['Buongiorno', 'Buonanotte', 'Buonasera', 'Arrivederci'], correctAnswer: 'Buongiorno', explanation: '"Buongiorno" means Good morning in Italian' },
            { question: 'What is "Today" in Italian?', icon: '☀️', options: ['Oggi', 'Ieri', 'Domani', 'Adesso'], correctAnswer: 'Oggi', explanation: '"Oggi" means Today in Italian' },
            { question: 'What is "Food" in Italian?', icon: '🍽️', options: ['Cibo', 'Acqua', 'Frutta', 'Pane'], correctAnswer: 'Cibo', explanation: '"Cibo" means Food in Italian' }
        ],
        'Russian': [
            { question: '"Привет" என்பதன் பொருள் என்ன? / What does it mean?', icon: '👋', options: ['Привет (Privet) | Hello', 'Пока (Poka) | Goodbye', 'Спасибо (Spasibo) | Thank you', 'Извините (Izvinite) | Sorry'], correctAnswer: 'Привет (Privet) | Hello', explanation: '"Привет" means Hello in Russian' },
            { question: 'How do you say "Thank You" in Russian?', icon: '😊', options: ['Спасибо (Spasibo) | Thank you', 'Пожалуйста (Pozhaluysta) | Please', 'Да (Da) | Yes', 'Нет (Net) | No'], correctAnswer: 'Спасибо (Spasibo) | Thank you', explanation: '"Спасибо" (Spasibo) means Thank you in Russian' },
            { question: 'What does "Да" mean?', icon: '✅', options: ['Да (Da) | Yes', 'Нет (Net) | No', 'Может быть (Mozhet byt) | Maybe', 'Никогда (Nikogda) | Never'], correctAnswer: 'Да (Da) | Yes', explanation: '"Да" (Da) means Yes in Russian' },
            { question: 'How do you say "Water" in Russian?', icon: '💧', options: ['Вода (Voda) | Water', 'Молоко (Moloko) | Milk', 'Сок (Sok) | Juice', 'Кофе (Kofe) | Coffee'], correctAnswer: 'Вода (Voda) | Water', explanation: '"Вода" (Voda) means Water in Russian' },
            { question: 'What does "Дом" mean?', icon: '🏠', options: ['Дом (Dom) | House', 'Школа (Shkola) | School', 'Работа (Rabota) | Work', 'Магазин (Magazin) | Shop'], correctAnswer: 'Дом (Dom) | House', explanation: '"Дом" (Dom) means House in Russian' },
            { question: 'What is "Good morning" in Russian?', icon: '🌅', options: ['Доброе утро (Dobroye utro) | Good morning', 'Добрый день (Dobryy den) | Good day', 'Добрый вечер (Dobryy vecher) | Good evening', 'Спокойной ночи (Spokoynoy nochi) | Good night'], correctAnswer: 'Доброе утро (Dobroye utro) | Good morning', explanation: '"Доброе утро" means Good morning in Russian' },
            { question: 'What does "Хлеб" mean?', icon: '🍞', options: ['Хлеб (Khleb) | Bread', 'Масло (Maslo) | Butter', 'Сыр (Syr) | Cheese', 'Мясо (Myaso) | Meat'], correctAnswer: 'Хлеб (Khleb) | Bread', explanation: '"Хлеб" (Khleb) means Bread in Russian' },
            { question: 'How do you say "I love you"?', icon: '❤️', options: ['Я тебя люблю (Ya tebya lyublyu) | I love you', 'Как дела? (Kak dela?) | How are you?', 'Меня зовут... (Menya zovut...) | My name is...', 'Я не понимаю (Ya ne ponimayu) | I don\'t understand'], correctAnswer: 'Я тебя люблю (Ya tebya lyublyu) | I love you', explanation: '"Я тебя люблю" means I love you in Russian' },
            { question: '"Клубника" என்பதன் பொருள் என்ன? / What is this?', icon: '🍓', options: ['Клубника (Klubnika) | Strawberry', 'Яблоко (Yabloko) | Apple', 'Банан (Banan) | Banana', 'Виноград (Vinograd) | Grapes'], correctAnswer: 'Клубника (Klubnika) | Strawberry', explanation: '"Клубника" (Klubnika) means Strawberry in Russian' }
        ]
    };

    // Default/English fallback for languages not specifically listed
    const defaultMultipleChoice = [
        { question: 'What does "Hello" mean?', icon: '👋', options: ['A greeting', 'A farewell', 'An apology', 'A question'], correctAnswer: 'A greeting', explanation: '"Hello" is used to greet someone' },
        { question: 'Which word means "Thank you"?', icon: '😊', options: ['Gratitude', 'Sorry', 'Please', 'Welcome'], correctAnswer: 'Gratitude', explanation: 'Thank you expresses gratitude' },
        { question: 'What is "Good morning" used for?', icon: '🌅', options: ['Morning greeting', 'Evening greeting', 'Night greeting', 'Afternoon greeting'], correctAnswer: 'Morning greeting', explanation: '"Good morning" is said in the morning' },
        { question: 'Which word means "Water"?', icon: '💧', options: ['H2O / Water', 'Milk', 'Juice', 'Tea'], correctAnswer: 'H2O / Water', explanation: 'Water is essential for life' },
        { question: 'What does "Yes" mean?', icon: '✅', options: ['Affirmation', 'Negation', 'Question', 'Uncertainty'], correctAnswer: 'Affirmation', explanation: '"Yes" affirms a statement' }
    ];

    // Get quizzes for current language or use default
    const langQuizzes = multipleChoiceByLanguage[currentLanguage] || defaultMultipleChoice;

    const samples = {
        'multiple-choice': langQuizzes,
        'fill-blank': [
            { question: 'Complete the sentence: ___ are you?', correctAnswer: 'How', hint: 'A question word asking about state/manner' }
        ],
        'translation': (() => {
            const translationMap = {
                'Tamil': { sentence: 'Hello, how are you?', correctAnswer: 'வணக்கம், நீங்கள் எப்படி இருக்கீங்க?' },
                'Hindi': { sentence: 'Hello, how are you?', correctAnswer: 'नमस्ते, आप कैसे हैं?' },
                'Spanish': { sentence: 'Hello, how are you?', correctAnswer: 'Hola, ¿cómo estás?' },
                'French': { sentence: 'Hello, how are you?', correctAnswer: 'Bonjour, comment allez-vous?' },
                'German': { sentence: 'Hello, how are you?', correctAnswer: 'Hallo, wie geht es Ihnen?' },
                'Japanese': { sentence: 'Hello, how are you?', correctAnswer: 'こんにちは、お元気ですか?' },
                'Chinese': { sentence: 'Hello, how are you?', correctAnswer: '你好，你好吗?' },
                'Korean': { sentence: 'Hello, how are you?', correctAnswer: '안녕하세요, 어떻게 지내세요?' },
                'Arabic': { sentence: 'Hello, how are you?', correctAnswer: 'مرحبا، كيف حالك?' },
                'Italian': { sentence: 'Hello, how are you?', correctAnswer: 'Ciao, come stai?' },
                'Portuguese': { sentence: 'Hello, how are you?', correctAnswer: 'Olá, como você está?' },
                'Russian': { sentence: 'Hello, how are you?', correctAnswer: 'Привет, как дела?' },
                'Dutch': { sentence: 'Hello, how are you?', correctAnswer: 'Hallo, hoe gaat het?' },
                'Swedish': { sentence: 'Hello, how are you?', correctAnswer: 'Hej, hur mår du?' },
                'Turkish': { sentence: 'Hello, how are you?', correctAnswer: 'Merhaba, nasılsın?' },
                'Polish': { sentence: 'Hello, how are you?', correctAnswer: 'Cześć, jak się masz?' },
                'Greek': { sentence: 'Hello, how are you?', correctAnswer: 'Γεια σου, πώς είσαι?' },
                'English': { sentence: 'வணக்கம், நீங்கள் எப்படி இருக்கீங்க?', correctAnswer: 'Hello, how are you?' },
            };
            const t = translationMap[currentLanguage] || { sentence: 'Hello, how are you?', correctAnswer: 'Hello, how are you?' };
            return [t];
        })(),
        'listening': (() => {
            const listeningMap = {
                'Tamil': [
                    { audioText: 'வணக்கம்', correctAnswer: 'Hello / Greetings' },
                    { audioText: 'தண்ணீர்', correctAnswer: 'Water' },
                    { audioText: 'ஆப்பிள்', correctAnswer: 'Apple' },
                    { audioText: 'தேநீர்', correctAnswer: 'Tea' },
                    { audioText: 'காபி', correctAnswer: 'Coffee' }
                ],
                'Hindi': [
                    { audioText: 'नमस्ते', correctAnswer: 'Hello / Greetings' },
                    { audioText: 'पानी', correctAnswer: 'Water' },
                    { audioText: 'सेब', correctAnswer: 'Apple' },
                    { audioText: 'चाय', correctAnswer: 'Tea' },
                    { audioText: 'कॉफ़ी', correctAnswer: 'Coffee' }
                ],
                'Spanish': [
                    { audioText: 'Hola', correctAnswer: 'Hello' },
                    { audioText: 'Agua', correctAnswer: 'Water' },
                    { audioText: 'Manzana', correctAnswer: 'Apple' },
                    { audioText: 'Té', correctAnswer: 'Tea' },
                    { audioText: 'Café', correctAnswer: 'Coffee' }
                ],
                'French': [
                    { audioText: 'Bonjour', correctAnswer: 'Hello' },
                    { audioText: 'Eau', correctAnswer: 'Water' },
                    { audioText: 'Pomme', correctAnswer: 'Apple' },
                    { audioText: 'Thé', correctAnswer: 'Tea' },
                    { audioText: 'Café', correctAnswer: 'Coffee' }
                ],
                'German': [
                    { audioText: 'Hallo', correctAnswer: 'Hello' },
                    { audioText: 'Wasser', correctAnswer: 'Water' },
                    { audioText: 'Apfel', correctAnswer: 'Apple' },
                    { audioText: 'Tee', correctAnswer: 'Tea' },
                    { audioText: 'Kaffee', correctAnswer: 'Coffee' }
                ],
                'Japanese': [
                    { audioText: 'こんにちは', correctAnswer: 'Hello' },
                    { audioText: 'みず', correctAnswer: 'Water' },
                    { audioText: 'りんご', correctAnswer: 'Apple' },
                    { audioText: 'おちゃ', correctAnswer: 'Tea' },
                    { audioText: 'コーヒー', correctAnswer: 'Coffee' }
                ],
                'Chinese': [
                    { audioText: '你好', correctAnswer: 'Hello' },
                    { audioText: '水', correctAnswer: 'Water' },
                    { audioText: '苹果', correctAnswer: 'Apple' },
                    { audioText: '茶', correctAnswer: 'Tea' },
                    { audioText: '咖啡', correctAnswer: 'Coffee' }
                ],
                'Korean': [
                    { audioText: '안녕하세요', correctAnswer: 'Hello' },
                    { audioText: '물', correctAnswer: 'Water' },
                    { audioText: '사과', correctAnswer: 'Apple' },
                    { audioText: '차', correctAnswer: 'Tea' },
                    { audioText: '커피', correctAnswer: 'Coffee' }
                ],
                'Arabic': [
                    { audioText: 'مرحبا', correctAnswer: 'Hello' },
                    { audioText: 'ماء', correctAnswer: 'Water' },
                    { audioText: 'تفاحة', correctAnswer: 'Apple' },
                    { audioText: 'شاي', correctAnswer: 'Tea' },
                    { audioText: 'قهوة', correctAnswer: 'Coffee' }
                ],
                'Russian': [
                    { audioText: 'Привет', correctAnswer: 'Hello' },
                    { audioText: 'Вода', correctAnswer: 'Water' },
                    { audioText: 'Яблоко', correctAnswer: 'Apple' },
                    { audioText: 'Чай', correctAnswer: 'Tea' },
                    { audioText: 'Кофе', correctAnswer: 'Coffee' }
                ],
                'Italian': [
                    { audioText: 'Ciao', correctAnswer: 'Hello' },
                    { audioText: 'Acqua', correctAnswer: 'Water' },
                    { audioText: 'Mela', correctAnswer: 'Apple' },
                    { audioText: 'Tè', correctAnswer: 'Tea' },
                    { audioText: 'Caffè', correctAnswer: 'Coffee' }
                ]
            };
            const list = listeningMap[currentLanguage] || [{ audioText: 'Hello', correctAnswer: 'Hello' }];
            // Generate better options for each sample
            return list.map(item => {
                const distractors = ['Water', 'Apple', 'Tea', 'Coffee', 'Milk', 'Bread', 'Hello', 'Goodbye', 'Thank you']
                    .filter(d => d !== item.correctAnswer)
                    .sort(() => Math.random() - 0.5)
                    .slice(0, 3);
                return {
                    ...item,
                    options: [item.correctAnswer, ...distractors].sort(() => Math.random() - 0.5)
                };
            }).sort(() => Math.random() - 0.5);
        })(),
        // speaking section removed
        'matching': [
            {
                leftColumn: ['Hello', 'Goodbye', 'Thank you'],
                rightColumn: currentLanguage === 'Tamil' ? ['வணக்கம்', 'போய் வருகிறேன்', 'நன்றி'] :
                    currentLanguage === 'Hindi' ? ['नमस्ते', 'अलविदा', 'धन्यवाद'] :
                        currentLanguage === 'Spanish' ? ['Hola', 'Adiós', 'Gracias'] :
                            currentLanguage === 'French' ? ['Bonjour', 'Au revoir', 'Merci'] :
                                currentLanguage === 'German' ? ['Hallo', 'Auf Wiedersehen', 'Danke'] :
                                    currentLanguage === 'Japanese' ? ['こんにちは', 'さようなら', 'ありがとう'] :
                                        ['Hello', 'Goodbye', 'Thanks'],
                correctPairs: {
                    'Hello': currentLanguage === 'Tamil' ? 'வணக்கம்' : currentLanguage === 'Hindi' ? 'नमस्ते' : currentLanguage === 'Spanish' ? 'Hola' : currentLanguage === 'French' ? 'Bonjour' : currentLanguage === 'German' ? 'Hallo' : currentLanguage === 'Japanese' ? 'こんにちは' : 'Hello',
                    'Goodbye': currentLanguage === 'Tamil' ? 'போய் வருகிறேன்' : currentLanguage === 'Hindi' ? 'अलविदा' : currentLanguage === 'Spanish' ? 'Adiós' : currentLanguage === 'French' ? 'Au revoir' : currentLanguage === 'German' ? 'Auf Wiedersehen' : currentLanguage === 'Japanese' ? 'さようなら' : 'Goodbye',
                    'Thank you': currentLanguage === 'Tamil' ? 'நன்றி' : currentLanguage === 'Hindi' ? 'धन्यवाद' : currentLanguage === 'Spanish' ? 'Gracias' : currentLanguage === 'French' ? 'Merci' : currentLanguage === 'German' ? 'Danke' : currentLanguage === 'Japanese' ? 'ありがとう' : 'Thanks'
                }
            }
        ]
    };

    samples['writing'] = samples['fill-blank'] || samples['multiple-choice'];
    return samples[type] || samples['multiple-choice'];
}
