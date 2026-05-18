// Replace with your keys
const SB_URL = "https://nuqbymedtideqtrcnljg.supabase.co";
const SB_KEY = "sb_publishable_WkMCQzXhucA4u5w9kqUVJA_BAMucHqj";

// Initialize Supabase once
const _supabase = supabase.createClient(SB_URL, SB_KEY);

// Helper to check if user is logged in
async function checkUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user && !window.location.href.includes('auth.html')) {
        window.location.href = 'auth.html';
    }
    return user;
}

// Global Logout function
async function logout() {
    await _supabase.auth.signOut();
    localStorage.clear();
    window.location.href = 'auth.html';
}