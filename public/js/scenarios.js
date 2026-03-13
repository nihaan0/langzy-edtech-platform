// Scenarios Page Logic
requireAuth();

const user = getUser();
const currentLanguage = user.currentLanguage || 'Spanish';

// Predefined scenarios
const scenarios = [
    {
        id: 'restaurant',
        title: 'At a Restaurant',
        icon: '🍽️',
        description: 'Order food, ask for recommendations, and pay the bill',
        difficulty: 'beginner',
        xpReward: 15
    },
    {
        id: 'shopping',
        title: 'Shopping',
        icon: '🛍️',
        description: 'Ask for prices, sizes, and make purchases',
        difficulty: 'beginner',
        xpReward: 15
    },
    {
        id: 'directions',
        title: 'Asking for Directions',
        icon: '🗺️',
        description: 'Navigate the city and find your way around',
        difficulty: 'beginner',
        xpReward: 15
    },
    {
        id: 'hotel',
        title: 'Hotel Check-in',
        icon: '🏨',
        description: 'Book a room and handle hotel services',
        difficulty: 'intermediate',
        xpReward: 20
    },
    {
        id: 'airport',
        title: 'At the Airport',
        icon: '✈️',
        description: 'Check in, go through security, and navigate the airport',
        difficulty: 'intermediate',
        xpReward: 20
    },
    {
        id: 'doctor',
        title: 'Doctor Visit',
        icon: '⚕️',
        description: 'Describe symptoms and understand medical advice',
        difficulty: 'intermediate',
        xpReward: 20
    },
    {
        id: 'job_interview',
        title: 'Job Interview',
        icon: '💼',
        description: 'Professional conversation and self-presentation',
        difficulty: 'advanced',
        xpReward: 30
    },
    {
        id: 'business_meeting',
        title: 'Business Meeting',
        icon: '📊',
        description: 'Discuss projects, proposals, and negotiations',
        difficulty: 'advanced',
        xpReward: 30
    },
    {
        id: 'social_gathering',
        title: 'Social Gathering',
        icon: '🎉',
        description: 'Make small talk and socialize with friends',
        difficulty: 'intermediate',
        xpReward: 20
    },
    {
        id: 'phone_call',
        title: 'Phone Conversation',
        icon: '📞',
        description: 'Handle formal and informal phone calls',
        difficulty: 'intermediate',
        xpReward: 20
    },
    {
        id: 'bank',
        title: 'At the Bank',
        icon: '🏦',
        description: 'Open account, make transactions, and ask about services',
        difficulty: 'advanced',
        xpReward: 25
    },
    {
        id: 'emergency',
        title: 'Emergency Situations',
        icon: '🚨',
        description: 'Handle urgent situations and call for help',
        difficulty: 'advanced',
        xpReward: 30
    }
];

// Render scenarios
function renderScenarios() {
    const grid = document.getElementById('scenariosGrid');
    grid.innerHTML = '';

    scenarios.forEach(scenario => {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.cursor = 'pointer';
        card.onclick = () => startScenario(scenario);

        const difficultyColors = {
            'beginner': 'var(--green)',
            'intermediate': 'var(--orange)',
            'advanced': 'var(--red)'
        };

        card.innerHTML = `
            <div class="text-center">
                <div style="font-size: 64px; margin-bottom: 16px;">${scenario.icon}</div>
                <h3 style="margin-bottom: 8px;">${scenario.title}</h3>
                <p class="text-muted" style="font-size: 14px; margin-bottom: 16px;">${scenario.description}</p>
                <div class="flex-between" style="align-items: center;">
                    <span style="color: ${difficultyColors[scenario.difficulty]}; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                        ${scenario.difficulty}
                    </span>
                    <span class="text-muted" style="font-size: 12px;">⭐ ${scenario.xpReward} XP</span>
                </div>
            </div>
        `;

        grid.appendChild(card);
    });
}

// Start scenario
async function startScenario(scenario) {
    showLoading();

    try {
        // Initialize scenario conversation
        const data = await apiCall('/chat/scenario', {
            method: 'POST',
            body: JSON.stringify({
                scenarioId: scenario.id,
                language: currentLanguage
            })
        });

        // Store scenario info
        localStorage.setItem('currentScenario', JSON.stringify(scenario));
        localStorage.setItem('scenarioConversationId', data.conversationId);

        // Redirect to dashboard for chat
        window.location.href = 'dashboard.html?scenario=' + scenario.id;
    } catch (error) {
        hideLoading();
        console.error('Failed to start scenario:', error);
        showToast('Failed to start scenario', 'error');
    }
}

// Go back
function goBack() {
    window.location.href = 'dashboard.html';
}

// Update language display
const languageInfo = getLanguageInfo(currentLanguage);
document.getElementById('languageName').textContent = `${languageInfo.flag} Practice in ${languageInfo.native}`;

// Initialize
renderScenarios();
