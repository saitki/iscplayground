// Referencias DOM
const messagesContainer = document.getElementById('messagesContainer');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const userAvatar = document.getElementById('userAvatar');
const userDisplayName = document.getElementById('userDisplayName');
const userOrg = document.getElementById('userOrg');
const connectionStatus = document.getElementById('connectionStatus');

// Variables
let currentUser = JSON.parse(localStorage.getItem('user')); // Cambiado de sessionStorage a localStorage para consistencia
const API_URL = window.location.origin; // Usar origen actual para flexibilidad
let socket;

// Comprobar si hay usuario
if (!currentUser) {
  window.location.href = '/index.html';
} else {
  // Cargar datos del usuario
  userDisplayName.textContent = currentUser.username;
  userOrg.textContent = currentUser.organization || 'Usuario';
  userAvatar.textContent = currentUser.username.charAt(0).toUpperCase();
  
  // Inicializar Socket.IO
  initializeSocket();
  
  // Cargar historial de mensajes
  fetchMessages();
}

/**
 * Inicializar conexión Socket.IO
 */
function initializeSocket() {
  socket = io(API_URL);
  
  // Evento de conexión
  socket.on('connect', () => {
    updateConnectionStatus(true);
    console.log('Conectado al servidor');
  });
  
  // Evento de desconexión
  socket.on('disconnect', () => {
    updateConnectionStatus(false);
    console.log('Desconectado del servidor');
  });
  
  // Evento de nuevo mensaje
  socket.on('newMessage', (message) => {
    addMessageToUI(message);
    scrollToBottom();
  });
}

/**
 * Actualizar indicador de estado de conexión
 */
function updateConnectionStatus(connected) {
  const statusIndicator = connectionStatus.querySelector('.status-indicator');
  const statusText = connectionStatus.querySelector('span:last-child');
  
  if (connected) {
    connectionStatus.classList.remove('status-disconnected');
    connectionStatus.classList.add('status-connected');
    statusIndicator.classList.remove('disconnected');
    statusIndicator.classList.add('connected');
    statusText.textContent = 'Conectado';
    
    // Ocultar después de 3 segundos
    setTimeout(() => {
      connectionStatus.style.opacity = '0';
      
      // Mantener visible al pasar el mouse
      connectionStatus.addEventListener('mouseenter', () => {
        connectionStatus.style.opacity = '1';
      });
      
      connectionStatus.addEventListener('mouseleave', () => {
        connectionStatus.style.opacity = '0';
      });
    }, 3000);
  } else {
    connectionStatus.style.opacity = '1';
    connectionStatus.classList.remove('status-connected');
    connectionStatus.classList.add('status-disconnected');
    statusIndicator.classList.remove('connected');
    statusIndicator.classList.add('disconnected');
    statusText.textContent = 'Desconectado';
  }
}

/**
 * Cargar mensajes del servidor
 */
async function fetchMessages() {
  try {
    const response = await fetch(`${API_URL}/api/messages`);
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    const messages = await response.json();
    renderMessages(messages);
  } catch (error) {
    console.error('Error al cargar mensajes:', error);
    showNotification('Error al cargar mensajes. Intente nuevamente.', 'error');
  }
}

/**
 * Renderizar mensajes en la UI
 */
function renderMessages(messages) {
  messagesContainer.innerHTML = '';
  
  if (messages.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'empty-messages';
    emptyMessage.textContent = 'No hay mensajes aún. ¡Sé el primero en enviar uno!';
    messagesContainer.appendChild(emptyMessage);
    return;
  }
  
  messages.forEach(message => {
    addMessageToUI(message);
  });
  
  scrollToBottom();
}

/**
 * Añadir un mensaje a la interfaz
 */
function addMessageToUI(message) {
  if (!message || !message.sender || !message.message) {
    console.error('Mensaje inválido:', message);
    return;
  }

  const isCurrentUser = message.sender === currentUser.username;
  
  const messageElement = document.createElement('div');
  messageElement.className = `message ${isCurrentUser ? 'outgoing' : 'incoming'}`;
  
  let messageContent = '';
  
  if (!isCurrentUser) {
    messageContent += `<div class="message-sender">${escapeHTML(message.sender)}</div>`;
  }
  
  messageContent += `<div class="message-content">${escapeHTML(message.message)}</div>`;
  
  if (message.date) {
    const messageDate = new Date(message.date);
    const formattedTime = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    messageContent += `<div class="message-time">${formattedTime}</div>`;
  }
  
  messageElement.innerHTML = messageContent;
  messagesContainer.appendChild(messageElement);
}

/**
 * Escapar HTML para prevenir XSS
 */
function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Mostrar notificación
 */
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }, 10);
}

/**
 * Desplazar al fondo del contenedor de mensajes
 */
function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Cerrar sesión
 */
function logout() {
  localStorage.removeItem('user');
  window.location.href = '/index.html';
}

/**
 * Enviar mensaje
 */
messageForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const messageText = messageInput.value.trim();
  if (!messageText) return;
  
  try {
    const response = await fetch(`${API_URL}/api/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sender: currentUser.username,
        message: messageText
      })
    });
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    // Limpiar input
    messageInput.value = '';
    messageInput.focus();
    
  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    showNotification('Error al enviar mensaje. Intente nuevamente.', 'error');
  }
});

// Evitar que el formulario se envíe al presionar Enter si el campo está vacío
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && messageInput.value.trim() === '') {
    e.preventDefault();
  }
});

// Agregar estilos de notificación dinámicamente
const style = document.createElement('style');
style.textContent = `
  .notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 4px;
    background-color: #4a69bd;
    color: white;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    opacity: 0;
    transform: translateY(-20px);
    transition: all 0.3s ease;
  }
  
  .notification.show {
    opacity: 1;
    transform: translateY(0);
  }
  
  .notification.error {
    background-color: #e74c3c;
  }
  
  .notification.success {
    background-color: #2ecc71;
  }
  
  .empty-messages {
    text-align: center;
    padding: 20px;
    color: #999;
    font-style: italic;
  }
`;
document.head.appendChild(style);