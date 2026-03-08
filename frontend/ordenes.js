const API_URL = 'sistema-taller-production.up.railway.app';
const token = localStorage.getItem('token');

// CARGAR VEHÍCULOS
async function cargarVehiculos() {
  const res = await fetch(`${API_URL}/vehiculos`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const vehiculos = await res.json();
  const select = document.getElementById('vehiculo_id');

  select.innerHTML = '<option value="">Selecciona un vehículo</option>';

  vehiculos.forEach(v => {
    const option = document.createElement('option');
    option.value = v.id;
    option.textContent = `${v.marca} ${v.modelo} - ${v.vin}`;
    select.appendChild(option);
  });
}


// CREAR ORDEN
async function crearOrden() {
  const vehiculo_id = document.getElementById('vehiculo_id').value;
  const comentarios = document.getElementById('comentarios').value;

  const msg = document.getElementById('msg');

  if (!vehiculo_id) {
    msg.innerText = 'Selecciona un vehículo';
    return;
  }

  const res = await fetch(`${API_URL}/ordenes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      vehiculo_id,
      comentarios
    })
  });

  const data = await res.json();

  if (!res.ok) {
    msg.innerText = data.mensaje || 'Error al crear orden';
    return;
  }

  msg.innerText = `✅ Orden creada (Folio ${data.folio})`;
}

// Cargar al iniciar
cargarVehiculos();