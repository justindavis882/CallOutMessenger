// DOM Elements
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authError = document.getElementById('auth-error');

const setupUsernameInput = document.getElementById('setup-username');
const setupError = document.getElementById('setup-error');

// --- STEP 1: AUTHENTICATION ---

// Handle Sign Up
document.getElementById('signup-btn').addEventListener('click', async () => {
    authError.textContent = ""; // clear previous errors
    
    const { error } = await window.supabaseClient.auth.signUp({
        email: emailInput.value,
        password: passwordInput.value,
    });

    if (error) {
        authError.textContent = error.message;
    } else {
        // With email confirmations turned off, signUp instantly logs them in.
        // Calling checkSession will now automatically route them to the profile setup screen.
        window.checkSession();
    }
});

// Handle Log In
document.getElementById('login-btn').addEventListener('click', async () => {
    authError.textContent = "";

    const { error } = await window.supabaseClient.auth.signInWithPassword({
        email: emailInput.value,
        password: passwordInput.value,
    });

    if (error) {
        authError.textContent = error.message;
    } else {
        window.checkSession();
    }
});

// Handle Log Out
document.getElementById('logout-btn').addEventListener('click', async () => {
    await window.supabaseClient.auth.signOut();
    window.checkSession(); 
});


// --- STEP 2: PROFILE SETUP ---

// Handle creating the username after successful authentication
document.getElementById('save-profile-btn').addEventListener('click', async () => {
    setupError.textContent = "";
    const username = setupUsernameInput.value.trim();

    if (!username) {
        setupError.textContent = "Please enter a username.";
        return;
    }

    // Get the current user ID securely from the active session
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    
    if (!session) return; 

    // Insert the new profile into the database
    const { error } = await window.supabaseClient
        .from('profiles')
        .insert([{ id: session.user.id, username: username }]);

    if (error) {
        // If they pick a username that already exists, Supabase will throw an error here 
        // because of the "UNIQUE" constraint we put on the profiles table.
        if (error.code === '23505') { 
            setupError.textContent = "That username is already taken!";
        } else {
            setupError.textContent = "Error saving profile: " + error.message;
        }
    } else {
        // Profile saved successfully! Run checkSession to push them into the chat.
        window.checkSession();
    }
});