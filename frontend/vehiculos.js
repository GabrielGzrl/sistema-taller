const API_URL = 'https://sistema-taller-production.up.railway.app/api';
const token = localStorage.getItem('token');

// CARGAR CLIENTES EN SELECT
async function cargarClientes() {
  const res = await fetch(`${API_URL}/clientes`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const clientes = await res.json();
  const select = document.getElementById('cliente_id');

  select.innerHTML = '<option value="">-- Selecciona un cliente --</option>';

  clientes.forEach(c => {
    const option = document.createElement('option');
    option.value = c.id;
    option.textContent = `${c.nombre} (${c.telefono})`;
    select.appendChild(option);
  });
}

// CREAR VEHÍCULO
async function crearVehiculo() {
  const data = {
    vin: vin.value.trim(),
    marca: marca.value.trim(),
    modelo: modelo.value.trim(),
    anio: anio.value.trim(),
    color: color.value.trim(),
    placas: placas.value.trim(),
    kms: kms.value.replace(/,/g, ''),
    cliente_id: cliente_id.value
  };

  const res = await fetch(`${API_URL}/vehiculos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });

  const json = await res.json();
  document.getElementById('msg').innerText =
    res.ok ? '✅ Vehículo creado' : json.mensaje || 'Error';
}



cargarClientes();