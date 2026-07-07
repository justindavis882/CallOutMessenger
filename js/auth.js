// DOM Elements
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const usernameInput = document.getElementById('username');
const authError = document.getElementById('auth-error');

// Handle Sign Up
document.getElementById('signup-btn').addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    const username = usernameInput.value;

    if (!username) return authError.textContent = "Username required for sign up.";

    // 1. Create user in Supabase Auth
    const { data: authData, error: authErr } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
    });

    if (authErr) {
        authError.textContent = authErr.message;
        return;
    }

    // 2. Add them to our public profiles table
    const { error: profileErr } = await supabaseClient
        .from('profiles')
        .insert([{ id: authData.user.id, username: username }]);

    if (profileErr) {
        authError.textContent = "Error saving profile: " + profileErr.message;
    } else {
        alert("Sign up successful! You can now log in.");
    }
});

// Handle Log In
document.getElementById('login-btn').addEventListener('click', async () => {
    const { error } = await supabaseClient.auth.signInWithPassword({
        email: emailInput.value,
        password: passwordInput.value,
    });

    if (error) authError.textContent = error.message;
    else checkSession(); // Reloads UI state from app.js
});

// Handle Log Out
document.getElementById('logout-btn').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    checkSession(); 
});
