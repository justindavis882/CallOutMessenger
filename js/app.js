// 1. Replace these with your actual Supabase Project credentials
// You can find these in your Supabase Dashboard under: Project Settings -> API
const SUPABASE_URL = 'https://fslvxkhdzeetdfcdblmj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzbHZ4a2hkemVldGRmY2RibG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0NDQ5ODgsImV4cCI6MjA5OTAyMDk4OH0.IVSFFNfp7Trvr3erbGJKvXj3EuA-PWYn66ee0iaX4Lk';

// 2. Initialize the Supabase client and attach it to the global window object
// This ensures js/auth.js and js/chat.js can freely use 'supabaseClient'
window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Global function to check the user's current login session
 * and toggle the UI elements seamlessly.
 */
window.checkSession = async function() {
    const authContainer = document.getElementById('auth-container');
    const setupContainer = document.getElementById('profile-setup-container');
    const appContainer = document.getElementById('app-container');
    
    if (!authContainer || !appContainer || !setupContainer) return;

    // 1. Check if user has an active Auth session
    const { data: { session }, error } = await window.supabaseClient.auth.getSession();
    
    if (error) {
        console.error("Session error:", error.message);
        return;
    }

    if (session) {
        // 2. User is authenticated. Now, do they have a profile?
        const { data: profile } = await window.supabaseClient
            .from('profiles')
            .select('username')
            .eq('id', session.user.id)
            .single();

        if (!profile) {
            // State: Logged In, but needs to pick a username
            authContainer.classList.add('hidden');
            appContainer.classList.add('hidden');
            setupContainer.classList.remove('hidden');
        } else {
            // State: Logged In, profile exists. Go to chat!
            authContainer.classList.add('hidden');
            setupContainer.classList.add('hidden');
            appContainer.classList.remove('hidden');
            
            if (typeof initChatSystem === 'function') {
                initChatSystem();
            }
        }
    } else {
        // State: Logged Out
        setupContainer.classList.add('hidden');
        appContainer.classList.add('hidden');
        authContainer.classList.remove('hidden');
    }
};

// 3. Run the session check automatically as soon as the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.checkSession();
});
