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
    const appContainer = document.getElementById('app-container');
    
    // Safety check in case elements haven't loaded yet
    if (!authContainer || !appContainer) return;

    // Ask Supabase if a user is currently logged in
    const { data: { session }, error } = await window.supabaseClient.auth.getSession();
    
    if (error) {
        console.error("Error checking session:", error.message);
        return;
    }

    if (session) {
        // User is logged in: Hide login form, show the messenger
        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        
        // If the chat system initialization function exists (from chat.js), run it
        if (typeof initChatSystem === 'function') {
            initChatSystem();
        }
    } else {
        // User is logged out: Show login form, hide the messenger
        authContainer.classList.remove('hidden');
        appContainer.classList.add('hidden');
    }
};

// 3. Run the session check automatically as soon as the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.checkSession();
});
