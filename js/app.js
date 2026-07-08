// --- GLOBAL VARIABLES ---
// These are now accessible to all your JS files
window.authContainer = document.getElementById('auth-container');
window.setupContainer = document.getElementById('profile-setup-container');
window.appContainer = document.getElementById('app-container');

// 1. Replace these with your actual Supabase Project credentials
// You can find these in your Supabase Dashboard under: Project Settings -> API
const SUPABASE_URL = 'https://fslvxkhdzeetdfcdblmj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzbHZ4a2hkemVldGRmY2RibG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0NDQ5ODgsImV4cCI6MjA5OTAyMDk4OH0.IVSFFNfp7Trvr3erbGJKvXj3EuA-PWYn66ee0iaX4Lk';

window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Now update the checkSession function to use the global window variables
window.checkSession = async function() {
    if (!window.authContainer || !window.appContainer || !window.setupContainer) return;

    const { data: { session }, error } = await window.supabaseClient.auth.getSession();
    
    if (session) {
        const { data: profile } = await window.supabaseClient
            .from('profiles')
            .select('username')
            .eq('id', session.user.id)
            .single();

        if (!profile) {
            window.authContainer.classList.add('hidden');
            window.appContainer.classList.add('hidden');
            window.setupContainer.classList.remove('hidden');
        } else {
            window.authContainer.classList.add('hidden');
            window.setupContainer.classList.add('hidden');
            window.appContainer.classList.remove('hidden');
            
            if (typeof initChatSystem === 'function') {
                initChatSystem();
            }
        }
    } else {
        window.setupContainer.classList.add('hidden');
        window.appContainer.classList.add('hidden');
        window.authContainer.classList.remove('hidden');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.checkSession();
});