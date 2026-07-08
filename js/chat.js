let currentUserProfile = null;
let activeChatId = null;
let realtimeSubscription = null;

// Grab DOM elements
const searchInput = document.getElementById('user-search');
const searchBtn = document.getElementById('search-btn');
const searchError = document.getElementById('search-error');
const chatArea = document.getElementById('chat-area');
const chatWindow = document.getElementById('chat-window');
const activeChatName = document.getElementById('active-chat-name');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const contactsList = document.getElementById('contacts-list'); // NEW

// 1. Initialize System
window.initChatSystem = async function() {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session) return;

    const { data } = await window.supabaseClient.from('profiles').select('*').eq('id', session.user.id).single();
    currentUserProfile = data;
    
    // Apply user's saved theme color
    if (currentUserProfile.theme_color) {
        document.documentElement.style.setProperty('--theme-accent', currentUserProfile.theme_color);
    }
    
    // NEW: Ask for notification permission
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
    
    await loadRecentContacts(); 
}

// 2. NEW: Fetch and display recent contacts
async function loadRecentContacts() {
    contactsList.innerHTML = ''; // Clear list

    // Step A: Find all chat IDs the current user is in
    const { data: myMemberships } = await window.supabaseClient
        .from('chat_members')
        .select('chat_id')
        .eq('user_id', currentUserProfile.id);

    if (!myMemberships || myMemberships.length === 0) return;
    
    const chatIds = myMemberships.map(m => m.chat_id);

    // Step B: Find the OTHER users in those exact chats
    const { data: otherMembers } = await window.supabaseClient
        .from('chat_members')
        .select(`chat_id, profiles (id, username)`)
        .in('chat_id', chatIds)
        .neq('user_id', currentUserProfile.id);

    if (!otherMembers) return;

    // Step C: Render them to the sidebar
    otherMembers.forEach(member => {
        const contactUser = member.profiles;
        const card = document.createElement('div');
        card.className = 'contact-card';
        card.textContent = contactUser.username;
        
        // When clicked, open the DM and highlight the card
        card.addEventListener('click', () => {
            document.querySelectorAll('.contact-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            openDirectMessage(contactUser, member.chat_id);
        });

        contactsList.appendChild(card);
    });
}

// 3. Search for a new user
searchBtn.addEventListener('click', async () => {
    searchError.textContent = "";
    const targetUsername = searchInput.value.trim();
    
    if (!targetUsername) return;
    if (targetUsername === currentUserProfile.username) {
        return searchError.textContent = "You can't message yourself!";
    }

    const { data: targetUser, error } = await window.supabaseClient
        .from('profiles')
        .select('id, username')
        .eq('username', targetUsername)
        .single();

    if (error || !targetUser) return searchError.textContent = "User not found.";

    searchInput.value = "";
    await openDirectMessage(targetUser, null);
    await loadRecentContacts(); // Refresh list after starting a new chat
});

// 4. Open a Direct Message (Updated to accept a known chat ID)
async function openDirectMessage(targetUser, knownChatId) {
    if (knownChatId) {
        activeChatId = knownChatId;
    } else {
        const { data: myChats } = await window.supabaseClient.from('chat_members').select('chat_id').eq('user_id', currentUserProfile.id);
        const { data: targetChats } = await window.supabaseClient.from('chat_members').select('chat_id').eq('user_id', targetUser.id);

        const sharedChatId = myChats.map(c => c.chat_id).find(id => targetChats.map(c => c.chat_id).includes(id));

        if (sharedChatId) {
            activeChatId = sharedChatId;
        } else {
            const { data: newChat } = await window.supabaseClient.from('chats').insert([{}]).select().single();
            activeChatId = newChat.id;
            await window.supabaseClient.from('chat_members').insert([
                { chat_id: activeChatId, user_id: currentUserProfile.id },
                { chat_id: activeChatId, user_id: targetUser.id }
            ]);
        }
    }

    activeChatName.textContent = `Chatting with ${targetUser.username}`;
    chatArea.classList.remove('hidden');
    await loadMessages();
    subscribeToActiveChat();
}

// 5. Render a message to the screen
function displayMessage(content, username, avatarUrl) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message';
    
    // Provide a fallback image if they haven't uploaded one
    const safeAvatar = avatarUrl || 'https://via.placeholder.com/30?text=U';

    if (username === currentUserProfile.username) {
        msgDiv.innerHTML = `${content} <span style="color: #a8c0ff;"><strong> :You</strong></span> <img src="${safeAvatar}" class="chat-avatar" style="margin-left: 8px; margin-right: 0;">`;
        msgDiv.style.textAlign = "right";
    } else {
        msgDiv.innerHTML = `<img src="${safeAvatar}" class="chat-avatar"> <strong>${username}:</strong> ${content}`;
    }

    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// 6. Load past messages
async function loadMessages() {
    chatWindow.innerHTML = ''; 
    const { data: messages } = await window.supabaseClient
        .from('messages')
        .select(`content, profiles(username, avatar_url)`)
        .eq('chat_id', activeChatId)
        .order('created_at', { ascending: true });

    if (messages) messages.forEach(msg => displayMessage(msg.content, msg.profiles.username));
}

// 7. Realtime Subscription
function subscribeToActiveChat() {
    if (realtimeSubscription) window.supabaseClient.removeChannel(realtimeSubscription);

    realtimeSubscription = window.supabaseClient
        .channel(`chat-${activeChatId}`)
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${activeChatId}` },
            async (payload) => {
                const { data: sender } = await window.supabaseClient.from('profiles').select('username').eq('id', payload.new.sender_id).single();
                
                // Display the message in the UI
                displayMessage(payload.new.content, sender.username, sender.avatar_url);

                // NEW: Send an OS notification if the user is looking at another tab/app
                if (document.hidden && Notification.permission === "granted") {
                    new Notification(`New message from ${sender.username}`, {
                        body: payload.new.content,
                        // Optional: add a path to an icon image here later
                        // icon: '/assets/icon.png' 
                    });
                }
            }
        )
        .subscribe();
}

// 8. Send a message
sendBtn.addEventListener('click', async () => {
    const content = messageInput.value.trim();
    if (!content || !activeChatId || !currentUserProfile) return;

    messageInput.value = ''; 
    await window.supabaseClient.from('messages').insert([{
        chat_id: activeChatId,
        sender_id: currentUserProfile.id,
        content: content
    }]);
});

messageInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') sendBtn.click();
});