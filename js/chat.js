// We will use a hardcoded chat ID for testing the core mechanics.
// In production, this ID comes from the 'chats' table.
const GLOBAL_CHAT_ID = '00000000-0000-0000-0000-000000000000'; 
let currentUserProfile = null;

// Ensure the global chat exists in the DB so foreign keys don't fail
async function setupGlobalChat() {
    await supabaseClient.from('chats').upsert([{ id: GLOBAL_CHAT_ID, name: 'Global Chat' }]);
}

// Get the logged-in user's profile info
async function loadUserProfile(userId) {
    const { data } = await supabaseClient.from('profiles').select('*').eq('id', userId).single();
    currentUserProfile = data;
}

// Render a single message to the screen
function displayMessage(messageData, username = "Unknown") {
    const chatWindow = document.getElementById('chat-window');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message';
    msgDiv.innerHTML = `<strong>${username}:</strong> ${messageData.content}`;
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight; // Auto-scroll to bottom
}

// Fetch past messages on load
async function loadMessages() {
    const { data: messages } = await supabaseClient
        .from('messages')
        .select(`content, profiles(username)`)
        .eq('chat_id', GLOBAL_CHAT_ID)
        .order('created_at', { ascending: true });

    if (messages) {
        messages.forEach(msg => {
            // Supabase joins the profiles table automatically here
            displayMessage(msg, msg.profiles.username);
        });
    }
}

// Subscribe to REALTIME new messages
function subscribeToMessages() {
    supabaseClient
        .channel('public:messages')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${GLOBAL_CHAT_ID}` },
            async (payload) => {
                // Fetch the username of the person who just sent this
                const { data: sender } = await supabaseClient
                    .from('profiles')
                    .select('username')
                    .eq('id', payload.new.sender_id)
                    .single();
                
                displayMessage(payload.new, sender.username);
            }
        )
        .subscribe();
}

// Handle sending a new message
document.getElementById('send-btn').addEventListener('click', async () => {
    const input = document.getElementById('message-input');
    const content = input.value.trim();
    if (!content || !currentUserProfile) return;

    input.value = ''; // Clear input immediately

    await supabaseClient.from('messages').insert([{
        chat_id: GLOBAL_CHAT_ID,
        sender_id: currentUserProfile.id,
        content: content
    }]);
});

// Hook into app.js - this function runs when user successfully logs in
async function initChatSystem() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;

    await setupGlobalChat();
    await loadUserProfile(session.user.id);
    document.getElementById('chat-window').innerHTML = ''; // Clear window
    await loadMessages();
    subscribeToMessages();
}