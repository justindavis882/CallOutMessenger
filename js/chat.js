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

// 1. Initialize System (Called from app.js)
window.initChatSystem = async function() {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session) return;

    // Load the logged-in user's profile
    const { data } = await window.supabaseClient.from('profiles').select('*').eq('id', session.user.id).single();
    currentUserProfile = data;
}

// 2. Search for a user and start a DM
searchBtn.addEventListener('click', async () => {
    searchError.textContent = "";
    const targetUsername = searchInput.value.trim();
    
    if (!targetUsername) return;
    if (targetUsername === currentUserProfile.username) {
        return searchError.textContent = "You can't message yourself!";
    }

    // Find the target user in the database
    const { data: targetUser, error } = await window.supabaseClient
        .from('profiles')
        .select('id, username')
        .eq('username', targetUsername)
        .single();

    if (error || !targetUser) {
        return searchError.textContent = "User not found.";
    }

    searchInput.value = ""; // Clear search
    await openDirectMessage(targetUser);
});

// 3. The Core DM Logic: Find or Create a Chat Room
async function openDirectMessage(targetUser) {
    // Look for existing chats that the logged-in user is a part of
    const { data: myChats } = await window.supabaseClient.from('chat_members').select('chat_id').eq('user_id', currentUserProfile.id);
    
    // Look for existing chats that the target user is a part of
    const { data: targetChats } = await window.supabaseClient.from('chat_members').select('chat_id').eq('user_id', targetUser.id);

    // Find the intersection (a chat room they both share)
    const myChatIds = myChats.map(c => c.chat_id);
    const targetChatIds = targetChats.map(c => c.chat_id);
    const sharedChatId = myChatIds.find(id => targetChatIds.includes(id));

    if (sharedChatId) {
        // Chat exists! Load it.
        activeChatId = sharedChatId;
    } else {
        // No chat exists. Create a new one.
        const { data: newChat } = await window.supabaseClient.from('chats').insert([{}]).select().single();
        activeChatId = newChat.id;

        // Add both users to the new chat
        await window.supabaseClient.from('chat_members').insert([
            { chat_id: activeChatId, user_id: currentUserProfile.id },
            { chat_id: activeChatId, user_id: targetUser.id }
        ]);
    }

    // Update UI and load messages
    activeChatName.textContent = `Chatting with ${targetUser.username}`;
    chatArea.classList.remove('hidden');
    await loadMessages();
    subscribeToActiveChat();
}

// 4. Render a message to the screen
function displayMessage(content, username) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message';
    
    // Style differently if I sent it vs if they sent it
    if (username === currentUserProfile.username) {
        msgDiv.innerHTML = `<span style="color: #a8c0ff;"><strong>You:</strong></span> ${content}`;
        msgDiv.style.textAlign = "right";
    } else {
        msgDiv.innerHTML = `<strong>${username}:</strong> ${content}`;
    }

    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// 5. Load past messages for this specific chat
async function loadMessages() {
    chatWindow.innerHTML = ''; // Clear old messages

    const { data: messages } = await window.supabaseClient
        .from('messages')
        .select(`content, profiles(username)`)
        .eq('chat_id', activeChatId)
        .order('created_at', { ascending: true });

    if (messages) {
        messages.forEach(msg => displayMessage(msg.content, msg.profiles.username));
    }
}

// 6. Realtime Subscription (Only listen to the active chat)
function subscribeToActiveChat() {
    // Remove previous subscription if we switched chats
    if (realtimeSubscription) window.supabaseClient.removeChannel(realtimeSubscription);

    realtimeSubscription = window.supabaseClient
        .channel(`chat-${activeChatId}`)
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${activeChatId}` },
            async (payload) => {
                // Ignore messages we just sent (they are already in the DB, but we want to fetch the username)
                const { data: sender } = await window.supabaseClient.from('profiles').select('username').eq('id', payload.new.sender_id).single();
                displayMessage(payload.new.content, sender.username);
            }
        )
        .subscribe();
}

// 7. Send a message
sendBtn.addEventListener('click', async () => {
    const content = messageInput.value.trim();
    if (!content || !activeChatId || !currentUserProfile) return;

    messageInput.value = ''; // Clear input immediately for snappy UX

    await window.supabaseClient.from('messages').insert([{
        chat_id: activeChatId,
        sender_id: currentUserProfile.id,
        content: content
    }]);
});

// Allow hitting "Enter" to send
messageInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') sendBtn.click();
});