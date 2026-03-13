// Profile Page Logic
requireAuth();

let user = getUser();
let selectedAvatar = user.avatar;

const AVATAR_OPTIONS = [
    'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Alex&backgroundColor=b6e3f4',
    'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Sam&backgroundColor=c0aede',
    'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Jordan&backgroundColor=d1d4f9',
    'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Taylor&backgroundColor=ffd5dc',
    'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Morgan&backgroundColor=ffdfbf',
    'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Casey&backgroundColor=c1f4c5',
    'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Riley&backgroundColor=b6e3f4',
    'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Drew&backgroundColor=f4d4b6',
    'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Jamie&backgroundColor=d4f4b6',
    'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Quinn&backgroundColor=f4b6d4',
    'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Skyler&backgroundColor=b6d4f4',
    'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Avery&backgroundColor=f4f4b6',
    'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Blake&backgroundColor=e8d5f4',
    'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Reese&backgroundColor=d5f4e8',
    'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Logan&backgroundColor=f4e8d5',
    'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Dakota&backgroundColor=d5e8f4'
];

// Load user profile
async function loadProfile() {
    try {
        const data = await apiCall('/auth/me');
        user = data.user;
        saveUser(user);

        // Update profile display
        document.getElementById('userName').textContent = user.name;
        document.getElementById('userEmail').textContent = user.email;
        document.getElementById('userAvatar').src = user.avatar;
        document.getElementById('userStreak').textContent = user.streak || 0;
        document.getElementById('totalXP').textContent = formatNumber(user.xp || 0);
        document.getElementById('currentLevel').textContent = user.level || 1;

        // Update league badge
        const leagueBadge = document.getElementById('userLeague');
        leagueBadge.className = `league-badge league-${user.leagueTier?.toLowerCase() || 'bronze'}`;
        const leagueEmojis = {
            'Bronze': '🥉',
            'Silver': '🥈',
            'Gold': '🥇',
            'Diamond': '💎',
            'Legendary': '👑'
        };
        leagueBadge.innerHTML = `${leagueEmojis[user.leagueTier] || '🥉'} ${user.leagueTier || 'Bronze'} League`;

        // Set native language
        document.getElementById('nativeLanguageSelect').value = user.nativeLanguage || 'English';
        document.getElementById('inputName').value = user.name;

        // Render avatar grid
        renderAvatarGrid();

    } catch (error) {
        console.error('Failed to load profile:', error);
        showToast('Failed to load profile', 'error');
    }
}

// Load learning languages with progress
async function loadLearningLanguages() {
    try {
        const languages = user.learningLanguages || [];
        const container = document.getElementById('learningLanguages');
        container.innerHTML = '';

        if (languages.length === 0) {
            container.innerHTML = '<p class="text-muted">No languages yet. Start learning!</p>';
            return;
        }

        container.style.display = 'grid';
        container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
        container.style.gap = '16px';

        for (const lang of languages) {
            const data = await apiCall(`/progress/${lang}`);
            const progress = data.progress || {};
            const langInfo = getLanguageInfo(lang);

            const card = document.createElement('div');
            card.className = 'card';
            card.style.cursor = 'pointer';
            card.onclick = () => selectLanguage(lang);

            card.innerHTML = `
                <div class="text-center">
                    <div style="font-size: 48px; margin-bottom: 12px;">${langInfo.flag}</div>
                    <h3 style="margin-bottom: 8px;">${lang}</h3>
                    <p class="text-muted" style="font-size: 14px;">${langInfo.native}</p>
                    <div class="mt-2" style="font-size: 12px;">
                        <p class="text-muted">Level ${progress.level || 1}</p>
                        <p class="text-success">${progress.lessonsCompleted || 0} lessons</p>
                        <p class="text-purple">${progress.vocabularyMastered || 0} words</p>
                    </div>
                </div>
            `;

            container.appendChild(card);
        }
    } catch (error) {
        console.error('Failed to load languages:', error);
    }
}

// Load achievements
async function loadAchievements() {
    try {
        const data = await apiCall('/achievements');
        const achievements = data.achievements || [];

        // Update statistic counter
        const unlockedCount = achievements.filter(a => a.unlocked).length;
        const statAchievements = document.getElementById('statAchievements');
        if (statAchievements) statAchievements.textContent = unlockedCount;

        const container = document.getElementById('achievements');
        if (!container) return;
        container.innerHTML = '';

        // Show first 8 achievements
        const displayAchievements = achievements.slice(0, 8);

        displayAchievements.forEach(achievement => {
            const card = document.createElement('div');
            card.className = `badge ${achievement.unlocked ? 'unlocked' : 'locked'}`;
            card.style.cursor = achievement.unlocked ? 'pointer' : 'default';

            card.innerHTML = `
                <div class="text-center">
                    <div style="font-size: 40px; margin-bottom: 8px;">${achievement.icon || '🏆'}</div>
                    <h4 style="font-size: 14px; margin-bottom: 4px;">${achievement.title}</h4>
                    <p class="text-muted" style="font-size: 11px;">${achievement.description}</p>
                    ${achievement.unlocked ?
                    `<p class="text-success" style="font-size: 11px; margin-top: 8px;">✓ Unlocked</p>` :
                    `<p class="text-muted" style="font-size: 11px; margin-top: 8px;">🔒 Locked</p>`
                }
                </div>
            `;

            container.appendChild(card);
        });

        if (achievements.length > 8) {
            const moreCard = document.createElement('div');
            moreCard.className = 'card';
            moreCard.style.cursor = 'pointer';
            moreCard.onclick = () => window.location.href = 'achievements.html';
            moreCard.innerHTML = `
                <div class="text-center" style="padding: 24px;">
                    <p style="font-size: 32px; margin-bottom: 8px;">+${achievements.length - 8}</p>
                    <p class="text-muted">More achievements</p>
                </div>
            `;
            container.appendChild(moreCard);
        }
    } catch (error) {
        console.error('Failed to load achievements:', error);
    }
}

// Load overall stats
async function loadOverallStats() {
    try {
        const data = await apiCall('/progress');
        const stats = data.stats || {};

        document.getElementById('lessonsCompleted').textContent = stats.totalLessons || 0;
        document.getElementById('vocabularyMastered').textContent = stats.totalVocabulary || 0;
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

// Select language
async function selectLanguage(language) {
    try {
        await apiCall('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify({ currentLanguage: language })
        });

        user.currentLanguage = language;
        saveUser(user);

        showToast(`Switched to ${language}! 🎉`, 'success');
        window.location.href = 'dashboard.html';
    } catch (error) {
        showToast('Failed to switch language', 'error');
    }
}

// Render avatar selection grid
function renderAvatarGrid() {
    const grid = document.getElementById('avatarGrid');
    if (!grid) return;

    grid.innerHTML = '';
    AVATAR_OPTIONS.forEach(avatarUrl => {
        const div = document.createElement('div');
        div.className = 'avatar-option';
        div.style.cssText = `
            cursor: pointer;
            padding: 8px;
            border-radius: 12px;
            border: 2px solid transparent;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.05);
        `;

        if (avatarUrl === selectedAvatar) {
            div.style.borderColor = 'var(--emerald)';
            div.style.background = 'rgba(16, 185, 129, 0.1)';
        }

        div.onclick = () => selectAvatar(avatarUrl);

        div.innerHTML = `<img src="${avatarUrl}" style="width: 50px; height: 50px; border-radius: 50%;">`;
        grid.appendChild(div);
    });
}

// Handle avatar selection
function selectAvatar(url) {
    selectedAvatar = url;
    document.getElementById('userAvatar').src = url;
    renderAvatarGrid();
}

// Update profile
async function updateProfile() {
    const name = document.getElementById('inputName').value.trim();
    const nativeLanguage = document.getElementById('nativeLanguageSelect').value;

    if (!name) {
        showToast('Name cannot be empty', 'error');
        return;
    }

    try {
        showLoading();
        const data = await apiCall('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify({
                name,
                avatar: selectedAvatar,
                nativeLanguage
            })
        });

        user = data.user;
        saveUser(user);

        // Update UI
        document.getElementById('userName').textContent = user.name;
        document.getElementById('userAvatar').src = user.avatar;

        // Update header if exists
        const headerNames = document.querySelectorAll('.header-profile-name');
        headerNames.forEach(el => el.textContent = user.name);

        showToast('Profile updated successfully! ✨', 'success');
        hideLoading();
    } catch (error) {
        hideLoading();
        showToast(error.message || 'Failed to update profile', 'error');
    }
}

// Logout
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        clearAuth();
        window.location.href = 'index.html';
    }
}

// Delete account
async function deleteAccount() {
    const confirmation = prompt('Type "DELETE" to confirm account deletion:');
    if (confirmation === 'DELETE') {
        const finalConfirm = confirm('⚠️ WARNING: This action is PERMANENT and cannot be undone!\n\nAll your data will be deleted:\n• Progress in all languages\n• Achievements and XP\n• Friends and conversations\n• Vocabulary and lessons\n\nAre you absolutely sure?');

        if (!finalConfirm) {
            showToast('Account deletion cancelled', 'info');
            return;
        }

        try {
            showLoading();
            await apiCall('/auth/delete', {
                method: 'DELETE'
            });

            showToast('Account deleted successfully. Goodbye! 👋', 'success');

            // Clear local data and redirect
            setTimeout(() => {
                clearAuth();
                window.location.href = 'index.html';
            }, 2000);
        } catch (error) {
            hideLoading();
            showToast(error.message || 'Failed to delete account', 'error');
        }
    } else if (confirmation !== null) {
        showToast('Incorrect confirmation. Account deletion cancelled.', 'error');
    }
}

// Initialize
loadProfile();
loadLearningLanguages();
loadAchievements();
loadOverallStats();
