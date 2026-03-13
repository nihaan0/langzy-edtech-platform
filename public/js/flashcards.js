// Flashcards Page Logic
requireAuth();

const user = getUser();
let currentLanguage = user.currentLanguage || 'Spanish';
let cards = [];
let filteredCards = [];
let currentFilter = 'all';
let currentCardIndex = 0;
let isFlipped = false;
let cardsReviewed = 0;

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

    // Reload cards for new language
    loadFlashcards();

    // If in practice mode, exit it
    if (!document.getElementById('flashcardPractice').classList.contains('hidden')) {
        if (confirm(`Switch to ${language}? Current practice session will end.`)) {
            exitPractice();
        } else {
            // Revert selector
            document.getElementById('languageSelector').value = currentLanguage;
        }
    }
}

async function loadUserData() {
    currentLanguage = user.currentLanguage || 'Spanish';
    const langInfo = getLanguageInfo(currentLanguage);
    document.getElementById('languageName').textContent = `${langInfo.flag} ${currentLanguage}`;

    const selector = document.getElementById('languageSelector');
    if (selector) selector.value = currentLanguage;

    await loadFlashcards();
    updateStats();
}

async function loadFlashcards() {
    showLoading();

    try {
        const response = await apiCall(`/vocabulary/${currentLanguage}`);
        const vocabList = response.vocabulary || response.words || [];
        cards = vocabList.length > 0 ? vocabList : generateSampleCards();
    } catch (error) {
        console.warn('Using sample cards');
        cards = generateSampleCards();
    }

    hideLoading();
    filterCards('all');
    updateStats();
}

function filterCards(filter) {
    currentFilter = filter;

    // Update button styles
    document.querySelectorAll('[id^="filter"]').forEach(btn => {
        btn.className = 'btn btn-secondary';
    });
    document.getElementById(`filter${filter.charAt(0).toUpperCase() + filter.slice(1)}`).className = 'btn btn-primary';

    // Filter cards
    switch (filter) {
        case 'all':
            filteredCards = cards;
            break;
        case 'learning':
            filteredCards = cards.filter(c => !c.mastered && c.reviewCount && c.reviewCount > 0);
            break;
        case 'review':
            const now = new Date();
            filteredCards = cards.filter(c => {
                if (!c.nextReview) return false;
                return new Date(c.nextReview) <= now;
            });
            break;
        case 'mastered':
            filteredCards = cards.filter(c => c.mastered);
            break;
    }

    updateStats();
    renderCardGrid();
}


function renderCardGrid() {
    const grid = document.getElementById('cardGrid');
    if (!grid) return;

    grid.innerHTML = '';

    if (filteredCards.length === 0) {
        grid.innerHTML = '<p class="text-muted text-center" style="grid-column: 1/-1; padding: 40px;">No cards found for this category.</p>';
        return;
    }

    filteredCards.forEach((card) => {
        const cardEl = document.createElement('div');
        cardEl.className = 'card fadeInUp';
        cardEl.style.padding = '20px';
        cardEl.style.textAlign = 'center';
        cardEl.style.border = '1px solid var(--border-color)';
        cardEl.style.cursor = 'pointer';
        cardEl.style.transition = 'transform 0.15s ease, box-shadow 0.15s ease';
        cardEl.title = 'Click to hear pronunciation';

        cardEl.innerHTML = `
            <div style="font-size: 24px; font-weight: 700; margin-bottom: 8px; color: var(--text-primary);">${card.word}</div>
            <div style="font-size: 16px; color: var(--purple); margin-bottom: 12px;">${card.translation}</div>
            <div class="flex-center gap-1">
                ${card.mastered ? '<span title="Mastered">✅</span>' : '<span title="Learning">📖</span>'}
                <span class="text-muted" style="font-size: 12px;">${card.reviewCount || 0} reviews</span>
                <span style="font-size: 14px; margin-left: 6px; opacity: 0.6;">🔊</span>
            </div>
        `;

        // Hover effect
        cardEl.addEventListener('mouseenter', () => {
            cardEl.style.transform = 'translateY(-3px)';
            cardEl.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2)';
        });
        cardEl.addEventListener('mouseleave', () => {
            cardEl.style.transform = 'translateY(0)';
            cardEl.style.boxShadow = '';
        });

        // Click to pronounce
        cardEl.addEventListener('click', () => {
            playAudio(card.word);
            // Brief visual pulse feedback
            cardEl.style.transform = 'scale(0.96)';
            setTimeout(() => { cardEl.style.transform = 'translateY(-3px)'; }, 150);
        });

        grid.appendChild(cardEl);
    });
}


function updateStats() {
    const total = cards.length;
    const mastered = cards.filter(c => c.mastered).length;
    const learning = cards.filter(c => !c.mastered && c.reviewCount && c.reviewCount > 0).length;

    document.getElementById('totalCount').textContent = total;
    document.getElementById('learningCount').textContent = learning;
    document.getElementById('masteredCount').textContent = mastered;
    document.getElementById('cardsReviewed').textContent = cardsReviewed;
}

function startPractice() {
    if (filteredCards.length === 0) {
        showToast('No cards available for practice!', 'error');
        return;
    }

    currentCardIndex = 0;
    cardsReviewed = 0;
    isFlipped = false;

    document.getElementById('cardStats').classList.add('hidden');
    document.getElementById('cardGrid').classList.add('hidden');
    document.getElementById('flashcardPractice').classList.remove('hidden');
    document.getElementById('totalCards').textContent = filteredCards.length;

    loadCard();
}

function loadCard() {
    if (currentCardIndex >= filteredCards.length) {
        exitPractice();
        showToast(`Practice complete! Reviewed ${cardsReviewed} cards.`, 'success');
        return;
    }

    const card = filteredCards[currentCardIndex];
    isFlipped = false;

    document.getElementById('currentCard').textContent = currentCardIndex + 1;
    const progress = ((currentCardIndex + 1) / filteredCards.length) * 100;
    document.getElementById('progressBar').style.width = progress + '%';

    document.getElementById('frontText').textContent = card.word;
    document.getElementById('backText').textContent = card.translation;

    // Reset flip state
    document.getElementById('cardFront').classList.remove('hidden');
    document.getElementById('cardBack').classList.add('hidden');
    document.getElementById('flashcard').style.transform = 'rotateY(0deg)';
}

function flipCard() {
    isFlipped = !isFlipped;

    if (isFlipped) {
        document.getElementById('cardFront').classList.add('hidden');
        document.getElementById('cardBack').classList.remove('hidden');
        document.getElementById('flashcard').style.transform = 'rotateY(180deg)';
    } else {
        document.getElementById('cardFront').classList.remove('hidden');
        document.getElementById('cardBack').classList.add('hidden');
        document.getElementById('flashcard').style.transform = 'rotateY(0deg)';
    }
}

async function rateCard(difficulty) {
    const card = filteredCards[currentCardIndex];
    cardsReviewed++;

    // Calculate next review date based on spaced repetition
    let daysUntilReview = 1;
    switch (difficulty) {
        case 'hard':
            daysUntilReview = 1;
            break;
        case 'good':
            daysUntilReview = 3;
            break;
        case 'easy':
            daysUntilReview = 7;
            break;
    }

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + daysUntilReview);

    // Update card locally
    card.reviewCount = (card.reviewCount || 0) + 1;
    card.nextReview = nextReview;
    card.lastReviewed = new Date();

    if (difficulty === 'easy' && card.reviewCount >= 3) {
        card.mastered = true;
    }

    // Update on backend
    try {
        await apiCall(`/vocabulary/${card._id || card.id}`, {
            method: 'PUT',
            body: JSON.stringify({
                reviewCount: card.reviewCount,
                nextReview: nextReview,
                lastReviewed: card.lastReviewed,
                mastered: card.mastered
            })
        });
    } catch (error) {
        console.error('Failed to update card:', error);
    }

    // Move to next card
    currentCardIndex++;
    updateStats();
    setTimeout(loadCard, 300);
}

function exitPractice() {
    document.getElementById('flashcardPractice').classList.add('hidden');
    document.getElementById('cardStats').classList.remove('hidden');
    document.getElementById('cardGrid').classList.remove('hidden');
    updateStats();
    renderCardGrid();
}

function playAudio(text) {
    const langCode = getLanguageCode(currentLanguage);
    speak(text, langCode);
}

function getLanguageCode(lang) {
    const codes = {
        Spanish: 'es-ES', French: 'fr-FR', German: 'de-DE', Italian: 'it-IT',
        Tamil: 'ta-IN', Hindi: 'hi-IN', Japanese: 'ja-JP', Chinese: 'zh-CN',
        Korean: 'ko-KR', Arabic: 'ar-SA', English: 'en-US'
    };
    return codes[lang] || 'en-US';
}

function generateSampleCards() {
    const sampleWords = {
        Spanish: [
            { word: 'Hola', translation: 'Hello' },
            { word: 'Adiós', translation: 'Goodbye' },
            { word: 'Gracias', translation: 'Thank you' },
            { word: 'Por favor', translation: 'Please' },
            { word: 'Sí', translation: 'Yes' },
            { word: 'No', translation: 'No' },
            { word: 'Amor', translation: 'Love' },
            { word: 'Feliz', translation: 'Happy' },
            { word: 'Triste', translation: 'Sad' },
            { word: 'Casa', translation: 'House' }
        ],
        French: [
            { word: 'Bonjour', translation: 'Hello' },
            { word: 'Au revoir', translation: 'Goodbye' },
            { word: 'Merci', translation: 'Thank you' },
            { word: "S'il vous plaît", translation: 'Please' },
            { word: 'Oui', translation: 'Yes' },
            { word: 'Non', translation: 'No' },
            { word: 'Amour', translation: 'Love' },
            { word: 'Heureux', translation: 'Happy' },
            { word: 'Triste', translation: 'Sad' },
            { word: 'Maison', translation: 'House' }
        ],
        German: [
            { word: 'Hallo', translation: 'Hello' },
            { word: 'Auf Wiedersehen', translation: 'Goodbye' },
            { word: 'Danke', translation: 'Thank you' },
            { word: 'Bitte', translation: 'Please' },
            { word: 'Ja', translation: 'Yes' },
            { word: 'Nein', translation: 'No' },
            { word: 'Liebe', translation: 'Love' },
            { word: 'Glücklich', translation: 'Happy' },
            { word: 'Traurig', translation: 'Sad' },
            { word: 'Haus', translation: 'House' }
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
        Tamil: [
            { word: 'Vanakkam', translation: 'Hello' },
            { word: 'Poittu Varen', translation: 'Goodbye' },
            { word: 'Nandri', translation: 'Thank you' },
            { word: 'Thayavu Seithu', translation: 'Please' },
            { word: 'Aamam', translation: 'Yes' },
            { word: 'Illa', translation: 'No' },
            { word: 'Anbu', translation: 'Love' },
            { word: 'Makizhchi', translation: 'Happy' },
            { word: 'Dukham', translation: 'Sad' },
            { word: 'Veedu', translation: 'House' }
        ],
        Hindi: [
            { word: 'Namaste', translation: 'Hello' },
            { word: 'Alvida', translation: 'Goodbye' },
            { word: 'Dhanyavaad', translation: 'Thank you' },
            { word: 'Kripaya', translation: 'Please' },
            { word: 'Haan', translation: 'Yes' },
            { word: 'Nahi', translation: 'No' },
            { word: 'Pyaar', translation: 'Love' },
            { word: 'Khush', translation: 'Happy' },
            { word: 'Udaas', translation: 'Sad' },
            { word: 'Ghar', translation: 'House' }
        ],
        Telugu: [
            { word: 'Namaskaram', translation: 'Hello' },
            { word: 'Veltunna', translation: 'Goodbye' },
            { word: 'Dhanyavaadalu', translation: 'Thank you' },
            { word: 'Dayachesi', translation: 'Please' },
            { word: 'Avunu', translation: 'Yes' },
            { word: 'Kadu', translation: 'No' },
            { word: 'Prema', translation: 'Love' },
            { word: 'Santhosham', translation: 'Happy' },
            { word: 'Dukkham', translation: 'Sad' },
            { word: 'Illu', translation: 'House' }
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
        Japanese: [
            { word: 'Konnichiwa', translation: 'Hello' },
            { word: 'Sayonara', translation: 'Goodbye' },
            { word: 'Arigatou', translation: 'Thank you' },
            { word: 'Onegaishimasu', translation: 'Please' },
            { word: 'Hai', translation: 'Yes' },
            { word: 'Iie', translation: 'No' },
            { word: 'Ai', translation: 'Love' },
            { word: 'Ureshii', translation: 'Happy' },
            { word: 'Kanashii', translation: 'Sad' },
            { word: 'Ie', translation: 'House' }
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

    const words = sampleWords[currentLanguage] || sampleWords['Spanish'];
    return words.map((w, i) => ({
        word: w.word,
        translation: w.translation,
        reviewCount: i % 3,
        mastered: i % 5 === 4
    }));
}
