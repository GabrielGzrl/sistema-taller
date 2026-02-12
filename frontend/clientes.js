const API_URL = 'http://localhost:3000/api';
const token = localStorage.getItem('token');

async function crearCliente() {
  const nombre = document.getElementById('nombre').value.trim();
  const telefono = document.getElementById('telefono').value.trim();
  const email = document.getElementById('email').value.trim();
  const msg = document.getElementById('msg');

  if (!nombre || !telefono) {
    msg.innerText = 'Nombre y teléfono son obligatorios';
    return;
  }

  const res = await fetch(`${API_URL}/clientes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ nombre, telefono, email })
  });

  const data = await res.json();

  if (res.ok) {
    msg.innerText = `✅ Cliente creado (ID ${data.id})`;
    listarClientes();
  } else {
    msg.innerText = data.mensaje || 'Error al crear cliente';
  }
}

async function listarClientes() {
  const res = await fetch(`${API_URL}/clientes`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const clientes = await res.json();
  const lista = document.getElementById('listaClientes');

  lista.innerHTML = '';

  clientes.forEach(c => {
    const li = document.createElement('li');
    li.innerText = `${c.id} - ${c.nombre} (${c.telefono})`;
    lista.appendChild(li);
  });
}

listarClientes();