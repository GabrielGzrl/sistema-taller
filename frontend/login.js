const API_URL = 'https://sistema-taller-production.up.railway.app/api';

async function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const mensaje = document.getElementById('mensaje');

  mensaje.textContent = 'Ingresando...';

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      mensaje.textContent = data.mensaje || 'Error de login';
      return;
    }

    // GUARDAR TOKEN
    localStorage.setItem('token', data.token);
    localStorage.setItem('usuario', JSON.stringify(data.usuario));

    // REDIRECCIONAR
    window.location.href = 'dashboard.html';

  } catch (error) {
    mensaje.textContent = 'Error al conectar con servidor';
  }
}