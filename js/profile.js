const profileContainer = document.getElementById('profile-container');
const appContainer = document.getElementById('app-container');
const openProfileBtn = document.getElementById('open-profile-btn');
const closeProfileBtn = document.getElementById('close-profile-btn');
const themePicker = document.getElementById('theme-picker');
const saveProfileBtn = document.getElementById('save-profile-btn');
const profileMessage = document.getElementById('profile-message');

// Live preview the color as the user drags the picker
themePicker.addEventListener('input', (e) => {
    document.documentElement.style.setProperty('--theme-accent', e.target.value);
});

// Open Profile Screen
openProfileBtn.addEventListener('click', () => {
    appContainer.classList.add('hidden');
    profileContainer.classList.remove('hidden');
    profileMessage.textContent = '';
    
    // Set the picker to their currently saved color
    if (currentUserProfile && currentUserProfile.theme_color) {
        themePicker.value = currentUserProfile.theme_color;
    }
});

// Close Profile Screen
closeProfileBtn.addEventListener('click', () => {
    profileContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');
    
    // Revert preview if they didn't hit save
    if (currentUserProfile && currentUserProfile.theme_color) {
        document.documentElement.style.setProperty('--theme-accent', currentUserProfile.theme_color);
    }
});

// Save Changes
saveProfileBtn.addEventListener('click', async () => {
    profileMessage.style.color = "white";
    profileMessage.textContent = "Saving...";
    
    const newColor = themePicker.value;

    const { error } = await window.supabaseClient
        .from('profiles')
        .update({ theme_color: newColor })
        .eq('id', currentUserProfile.id);

    if (error) {
        profileMessage.style.color = "#ffcccc";
        profileMessage.textContent = "Error saving profile.";
    } else {
        profileMessage.style.color = "#ccffcc";
        profileMessage.textContent = "Profile updated!";
        currentUserProfile.theme_color = newColor; // Update local state
    }
});