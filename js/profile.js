const profileContainer = document.getElementById('profile-container');
const appContainer = document.getElementById('app-container');
const openProfileBtn = document.getElementById('open-profile-btn');
const closeProfileBtn = document.getElementById('close-profile-btn');
const themePicker = document.getElementById('theme-picker');
const saveProfileBtn = document.getElementById('save-profile-btn');
const profileMessage = document.getElementById('profile-message');

// --- NEW AVATAR ELEMENTS ---
const avatarUpload = document.getElementById('avatar-upload');
const avatarPreview = document.getElementById('avatar-preview');

// Live preview the color
themePicker.addEventListener('input', (e) => {
    document.documentElement.style.setProperty('--theme-accent', e.target.value);
});

// Open Profile Screen
openProfileBtn.addEventListener('click', () => {
    appContainer.classList.add('hidden');
    profileContainer.classList.remove('hidden');
    profileMessage.textContent = '';
    
    if (currentUserProfile && currentUserProfile.theme_color) {
        themePicker.value = currentUserProfile.theme_color;
    }
    
    // --- NEW: Load avatar preview if it exists ---
    if (currentUserProfile && currentUserProfile.avatar_url) {
        avatarPreview.src = currentUserProfile.avatar_url;
    }
});

// Close Profile Screen
closeProfileBtn.addEventListener('click', () => {
    profileContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');
    
    if (currentUserProfile && currentUserProfile.theme_color) {
        document.documentElement.style.setProperty('--theme-accent', currentUserProfile.theme_color);
    }
});

// Save Theme Color
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
        currentUserProfile.theme_color = newColor; 
    }
});

// --- NEW: Handle Avatar File Upload ---
avatarUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    profileMessage.style.color = "white";
    profileMessage.textContent = "Uploading avatar...";

    // 1. Create a unique path (UserId / Timestamp to bypass browser caching)
    const fileExt = file.name.split('.').pop();
    const filePath = `${currentUserProfile.id}/avatar-${Date.now()}.${fileExt}`;

    // 2. Upload to Supabase Storage
    const { error: uploadError } = await window.supabaseClient.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

    if (uploadError) {
        profileMessage.style.color = "#ffcccc";
        return profileMessage.textContent = "Upload failed: " + uploadError.message;
    }

    // 3. Get the public URL
    const { data: { publicUrl } } = window.supabaseClient.storage
        .from('avatars')
        .getPublicUrl(filePath);

    // 4. Save to profiles table
    const { error: updateError } = await window.supabaseClient
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', currentUserProfile.id);

    if (updateError) {
        profileMessage.style.color = "#ffcccc";
        profileMessage.textContent = "Error saving avatar link.";
    } else {
        profileMessage.style.color = "#ccffcc";
        profileMessage.textContent = "Avatar updated!";
        currentUserProfile.avatar_url = publicUrl; // Update local state
        avatarPreview.src = publicUrl; // Update UI
    }
});