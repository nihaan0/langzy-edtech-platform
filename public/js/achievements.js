// Achievements Page Logic
requireAuth();

let achievements = [];
let currentFilter = 'all';

// Load achievements
async function loadAchievements() {
    try {
        const data = await apiCall('/achievements');
        achievements = data.achievements || [];
        filterAchievements(currentFilter);
        updateProgress();
    } catch (error) {
        console.error('Failed to load achievements:', error);
        showToast('Failed to load achievements', 'error');
    }
}

// Filter achievements
function filterAchievements(filter) {
    currentFilter = filter;

    // Update button styles
    document.querySelectorAll('[id^="filter"]').forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
    });
    document.getElementById(`filter${filter.charAt(0).toUpperCase() + filter.slice(1)}`).classList.remove('btn-secondary');
    document.getElementById(`filter${filter.charAt(0).toUpperCase() + filter.slice(1)}`).classList.add('btn-primary');

    // Filter and render
    let filtered = achievements;
    if (filter === 'unlocked') {
        filtered = achievements.filter(a => a.unlocked);
    } else if (filter === 'locked') {
        filtered = achievements.filter(a => !a.unlocked);
    }

    renderAchievements(filtered);
}

// Render achievements
function renderAchievements(filtered) {
    const grid = document.getElementById('achievementsGrid');
    grid.innerHTML = '';

    if (filtered.length === 0) {
        grid.innerHTML = '<p class="text-muted">No achievements found</p>';
        return;
    }

    filtered.forEach(achievement => {
        const card = document.createElement('div');
        card.className = `badge ${achievement.unlocked ? 'unlocked' : 'locked'}`;
        card.style.cursor = 'pointer';
        card.onclick = () => showAchievementDetail(achievement);

        card.innerHTML = `
            <div class="text-center">
                <div style="font-size: 64px; margin-bottom: 16px;">${achievement.icon || '🏆'}</div>
                <h3 style="margin-bottom: 8px;">${achievement.title}</h3>
                <p class="text-muted" style="font-size: 14px; margin-bottom: 12px;">${achievement.description}</p>
                ${achievement.unlocked ?
                `<div>
                        <p class="text-success" style="font-size: 14px; margin-bottom: 4px;">✓ Unlocked</p>
                        <p class="text-muted" style="font-size: 11px;">${new Date(achievement.unlockedAt).toLocaleDateString()}</p>
                    </div>` :
                `<div>
                        <p class="text-muted" style="font-size: 14px; margin-bottom: 8px;">🔒 Locked</p>
                        ${achievement.progress ?
                    `<div class="xp-bar" style="height: 8px; margin-top: 8px;">
                                <div class="xp-fill" style="width: ${(achievement.progress.current / achievement.progress.required) * 100}%;"></div>
                            </div>
                            <p class="text-muted" style="font-size: 11px; margin-top: 4px;">
                                ${achievement.progress.current} / ${achievement.progress.required}
                            </p>` : ''
                }
                    </div>`
            }
            </div>
        `;

        grid.appendChild(card);
    });
}

// Show achievement detail
function showAchievementDetail(achievement) {
    const modal = document.createElement('div');
    modal.className = 'card';
    modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 1000;
        max-width: 500px;
        width: 90%;
        padding: 48px;
    `;

    modal.innerHTML = `
        <button onclick="closeModal()" style="position: absolute; top: 16px; right: 16px; background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-primary);">✕</button>
        <div class="text-center">
            <div style="font-size: 96px; margin-bottom: 24px; ${achievement.unlocked ? 'animation: success 0.6s ease;' : 'filter: grayscale(1); opacity: 0.5;'}">${achievement.icon || '🏆'}</div>
            <h2 style="font-size: 32px; margin-bottom: 16px;">${achievement.title}</h2>
            <p class="text-muted" style="font-size: 18px; margin-bottom: 24px;">${achievement.description}</p>
            
            ${achievement.unlocked ?
            `<div class="success-animation">
                    <p class="text-success" style="font-size: 20px; margin-bottom: 8px;">✅ Achievement Unlocked!</p>
                    <p class="text-muted">Unlocked on ${new Date(achievement.unlockedAt).toLocaleDateString()}</p>
                    ${achievement.xpReward ? `<p style="color: var(--purple); margin-top: 16px; font-size: 18px;">+${achievement.xpReward} XP</p>` : ''}
                </div>` :
            `<div>
                    <p class="text-muted" style="font-size: 18px; margin-bottom: 16px;">🔒 Not yet unlocked</p>
                    ${achievement.criteria ? `<p class="text-muted" style="font-size: 14px;">Unlock by: ${achievement.criteria}</p>` : ''}
                    ${achievement.progress ?
                `<div style="margin-top: 24px;">
                            <div class="flex-between mb-1">
                                <span class="text-muted">Progress</span>
                                <span class="text-muted">${achievement.progress.current} / ${achievement.progress.required}</span>
                            </div>
                            <div class="xp-bar">
                                <div class="xp-fill" style="width: ${(achievement.progress.current / achievement.progress.required) * 100}%;"></div>
                            </div>
                        </div>` : ''
            }
                </div>`
        }
        </div>
    `;

    document.body.appendChild(modal);

    // Add backdrop
    const backdrop = document.createElement('div');
    backdrop.id = 'modalBackdrop';
    backdrop.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 999;';
    backdrop.onclick = closeModal;
    document.body.appendChild(backdrop);

    if (achievement.unlocked) {
        triggerConfetti();
    }
}

// Close modal
function closeModal() {
    const modal = document.querySelector('.card[style*="position: fixed"]');
    const backdrop = document.getElementById('modalBackdrop');
    if (modal) modal.remove();
    if (backdrop) backdrop.remove();
}

// Update progress
function updateProgress() {
    const unlocked = achievements.filter(a => a.unlocked).length;
    const total = achievements.length;
    const percentage = total > 0 ? Math.round((unlocked / total) * 100) : 0;

    document.getElementById('unlockedCount').textContent = `${unlocked}/${total}`;
    document.getElementById('progressText').textContent = `${percentage}%`;
    document.getElementById('progressBar').style.width = `${percentage}%`;
}

// Go back
function goBack() {
    window.location.href = 'profile.html';
}

// Initialize
loadAchievements();
