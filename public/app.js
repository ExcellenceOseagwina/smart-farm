/**
 * app.js - Frontend Logic for Smart Farm Monitoring System
 * Handles Authentication, Navigation Guards, and Fuzzy Logic API requests.
 */

// --- 1. AUTHENTICATION UI TOGGLE ---
function toggleAuth() {
    const loginBox = document.getElementById('login-box');
    const registerBox = document.getElementById('register-box');
    if (loginBox && registerBox) {
        loginBox.classList.toggle('hidden');
        registerBox.classList.toggle('hidden');
    }
}

// --- 2. SIGNUP LOGIC ---
async function handleSignup() {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-pass').value;

    if (!name || !email || !password) {
        alert("Please fill in all fields.");
        return;
    }

    const { data, error } = await _supabase.auth.signUp({
        email,
        password,
        options: {
            data: { full_name: name } // Stores the name in Supabase Auth Metadata
        }
    });

    if (error) alert(error.message);
    else alert("Signup successful! Please log in.");
}

// --- 3. LOGIN LOGIC ---
async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-pass').value;

    const { data, error } = await _supabase.auth.signInWithPassword({ email, password });

    if (error) alert(error.message);
    else window.location.href = 'dashboard.html';
}

// --- 4. LOGOUT FUNCTION ---
async function logout() {
    try {
        await _supabase.auth.signOut();
        localStorage.clear();
        window.location.href = 'auth.html';
    } catch (err) {
        console.error("Logout failed:", err);
        alert("Logout failed");
    }
}

// --- 5. DASHBOARD: FETCH AND DISPLAY HISTORY ---
async function loadHistory() {
    try {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) return;

        // Fetch records from the 'monitoring_records' table in Supabase
        const { data, error } = await _supabase
            .from('monitoring_records')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const tableBody = document.getElementById('history-body');
        if (!tableBody) return;

        tableBody.innerHTML = ""; // Clear existing table rows

        data.forEach(record => {
            const row = `
                <tr>
                    <td>${new Date(record.created_at).toLocaleDateString()}</td>
                    <td>${record.soil_moisture}%</td>
                    <td>${record.temperature}°C</td>
                    <td>${record.humidity}%</td>
                    <td><span class="table-status">${record.system_status}</span></td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });

    } catch (err) {
        console.error("Error loading history:", err.message);
    }
}

// --- 6. RUN ANALYSIS (FUZZY LOGIC API CALL) ---
async function runAnalysis() {
    const m = document.getElementById('moisture').value;
    const t = document.getElementById('temp').value;
    const h = document.getElementById('humidity').value;

    if (!m || !t || !h) {
        alert("Please fill in all environmental fields.");
        return;
    }

    try {
        const { data: { user } } = await _supabase.auth.getUser();

        /**
         * 🚀 UPDATED FOR DEPLOYMENT:
         * We use the relative path '/api/analyze'. 
         * This works on Port 3000 locally and automatically adapts to your Render URL.
         */
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: user.id,
                moisture: parseFloat(m),
                temp: parseFloat(t),
                humidity: parseFloat(h)
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Backend Error");
        }

        const result = await response.json();
        
        // Display result in the result card
        document.getElementById('status-out').innerText = result.status;
        document.getElementById('rec-out').innerText = result.recommendation;

        // Automatically refresh the history table to show the new record
        loadHistory();

    } catch (err) {
        console.error("Analysis Error:", err);
        alert("Connection Error: Make sure your Node.js server is running.");
    }
}

// --- 7. INITIALIZE PAGE & NAVIGATION GUARDS ---
window.onload = async () => {
    const { data: { user } } = await _supabase.auth.getUser();
    const path = window.location.pathname;

    // Security Guard: Prevent logged-out users from seeing the dashboard
    if (!user && !path.includes("auth.html") && !path.includes("index.html") && path !== "/") {
        window.location.href = "auth.html";
        return;
    }

    // Redirect Guard: Prevent logged-in users from seeing the login page
    if (user && path.includes("auth.html")) {
        window.location.href = "dashboard.html";
        return;
    }

    // If we are on the dashboard, personalize and load data
    if (user && path.includes("dashboard.html")) {
        const fullName = user.user_metadata.full_name || "Farmer";
        document.getElementById('display-name').innerText = fullName;
        loadHistory();
    }

    // Landing Page Redirect Logic: Handle "Create New Account" from index.html
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'signup') {
        const loginBox = document.getElementById('login-box');
        const registerBox = document.getElementById('register-box');
        if(loginBox && registerBox) {
            loginBox.classList.add('hidden');
            registerBox.classList.remove('hidden');
        }
    }
};