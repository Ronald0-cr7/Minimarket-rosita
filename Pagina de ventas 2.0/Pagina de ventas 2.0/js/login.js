const ACCESS_FLAG_KEY = 'novagest-auth';
const USER_ROLE_KEY = 'novagest-role';
const USER_EMAIL_KEY = 'novagest-email';
const USER_ID_KEY = 'novagest-user-id';
const ROLE_ADMIN = 'admin';
const ROLE_CLIENT = 'cliente';
const SUPABASE_URL = 'https://goidjlsaxfzxzlgqvuik.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvaWRqbHNheGZ6eHpsZ3F2dWlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNDM4NjYsImV4cCI6MjA5NjcxOTg2Nn0.Znwtt52qDkvoSCqtdEerJNKThrcFMKqV-B5IB7ZOKCw';
const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginForm = document.querySelector('.login-form');
const loginStatus = document.getElementById('loginStatus');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const registerClientButton = document.getElementById('registerClientButton');

const users = [
    { email: 'admin@gmail.com', password: 'administrador2026', role: ROLE_ADMIN }
];

function isSupabaseConfigured() {
    const urlOk = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(SUPABASE_URL);
    const keyOk = SUPABASE_ANON_KEY.length > 20;
    return Boolean(supabaseClient) && urlOk && keyOk;
}

function setStatus(message, isError = true) {
    loginStatus.textContent = message;
    loginStatus.classList.add('is-visible');
    loginStatus.classList.toggle('is-error', isError);
}

function clearStatus() {
    loginStatus.textContent = '';
    loginStatus.classList.remove('is-visible', 'is-error');
}

function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
}

function mapDbErrorToMessage(error, fallbackMessage) {
    const message = String(error?.message || '').toLowerCase();

    if (message.includes('duplicate key') || message.includes('unique')) {
        return 'Ese correo ya está registrado. Inicia sesión.';
    }

    if (message.includes('permission denied') || message.includes('row-level security') || message.includes('rls')) {
        return 'No hay permisos para registrar o leer clientes. Revisa las policies de Supabase.';
    }

    if (message.includes('relation') && message.includes('clientes')) {
        return 'No existe la tabla clientes. Crea la tabla en Supabase.';
    }

    return fallbackMessage;
}

async function getClientByEmail(email) {
    const { data, error } = await supabaseClient
        .from('clientes')
        .select('id,correo,contrasena')
        .eq('correo', email)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data || null;
}

async function registerClient() {
    clearStatus();

    const email = normalizeEmail(loginEmail.value);
    const password = loginPassword.value;

    if (!email || !password) {
        setStatus('Ingresa correo y contraseña para registrarte.', true);
        return;
    }

    if (password.length < 6) {
        setStatus('La contraseña debe tener al menos 6 caracteres.', true);
        return;
    }

    if (!isSupabaseConfigured()) {
        setStatus('Supabase no está configurado en el login.', true);
        return;
    }

    try {
        const existingClient = await getClientByEmail(email);
        if (existingClient) {
            setStatus('Ese correo ya está registrado. Inicia sesión.', true);
            return;
        }

        const { error } = await supabaseClient
            .from('clientes')
            .insert({ correo: email, contrasena: password });

        if (error) {
            setStatus(mapDbErrorToMessage(error, 'No se pudo registrar el cliente.'), true);
            return;
        }

        setStatus('Cuenta creada. Ahora ya puedes iniciar sesión.', false);
    } catch (error) {
        setStatus(mapDbErrorToMessage(error, 'No se pudo registrar el cliente.'), true);
    }
}

async function loginUser(event) {
    event.preventDefault();
    clearStatus();

    const email = normalizeEmail(loginEmail.value);
    const password = loginPassword.value;

    const adminUser = users.find((item) => item.email === email && item.password === password);
    if (adminUser) {
        sessionStorage.setItem(ACCESS_FLAG_KEY, 'ok');
        sessionStorage.setItem(USER_ROLE_KEY, adminUser.role);
        sessionStorage.setItem(USER_EMAIL_KEY, adminUser.email);
        sessionStorage.removeItem(USER_ID_KEY);
        window.location.href = 'panel.html';
        return;
    }

    try {
        if (!isSupabaseConfigured()) {
            setStatus('Supabase no está configurado en el login.', true);
            return;
        }

        const client = await getClientByEmail(email);
        if (!client || String(client.contrasena || '') !== password) {
            setStatus('Credenciales inválidas. Intenta nuevamente.', true);
            return;
        }

        sessionStorage.setItem(ACCESS_FLAG_KEY, 'ok');
        sessionStorage.setItem(USER_ROLE_KEY, ROLE_CLIENT);
        sessionStorage.setItem(USER_EMAIL_KEY, email);
        sessionStorage.setItem(USER_ID_KEY, String(client.id || ''));
        window.location.href = 'panel.html';
    } catch (error) {
        setStatus(mapDbErrorToMessage(error, 'No se pudo iniciar sesión.'), true);
    }
}

if (sessionStorage.getItem(ACCESS_FLAG_KEY) === 'ok' && sessionStorage.getItem(USER_ROLE_KEY)) {
    window.location.href = 'panel.html';
}

loginForm?.addEventListener('submit', loginUser);

registerClientButton?.addEventListener('click', async () => {
    try {
        await registerClient();
    } catch (error) {
        setStatus(error.message || 'No se pudo registrar el cliente.', true);
    }
});

// ===== THEME TOGGLE FUNCTIONALITY =====
const THEME_STORAGE_KEY = 'novagest-theme';

function initTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'dark';
    applyTheme(savedTheme);
}

function applyTheme(theme) {
    const body = document.body;
    const themeButton = document.getElementById('themeToggleButton');
    
    if (theme === 'light') {
        body.classList.add('light-theme');
        if (themeButton) themeButton.textContent = '🌙';
    } else {
        body.classList.remove('light-theme');
        if (themeButton) themeButton.textContent = '☀️';
    }
    
    localStorage.setItem(THEME_STORAGE_KEY, theme);
}

function toggleTheme() {
    const body = document.body;
    const isLightTheme = body.classList.contains('light-theme');
    const newTheme = isLightTheme ? 'dark' : 'light';
    applyTheme(newTheme);
}

// Inicializar tema cuando carga la página
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    
    const themeButton = document.getElementById('themeToggleButton');
    if (themeButton) {
        themeButton.addEventListener('click', toggleTheme);
    }
});