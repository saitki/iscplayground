// Constantes y variables
const API_URL = 'http://localhost:4000'; // Cambia esto según tu configuración
let currentUser = null;

// Elementos del DOM
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('loginButton');
const messageElement = document.getElementById('message');

// Verificar si ya hay una sesión activa
checkSession();

// Event listeners
if (loginForm) {
  loginForm.addEventListener('submit', handleLogin);
}

/**
 * Maneja el inicio de sesión del usuario
 * @param {Event} e - Evento de formulario
 */
async function handleLogin(e) {
  e.preventDefault();
  
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  
  if (!username || !password) {
    showMessage('Por favor ingresa usuario y contraseña', 'error');
    return;
  }
  
  // Mostrar indicador de carga
  setLoading(true);
  
  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Guardar datos del usuario
      currentUser = data.user;
      sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
      
      showMessage('Inicio de sesión exitoso. Redirigiendo...', 'success');
      
      // Redirigir a la página de chat después de un breve retraso
      setTimeout(() => {
        window.location.href = 'chat.html';
      }, 1500);
    } else {
      showMessage(data.message || 'Credenciales incorrectas', 'error');
      setLoading(false);
    }
  } catch (error) {
    console.error('Error de inicio de sesión:', error);
    showMessage('Error de conexión. Por favor intenta de nuevo más tarde.', 'error');
    setLoading(false);
  }
}

/**
 * Muestra un mensaje al usuario
 * @param {string} text - Texto del mensaje
 * @param {string} type - Tipo de mensaje ('error' o 'success')
 */
function showMessage(text, type = 'error') {
  messageElement.textContent = text;
  messageElement.style.display = 'block';
  
  // Limpiar clases anteriores
  messageElement.classList.remove('error-message', 'success-message');
  
  // Agregar clase según el tipo
  if (type === 'error') {
    messageElement.classList.add('error-message');
  } else if (type === 'success') {
    messageElement.classList.add('success-message');
  }
  
  // Hacer desaparecer el mensaje después de 5 segundos si es un error
  if (type === 'error') {
    setTimeout(() => {
      messageElement.style.display = 'none';
    }, 5000);
  }
}

/**
 * Cambia el estado de carga del botón de inicio de sesión
 * @param {boolean} isLoading - Estado de carga
 */
function setLoading(isLoading) {
  if (isLoading) {
    loginButton.innerHTML = 'Iniciando sesión <span class="loading"></span>';
    loginButton.classList.add('loading-button');
    loginButton.disabled = true;
  } else {
    loginButton.innerHTML = 'Iniciar Sesión';
    loginButton.classList.remove('loading-button');
    loginButton.disabled = false;
  }
}

/**
 * Verifica si hay una sesión activa
 */
function checkSession() {
  const savedUser = sessionStorage.getItem('currentUser');
  
  if (savedUser && window.location.pathname.includes('index.html')) {
    // Si ya hay una sesión y estamos en la página de login, redirigir al chat
    window.location.href = 'chat.html';
  } else if (!savedUser && window.location.pathname.includes('chat.html')) {
    // Si no hay sesión y estamos en el chat, redirigir al login
    window.location.href = 'index.html';
  }
}

/**
 * Cerrar sesión del usuario
 */
function logout() {
  sessionStorage.removeItem('currentUser');
  window.location.href = 'index.html';
}

// Si estamos en la página de chat, exportar la función de logout
if (window.location.pathname.includes('chat.html')) {
  window.logout = logout;
}