// Lesson/Quiz Page Logic
requireAuth();

let currentLesson = null;
let quizzes = [];
let currentQuizIndex = 0;
let hearts = 5;
let correctAnswers = 0;
let userAnswer = null;

// Load lesson data
function loadLesson() {
    const lessonData = localStorage.getItem('currentLesson');
    if (!lessonData) {
        showToast('No lesson selected', 'error');
        setTimeout(() => window.location.href = 'courses.html', 1000);
        return;
    }

    currentLesson = JSON.parse(lessonData);
    // Filter out speaking/listening/fill_blank tasks as requested by user
    quizzes = (currentLesson.quizzes || []).filter(q =>
        q.type !== 'speaking' &&
        q.type !== 'listening' &&
        q.type !== 'fill_blank'
    );

    // Update UI
    document.getElementById('lessonTitle').textContent = currentLesson.title;
    document.getElementById('lessonDescription').textContent = currentLesson.description;
    document.getElementById('totalQuestions').textContent = quizzes.length;

    // Load user hearts
    const user = getUser();
    hearts = user.hearts || 5;
    updateHeartsDisplay();

    // Start first quiz
    if (quizzes.length > 0) {
        loadQuiz();
    } else {
        showToast('No quizzes in this lesson', 'error');
    }
}

// Update hearts display
function updateHeartsDisplay() {
    const heartsHTML = '❤️'.repeat(hearts) + '🖤'.repeat(5 - hearts);
    document.getElementById('heartsDisplay').innerHTML = heartsHTML;

    if (hearts === 0) {
        // Out of hearts - show failure screen
        showOutOfHeartsScreen();
    }
}

// Load current quiz
function loadQuiz() {
    const quiz = quizzes[currentQuizIndex];
    const container = document.getElementById('quizContainer');

    // Update progress
    document.getElementById('currentQuestion').textContent = currentQuizIndex + 1;
    const progress = (currentQuizIndex / quizzes.length) * 100;
    document.getElementById('progressBar').style.width = progress + '%';

    // Reset UI
    document.getElementById('checkBtn').disabled = true;
    document.getElementById('checkBtn').style.display = 'block';
    document.getElementById('continueBtn').style.display = 'none';
    document.getElementById('feedbackContainer').className = 'hidden';
    userAnswer = null;

    // Render quiz based on type
    switch (quiz.type) {
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
        case 'speaking':
            renderSpeaking(quiz);
            break;
        case 'matching':
            renderMatching(quiz);
            break;
        case 'reorder':
            renderReorder(quiz);
            break;
        default:
            renderMultipleChoice(quiz);
    }
}

// Render multiple choice quiz
function renderMultipleChoice(quiz) {
    const container = document.getElementById('quizContainer');
    container.innerHTML = `
        <div class="text-center mb-3">
            <div style="font-size: 48px; margin-bottom: 16px;">${quiz.icon || '❓'}</div>
            <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:24px;">
                <h2 style="margin:0;">${quiz.question}</h2>
            </div>
            <p class="text-muted" style="font-size:13px;margin-bottom:8px;">🔊 Click an option to hear its pronunciation</p>
        </div>
        <div class="grid-2" id="optionsContainer">
            ${quiz.options.map((option, index) => {
        const escapedOption = option.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        return `
                    <button class="card option-btn" onclick="selectOption('${escapedOption}', ${index})" 
                        style="cursor:pointer;padding:20px 24px;text-align:center;font-size:17px;display:flex;align-items:center;justify-content:center;gap:10px;transition:all 0.2s;">
                        <span style="font-size:20px;">🔊</span>
                        <span>${option}</span>
                    </button>
                `;
    }).join('')}
        </div>
    `;
}

// Render fill in the blank
function renderFillBlank(quiz) {
    const container = document.getElementById('quizContainer');
    const parts = quiz.question.split('___');

    container.innerHTML = `
        <div class="text-center mb-3">
            <h2 style="margin-bottom: 24px;">Fill in the blank</h2>
        </div>
        <div style="font-size: 24px; text-align: center; margin-bottom: 32px;">
            ${parts[0]}
            <input type="text" id="blankInput" 
                style="display: inline-block; width: 200px; text-align: center; font-size: 24px;"
                oninput="enableCheckButton()"
                placeholder="...">
            ${parts[1] || ''}
        </div>
        ${quiz.hint ? `<p class="text-muted text-center">💡 Hint: ${quiz.hint}</p>` : ''}
    `;

    // Focus input
    setTimeout(() => document.getElementById('blankInput').focus(), 100);
}

// Render translation quiz
function renderTranslation(quiz) {
    const container = document.getElementById('quizContainer');
    container.innerHTML = `
        <div class="text-center mb-3">
            <h2 style="margin-bottom: 16px;">Translate this sentence</h2>
            <div class="card" style="background: var(--bg-secondary); padding: 24px; margin: 24px 0;">
                <p style="font-size: 28px; font-weight: bold;">${quiz.sentence}</p>
            </div>
        </div>
        <textarea id="translationInput" rows="3" 
            placeholder="Type your translation here..."
            oninput="enableCheckButton()"
            style="font-size: 18px;"></textarea>
    `;
}

// Render listening quiz
function renderListening(quiz) {
    const container = document.getElementById('quizContainer');
    container.innerHTML = `
        <div class="text-center mb-3">
            <h2 style="margin-bottom: 24px;">🎧 What do you hear?</h2>
            <button class="btn btn-primary" onclick="playAudio('${quiz.audioText}')" 
                style="font-size: 48px; padding: 32px; border-radius: 50%; width: 120px; height: 120px;">
                🔊
            </button>
            <p class="text-muted mt-2">Click to play audio</p>
        </div>
        <input type="text" id="listeningInput" 
            placeholder="Type what you hear..."
            oninput="enableCheckButton()"
            style="font-size: 20px; text-align: center; margin-top: 24px;">
    `;
}

// Render speaking quiz
function renderSpeaking(quiz) {
    const container = document.getElementById('quizContainer');
    container.innerHTML = `
        <div class="text-center mb-3">
            <h2 style="margin-bottom: 16px;">🎤 Say this in ${currentLesson.language}</h2>
            <div class="card" style="background: var(--bg-secondary); padding: 24px; margin: 24px 0;">
                <p style="font-size: 24px;">${quiz.prompt}</p>
            </div>
            <button id="recordBtn" class="btn btn-primary" onclick="startRecording()" 
                style="font-size: 48px; padding: 32px; border-radius: 50%; width: 120px; height: 120px;">
                🎤
            </button>
            <p class="text-muted mt-2">Click to record</p>
        </div>
    `;
}

// Render matching quiz (match pairs)
function renderMatching(quiz) {
    const container = document.getElementById('quizContainer');
    const shuffledRight = [...quiz.rightColumn].sort(() => Math.random() - 0.5);

    container.innerHTML = `
        <div class="text-center mb-3">
            <h2 style="margin-bottom: 24px;">🔗 Match the Pairs</h2>
            <p class="text-muted">Click items to match them together</p>
        </div>
        <div class="grid-2" style="gap: 24px;">
            <div id="leftColumn">
                ${quiz.leftColumn.map((item, index) => `
                    <button class="card match-btn" onclick="selectMatchItem('left', ${index}, '${item}')"
                        data-value="${item}" style="cursor: pointer; padding: 16px; margin-bottom: 12px; text-align: center;">
                        ${item}
                    </button>
                `).join('')}
            </div>
            <div id="rightColumn">
                ${shuffledRight.map((item, index) => `
                    <button class="card match-btn" onclick="selectMatchItem('right', ${index}, '${item}')"
                        data-value="${item}" style="cursor: pointer; padding: 16px; margin-bottom: 12px; text-align: center;">
                        ${item}
                    </button>
                `).join('')}
            </div>
        </div>
        <div id="matchedPairs" style="margin-top: 24px;"></div>
    `;

    // Initialize matching state
    window.matchingState = {
        selectedLeft: null,
        selectedRight: null,
        matches: [],
        correctPairs: quiz.correctPairs || {}
    };
}

// Render sentence reorder quiz
function renderReorder(quiz) {
    const container = document.getElementById('quizContainer');
    const shuffledWords = [...quiz.words].sort(() => Math.random() - 0.5);

    container.innerHTML = `
        <div class="text-center mb-3">
            <h2 style="margin-bottom: 24px;">📝 Put the words in the correct order</h2>
            ${quiz.hint ? `<p class="text-muted">💡 ${quiz.hint}</p>` : ''}
        </div>
        <div id="answerArea" style="min-height: 60px; background: var(--bg-secondary); border: 2px dashed var(--purple); border-radius: 12px; padding: 16px; margin-bottom: 24px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: center;">
            <p class="text-muted" id="dropPlaceholder">Drag words here</p>
        </div>
        <div id="wordBank" style="display: flex; flex-wrap: wrap; gap: 12px; justify-content: center;">
            ${shuffledWords.map((word, index) => `
                <button class="btn btn-secondary word-chip" draggable="true" 
                    onclick="toggleWord(${index}, '${word.replace(/'/g, "\\'")}')"
                    data-word="${word.replace(/"/g, '&quot;')}" data-index="${index}"
                    style="cursor: grab; padding: 12px 20px; display: flex; align-items: center; gap: 8px;">
                    <span>🔊</span>
                    <span>${word}</span>
                </button>
            `).join('')}
        </div>
    `;

    // Initialize reorder state
    window.reorderState = {
        selectedWords: [],
        correctOrder: quiz.correctOrder || quiz.words
    };
}

// Speak a word using TTS in the lesson's language
function speakWord(word) {
    const langCode = getLanguageCode(currentLesson?.language || 'English');
    const cleanWord = word.split('(')[0].trim();
    speak(cleanWord, langCode);
}


// Note: playSuccessSound and playFailSound are now globally available in app.js

// Select option (multiple choice)
function selectOption(option, index) {
    userAnswer = option;

    // Remove previous selection
    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.style.border = '1px solid var(--border-color)';
        btn.style.background = '';
    });

    // Highlight selected
    event.currentTarget ? event.currentTarget.style.border = '2px solid var(--purple)' : event.target.style.border = '2px solid var(--purple)';

    // 🔊 Pronounce the selected word
    speakWord(option);

    document.getElementById('checkBtn').disabled = false;
}

// Select match item (matching quiz)
function selectMatchItem(side, index, value) {
    const state = window.matchingState;
    const buttons = document.querySelectorAll('.match-btn');

    if (side === 'left') {
        // Deselect previous left
        buttons.forEach(btn => {
            if (btn.dataset.value === state.selectedLeft) {
                btn.style.border = '1px solid var(--border-color)';
            }
        });

        state.selectedLeft = value;
        event.target.style.border = '3px solid var(--purple)';
    } else {
        state.selectedRight = value;
        event.target.style.border = '3px solid var(--blue)';
    }

    // If both selected, create match
    if (state.selectedLeft && state.selectedRight) {
        state.matches.push({
            left: state.selectedLeft,
            right: state.selectedRight
        });

        // Hide matched buttons
        buttons.forEach(btn => {
            if (btn.dataset.value === state.selectedLeft || btn.dataset.value === state.selectedRight) {
                btn.style.opacity = '0.3';
                btn.style.pointerEvents = 'none';
                btn.style.border = '2px solid var(--green)';
            }
        });

        // Show matched pair
        const matchedDiv = document.getElementById('matchedPairs');
        matchedDiv.innerHTML += `
            <div class="card" style="background: var(--bg-secondary); padding: 12px; margin-bottom: 8px; display: flex; justify-content: space-between;">
                <span>${state.selectedLeft}</span>
                <span>↔️</span>
                <span>${state.selectedRight}</span>
            </div>
        `;

        // Reset selection
        state.selectedLeft = null;
        state.selectedRight = null;

        // Check if all matched
        const leftCount = document.querySelectorAll('#leftColumn .match-btn').length;
        if (state.matches.length === leftCount) {
            document.getElementById('checkBtn').disabled = false;
        }
    }
}

// Toggle word (sentence reorder)
function toggleWord(index, word) {
    const state = window.reorderState;
    const button = event.currentTarget || event.target;
    const answerArea = document.getElementById('answerArea');
    const placeholder = document.getElementById('dropPlaceholder');

    // Pronounce the word when tapped
    speakWord(word);

    if (state.selectedWords.includes(word)) {
        // Remove word
        state.selectedWords = state.selectedWords.filter(w => w !== word);
        button.style.opacity = '1';
        button.style.background = '';
    } else {
        // Add word
        state.selectedWords.push(word);
        button.style.opacity = '0.3';
        button.style.background = 'var(--purple)';
    }

    // Update answer area
    if (state.selectedWords.length > 0) {
        if (placeholder) placeholder.remove();
        answerArea.innerHTML = state.selectedWords.map(w => `
            <span class="btn btn-primary" style="padding: 12px 20px; display: flex; align-items: center; gap: 8px;">
                <span>🔊</span>
                <span>${w}</span>
            </span>
        `).join('');
        document.getElementById('checkBtn').disabled = false;
    } else {
        answerArea.innerHTML = '<p class="text-muted" id="dropPlaceholder">Drag words here</p>';
        document.getElementById('checkBtn').disabled = true;
    }
}

// Enable check button
function enableCheckButton() {
    document.getElementById('checkBtn').disabled = false;
}

// Check answer
function checkAnswer() {
    const quiz = quizzes[currentQuizIndex];
    let isCorrect = false;

    // Get user answer based on quiz type
    switch (quiz.type) {
        case 'multiple-choice':
        case 'multiple_choice':
            isCorrect = userAnswer.trim() === quiz.correctAnswer.trim();
            break;
        case 'fill-blank':
        case 'fill_blank':
            const blankInput = document.getElementById('blankInput').value.trim().toLowerCase();
            isCorrect = blankInput === quiz.correctAnswer.trim().toLowerCase();
            break;
        case 'translation':
            const translation = document.getElementById('translationInput').value.trim();
            isCorrect = translation.toLowerCase() === quiz.correctAnswer.toLowerCase();
            break;
        case 'listening':
            const listening = document.getElementById('listeningInput').value.trim().toLowerCase();
            isCorrect = listening === quiz.audioText.toLowerCase();
            break;
        case 'speaking':
            // For now, accept speaking answers (would need speech recognition)
            isCorrect = true;
            break;
        case 'matching':
            // Check if all pairs match correctly
            const state = window.matchingState;
            isCorrect = state.matches.every(match => {
                const correctRight = state.correctPairs[match.left];
                return correctRight === match.right;
            });
            break;
        case 'reorder':
            // Check if word order is correct
            const reorderState = window.reorderState;
            const userOrder = reorderState.selectedWords.join(' ');
            const correctOrder = reorderState.correctOrder.join(' ');
            isCorrect = userOrder === correctOrder;
            break;
    }

    showFeedback(isCorrect, quiz);

    if (isCorrect) {
        correctAnswers++;
        playSuccessSound();
    } else {
        hearts--;
        updateHeartsDisplay();
        playFailSound();

        // Shake animation for wrong answer
        document.getElementById('quizContainer').classList.add('shake');
        setTimeout(() => {
            document.getElementById('quizContainer').classList.remove('shake');
        }, 500);
    }

    // Hide check button, show continue
    document.getElementById('checkBtn').style.display = 'none';
    const continueBtn = document.getElementById('continueBtn');
    continueBtn.style.display = 'block';

    // If it's the last question, change button text
    if (currentQuizIndex === quizzes.length - 1) {
        continueBtn.textContent = 'Finish Lesson';
        continueBtn.classList.remove('btn-success');
        continueBtn.classList.add('btn-primary');
        continueBtn.style.boxShadow = '0 0 20px rgba(52, 211, 153, 0.4)';
    } else {
        continueBtn.textContent = 'Continue';
        continueBtn.classList.add('btn-success');
        continueBtn.classList.remove('btn-primary');
        continueBtn.style.boxShadow = '';
    }
}

// Show feedback
function showFeedback(isCorrect, quiz) {
    const feedback = document.getElementById('feedbackContainer');

    // Appreciation messages
    const appreciations = ['Amazing!', 'Great job!', 'Spectacular!', 'Brilliant!', 'Keep it up!', 'Awesome!', 'Perfect!'];
    const randomAppreciation = appreciations[Math.floor(Math.random() * appreciations.length)];

    feedback.className = isCorrect ? 'card success-animation' : 'card';
    feedback.style.background = isCorrect ? 'var(--green)' : 'var(--red)';
    feedback.style.padding = '24px';
    feedback.style.marginTop = '24px';
    feedback.style.color = 'white';

    feedback.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 20px;">
            <div style="font-size: 40px;">${isCorrect ? '✅' : '❌'}</div>
            <div style="flex: 1;">
                <h3 style="font-size: 24px; margin-bottom: 8px; color: white;">
                    ${isCorrect ? randomAppreciation : 'Good try!'}
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
    }
}

// Next question
function nextQuestion() {
    currentQuizIndex++;

    if (currentQuizIndex < quizzes.length) {
        loadQuiz();
    } else {
        completeLesson();
    }
}

// Skip question
function skipQuestion() {
    nextQuestion();
}

// Complete lesson
async function completeLesson() {
    const xpEarned = currentLesson.xpReward || 10;
    const accuracy = Math.round((correctAnswers / quizzes.length) * 100);

    // Update UI
    document.getElementById('quizContainer').style.display = 'none';
    document.getElementById('checkBtn').style.display = 'none';
    document.getElementById('continueBtn').style.display = 'none';

    // Hide progress and title for a clean completion screen
    if (document.getElementById('progressContainer')) {
        document.getElementById('progressContainer').style.display = 'none';
    }
    if (document.getElementById('titleContainer')) {
        document.getElementById('titleContainer').style.display = 'none';
    }

    document.getElementById('completionScreen').classList.remove('hidden');

    document.getElementById('xpEarned').textContent = xpEarned;
    document.getElementById('accuracy').textContent = accuracy + '%';
    document.getElementById('heartsLeft').textContent = hearts;

    triggerConfetti();

    // Update progress on backend
    try {
        const response = await apiCall('/lessons/complete', {
            method: 'POST',
            body: JSON.stringify({
                lessonId: currentLesson.lessonId,
                language: currentLesson.language,
                score: accuracy,
                quizResults: {
                    total: quizzes.length,
                    correct: correctAnswers
                },
                xpEarned: xpEarned
            })
        });
        console.log('Progress saved successfully:', response);
    } catch (error) {
        console.error('Failed to save progress:', error);
    }
}

// Out of hearts screen
function showOutOfHeartsScreen() {
    const container = document.getElementById('quizContainer');
    container.innerHTML = `
        <div class="text-center" style="padding: 48px;">
            <div style="font-size: 80px; margin-bottom: 24px;">💔</div>
            <h1 style="font-size: 36px; margin-bottom: 16px;">Out of Hearts!</h1>
            <p class="text-muted" style="font-size: 18px; margin-bottom: 32px;">
                Come back later or practice other skills
            </p>
            <button class="btn btn-primary" onclick="returnToCourses()">
                Back to Courses
            </button>
        </div>
    `;

    document.getElementById('checkBtn').style.display = 'none';
    document.getElementById('continueBtn').style.display = 'none';
}

// Play audio (text-to-speech)
function playAudio(text) {
    speak(text, currentLesson.languageCode || 'en-US');
}

// Start recording (speech-to-text)
function startRecording() {
    const btn = document.getElementById('recordBtn');
    btn.textContent = '🔴';
    btn.disabled = true;

    startSpeechRecognition((transcript) => {
        userAnswer = transcript;
        btn.textContent = '✅';
        showToast('Recorded: ' + transcript, 'success');
        document.getElementById('checkBtn').disabled = false;

        setTimeout(() => {
            btn.textContent = '🎤';
            btn.disabled = false;
        }, 1000);
    }, currentLesson.languageCode || 'en-US');
}

// Exit lesson
function exitLesson() {
    if (confirm('Are you sure you want to exit? Your progress will be lost.')) {
        window.location.href = 'courses.html';
    }
}

// Return to courses
function returnToCourses() {
    localStorage.removeItem('currentLesson');
    window.location.href = 'courses.html';
}

// Initialize
loadLesson();
