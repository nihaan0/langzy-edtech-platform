// Friends Page Logic
requireAuth();

let friends = [];
let pendingRequests = [];
let currentTab = 'all';

// Load friends
async function loadFriends() {
    try {
        const data = await apiCall('/friends');
        friends = data.friends || [];
        pendingRequests = data.pendingRequests || [];

        updateStats();
        switchTab(currentTab);
    } catch (error) {
        console.error('Failed to load friends:', error);
        showToast('Failed to load friends', 'error');
    }
}

// Update stats
function updateStats() {
    document.getElementById('friendsCount').textContent = friends.length;
    document.getElementById('pendingCount').textContent = pendingRequests.length;

    // Count active today (logged in today)
    const today = new Date().toDateString();
    const activeToday = friends.filter(f => {
        const lastActive = new Date(f.lastActiveDate || 0).toDateString();
        return lastActive === today;
    }).length;
    document.getElementById('activeCount').textContent = activeToday;
}

// Switch tab
function switchTab(tab) {
    currentTab = tab;

    // Update buttons
    document.querySelectorAll('[id^="tab"]').forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
    });
    document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.remove('btn-secondary');
    document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.add('btn-primary');

    // Render appropriate list
    if (tab === 'all') {
        renderFriends();
    } else {
        renderPendingRequests();
    }
}

// Render friends list
function renderFriends() {
    const container = document.getElementById('friendsList');
    container.innerHTML = '';

    if (friends.length === 0) {
        container.innerHTML = `
            <div class="card text-center" style="padding: 48px;">
                <div style="font-size: 64px; margin-bottom: 16px;">😢</div>
                <h3 style="margin-bottom: 16px;">No friends yet</h3>
                <p class="text-muted" style="margin-bottom: 24px;">Add friends to compare progress and compete!</p>
                <button class="btn btn-primary" onclick="showAddFriendModal()">Add Your First Friend</button>
            </div>
        `;
        return;
    }

    friends.forEach(friend => {
        const card = document.createElement('div');
        card.className = 'card mb-2';

        const isActiveToday = new Date(friend.lastActiveDate || 0).toDateString() === new Date().toDateString();

        card.innerHTML = `
            <div class="flex-between">
                <div class="flex gap-3" style="align-items: center;">
                    <div style="position: relative;">
                        <img src="${friend.avatar}" alt="Avatar" 
                            style="width: 56px; height: 56px; border-radius: 50%; border: 2px solid var(--purple);">
                        ${isActiveToday ? '<div style="position: absolute; bottom: 0; right: 0; width: 16px; height: 16px; background: var(--green); border-radius: 50%; border: 2px solid var(--bg-card);"></div>' : ''}
                    </div>
                    <div>
                        <h4 style="margin-bottom: 4px;">${friend.name}</h4>
                        <div class="flex gap-2" style="margin: 8px 0;">
                            <div class="streak-flame" style="padding: 4px 12px; font-size: 12px;">
                                🔥 ${friend.streak || 0} day streak
                            </div>
                            <div class="league-badge league-${(friend.leagueTier || 'bronze').toLowerCase()}" 
                                style="padding: 4px 12px; font-size: 11px;">
                                ${friend.leagueTier || 'Bronze'}
                            </div>
                        </div>
                        <p class="text-muted" style="font-size: 12px;">
                            ${formatNumber(friend.xp || 0)} XP • Level ${friend.level || 1}
                        </p>
                    </div>
                </div>
                <div style="text-align: right;">
                    <button class="btn btn-secondary" onclick="viewFriendProfile('${friend._id || friend.id}')">
                        View Profile
                    </button>
                    <button class="btn" style="background: var(--red); margin-top: 8px;" onclick="removeFriend('${friend._id || friend.id}')">
                        Remove
                    </button>
                </div>
            </div>
        `;

        container.appendChild(card);
    });
}

// Render pending requests
function renderPendingRequests() {
    const container = document.getElementById('friendsList');
    container.innerHTML = '';

    if (pendingRequests.length === 0) {
        container.innerHTML = `
            <div class="card text-center" style="padding: 48px;">
                <p class="text-muted">No pending friend requests</p>
            </div>
        `;
        return;
    }

    pendingRequests.forEach(request => {
        const card = document.createElement('div');
        card.className = 'card mb-2';

        card.innerHTML = `
            <div class="flex-between">
                <div class="flex gap-3" style="align-items: center;">
                    <img src="${request.from?.avatar || request.avatar}" alt="Avatar" 
                        style="width: 56px; height: 56px; border-radius: 50%; border: 2px solid var(--purple);">
                    <div>
                        <h4 style="margin-bottom: 4px;">${request.from?.name || request.name}</h4>
                        <p class="text-muted" style="font-size: 12px;">
                            Sent ${new Date(request.sentAt).toLocaleDateString()}
                        </p>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button class="btn btn-success" onclick="acceptRequest('${request._id || request.id}')">
                        Accept
                    </button>
                    <button class="btn btn-secondary" onclick="rejectRequest('${request._id || request.id}')">
                        Decline
                    </button>
                </div>
            </div>
        `;

        container.appendChild(card);
    });
}

// Show add friend modal
function showAddFriendModal() {
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
        padding: 32px;
    `;

    modal.innerHTML = `
        <button onclick="closeModal()" style="position: absolute; top: 16px; right: 16px; background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-primary);">✕</button>
        <h2 style="margin-bottom: 24px;">Add Friend</h2>
        <input type="email" id="friendEmail" placeholder="Enter friend's email" style="margin-bottom: 16px;">
        <button class="btn btn-primary" onclick="sendFriendRequest()" style="width: 100%;">
            Send Request
        </button>
    `;

    document.body.appendChild(modal);

    // Add backdrop
    const backdrop = document.createElement('div');
    backdrop.id = 'modalBackdrop';
    backdrop.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 999;';
    backdrop.onclick = closeModal;
    document.body.appendChild(backdrop);
}

// Close modal
function closeModal() {
    const modal = document.querySelector('.card[style*="position: fixed"]');
    const backdrop = document.getElementById('modalBackdrop');
    if (modal) modal.remove();
    if (backdrop) backdrop.remove();
}

// Send friend request
async function sendFriendRequest() {
    const email = document.getElementById('friendEmail').value.trim();

    if (!email) {
        showToast('Please enter an email', 'error');
        return;
    }

    try {
        await apiCall('/friends/add', {
            method: 'POST',
            body: JSON.stringify({ email })
        });

        showToast('Friend request sent! 🎉', 'success');
        closeModal();
    } catch (error) {
        showToast(error.message || 'Failed to send request', 'error');
    }
}

// Accept friend request
async function acceptRequest(requestId) {
    try {
        await apiCall(`/friends/accept/${requestId}`, {
            method: 'POST'
        });

        showToast('Friend request accepted! 🎉', 'success');
        triggerConfetti();
        loadFriends();
    } catch (error) {
        showToast('Failed to accept request', 'error');
    }
}

// Reject friend request
async function rejectRequest(requestId) {
    try {
        await apiCall(`/friends/reject/${requestId}`, {
            method: 'POST'
        });

        showToast('Friend request declined', 'info');
        loadFriends();
    } catch (error) {
        showToast('Failed to decline request', 'error');
    }
}

// Remove friend
async function removeFriend(friendId) {
    if (!confirm('Are you sure you want to remove this friend?')) return;

    try {
        await apiCall(`/friends/${friendId}`, {
            method: 'DELETE'
        });

        showToast('Friend removed', 'info');
        loadFriends();
    } catch (error) {
        showToast('Failed to remove friend', 'error');
    }
}

// View friend profile
async function viewFriendProfile(friendId) {
    try {
        // Find friend data
        const friend = friends.find(f => (f._id || f.id) === friendId);
        if (!friend) {
            showToast('Friend not found', 'error');
            return;
        }

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'card';
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 1000;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            padding: 32px;
        `;

        const isActiveToday = new Date(friend.lastActiveDate || 0).toDateString() === new Date().toDateString();

        modal.innerHTML = `
            <button onclick="closeModal()" style="position: absolute; top: 16px; right: 16px; background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-primary);">✕</button>
            
            <div class="text-center mb-3">
                <div style="position: relative; display: inline-block;">
                    <img src="${friend.avatar}" alt="Avatar" 
                        style="width: 100px; height: 100px; border-radius: 50%; border: 3px solid var(--purple);">
                    ${isActiveToday ? '<div style="position: absolute; bottom: 5px; right: 5px; width: 24px; height: 24px; background: var(--green); border-radius: 50%; border: 3px solid var(--bg-card);"></div>' : ''}
                </div>
                <h2 style="margin-top: 16px; margin-bottom: 8px;">${friend.name}</h2>
                <p class="text-muted">${isActiveToday ? '🟢 Active now' : '⚫ Last active: ' + new Date(friend.lastActiveDate || 0).toLocaleDateString()}</p>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
                <div style="text-align: center; padding: 16px; background: var(--bg-secondary); border-radius: 12px;">
                    <div style="font-size: 32px; font-weight: 700; color: var(--purple);">${formatNumber(friend.xp || 0)}</div>
                    <div class="text-muted" style="font-size: 12px;">Total XP</div>
                </div>
                <div style="text-align: center; padding: 16px; background: var(--bg-secondary); border-radius: 12px;">
                    <div style="font-size: 32px; font-weight: 700; color: var(--blue);">${friend.level || 1}</div>
                    <div class="text-muted" style="font-size: 12px;">Level</div>
                </div>
                <div style="text-align: center; padding: 16px; background: var(--bg-secondary); border-radius: 12px;">
                    <div style="font-size: 32px; font-weight: 700; color: var(--orange);">🔥 ${friend.streak || 0}</div>
                    <div class="text-muted" style="font-size: 12px;">Day Streak</div>
                </div>
                <div style="text-align: center; padding: 16px; background: var(--bg-secondary); border-radius: 12px;">
                    <div class="league-badge league-${(friend.leagueTier || 'bronze').toLowerCase()}" style="font-size: 14px; padding: 8px 16px;">
                        ${friend.leagueTier || 'Bronze'}
                    </div>
                    <div class="text-muted" style="font-size: 12px; margin-top: 8px;">League</div>
                </div>
            </div>

            <div style="margin-bottom: 24px;">
                <h3 style="margin-bottom: 12px;">Learning Progress</h3>
                <div style="background: var(--bg-secondary); padding: 16px; border-radius: 12px;">
                    <p class="text-muted" style="margin-bottom: 8px;">Languages: ${friend.learningLanguages?.length || 0}</p>
                    <p class="text-muted" style="margin-bottom: 8px;">Current: ${friend.currentLanguage || 'Not set'}</p>
                    <p class="text-muted">Native: ${friend.nativeLanguage || 'Not set'}</p>
                </div>
            </div>

            <div style="display: flex; gap: 12px;">
                <button class="btn btn-primary" onclick="closeModal()" style="flex: 1;">Close</button>
                <button class="btn btn-secondary" onclick="sendMessage('${friend._id || friend.id}')" style="flex: 1;">
                    💬 Message (Coming Soon)
                </button>
            </div>
        `;

        document.body.appendChild(modal);

        // Add backdrop
        const backdrop = document.createElement('div');
        backdrop.id = 'modalBackdrop';
        backdrop.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 999;';
        backdrop.onclick = closeModal;
        document.body.appendChild(backdrop);

    } catch (error) {
        console.error('Failed to view profile:', error);
        showToast('Failed to load friend profile', 'error');
    }
}

function sendMessage(friendId) {
    showToast('Direct messaging coming soon!', 'info');
    closeModal();
}

// Go back
function goBack() {
    window.location.href = 'dashboard.html';
}

// Initialize
loadFriends();
