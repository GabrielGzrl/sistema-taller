
// CONFIG

const API_URL = 'https://sistema-taller-production.up.railway.app/';
const token = localStorage.getItem('token');

if (!token) window.location.href = 'login.html';

// Helper: headers con token
function authHeaders(extra = {}) {
  return {
    ...extra,
    Authorization: `Bearer ${token}`
  };
}

// Helper: si expira sesión
function handle401() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  alert('Tu sesión expiró. Inicia sesión de nuevo.');
  window.location.href = 'login.html';
}

// Helper: parse seguro (por si viene HTML)
async function safeJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { mensaje: text };
  }
}

// UI helpers

function setMsg(text) {
  const msg = document.getElementById('msg');
  if (msg) msg.innerText = text || '';
}

function setSelectLoading() {
  const select = document.getElementById('orden_id');
  select.innerHTML = '<option value="">Cargando órdenes...</option>';
}

function setSelectEmpty(text = 'No hay órdenes') {
  const select = document.getElementById('orden_id');
  select.innerHTML = `<option value="">${text}</option>`;
}

function setTotales(subtotal = 0, impuestos = 0, total = 0) {
  document.getElementById('subtotal').innerText = Number(subtotal).toFixed(2);
  document.getElementById('impuestos').innerText = Number(impuestos).toFixed(2);
  document.getElementById('total').innerText = Number(total).toFixed(2);
}


// CARGAR ÓRDENES PARA SELECT
async function cargarOrdenes() {
  setSelectLoading();

  try {
    const res = await fetch(`${API_URL}/ordenes`, {
      headers: authHeaders()
    });

    if (res.status === 401) return handle401();

    if (!res.ok) {
      const err = await safeJson(res);
      console.log('Error /ordenes:', err);
      return setSelectEmpty('Error cargando órdenes');
    }

    const ordenes = await res.json();
    const select = document.getElementById('orden_id');

    select.innerHTML = '<option value="">Selecciona una orden</option>';

    if (!Array.isArray(ordenes) || ordenes.length === 0) {
      return setSelectEmpty('No hay órdenes');
    }

    ordenes.forEach(o => {
      const option = document.createElement('option');
      option.value = o.id;
      option.textContent = o.folio;
      select.appendChild(option);
    });

  } catch (e) {
    console.error(e);
    setSelectEmpty('Backend no disponible');
  }
}


// MOSTRAR SERVICIOS DE UNA ORDEN

async function mostrarServicios(orden_id) {
  const tabla = document.getElementById('tablaServicios');
  tabla.innerHTML = '';

  try {
    const res = await fetch(`${API_URL}/detalle/orden/${orden_id}`, {
      headers: authHeaders()
    });

    if (res.status === 401) return handle401();

    if (!res.ok) {
      const err = await safeJson(res);
      console.log('Error /detalle:', err);
      setMsg('No se pudieron cargar servicios');
      return;
    }

    const servicios = await res.json();

    if (!Array.isArray(servicios) || servicios.length === 0) {
      // sin servicios, totales en 0 (para luego recalcular)
      return;
    }

    servicios.forEach(s => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${s.descripcion ?? ''}</td>
        <td>${s.cantidad ?? 0}</td>
        <td>$${Number(s.precio_unitario ?? 0).toFixed(2)}</td>
        <td>$${Number(s.importe ?? 0).toFixed(2)}</td>
      `;
      tabla.appendChild(tr);
    });

  } catch (e) {
    console.error(e);
    setMsg('Error de conexión cargando servicios');
  }
}


// RECALCULAR Y PINTAR TOTALES
async function actualizarTotales(orden_id) {
  try {
    const res = await fetch(`${API_URL}/totales/orden/${orden_id}`, {
      method: 'PUT',
      headers: authHeaders()
    });

    if (res.status === 401) return handle401();

    if (!res.ok) {
      const err = await safeJson(res);
      console.log('Error /totales:', err);
      setMsg('No se pudieron actualizar totales');
      return;
    }

    const data = await res.json();
    setTotales(data.subtotal, data.impuestos, data.total);

  } catch (e) {
    console.error(e);
    setMsg('Error de conexión actualizando totales');
  }
}

async function actualizarTotalesDesdeUI() {
  const orden_id = Number(document.getElementById('orden_id').value);
  if (!orden_id) return;
  await actualizarTotales(orden_id);
}


// AGREGAR SERVICIO

async function agregarServicio() {
  const orden_id = Number(document.getElementById('orden_id').value);
  const descripcion = document.getElementById('descripcion').value.trim();
  const cantidad = Number(document.getElementById('cantidad').value);
  const precio = Number(document.getElementById('precio').value);
  const msg = document.getElementById('msg');

  if (!orden_id) return setMsg('Selecciona una orden primero');
  if (!descripcion) return setMsg('Escribe una descripción');
  if (!(cantidad > 0)) return setMsg('Cantidad inválida');
  if (!(precio > 0)) return setMsg('Precio inválido');

  setMsg('Guardando servicio...');

  try {
    const res = await fetch(`${API_URL}/detalle`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        orden_id,
        descripcion,
        cantidad,
        precio_unitario: precio
      })
    });

    if (res.status === 401) return handle401();

    const data = await safeJson(res);

    if (!res.ok) {
      setMsg(data.mensaje || 'Error al agregar servicio');
      return;
    }

    setMsg('✅ Servicio agregado');

    // limpiar inputs
    document.getElementById('descripcion').value = '';
    document.getElementById('cantidad').value = 1;
    document.getElementById('precio').value = '';

    // refrescar
    await mostrarServicios(orden_id);
    await actualizarTotales(orden_id);

  } catch (e) {
    console.error(e);
    setMsg('Error de conexión guardando servicio');
  }
}


// EVENTOS

document.getElementById('orden_id').addEventListener('change', async e => {
  const orden_id = Number(e.target.value);
  setMsg('');

  // limpiar tabla y totales si no hay orden
  if (!orden_id) {
    document.getElementById('tablaServicios').innerHTML = '';
    setTotales(0, 0, 0);
    return;
  }

  await mostrarServicios(orden_id);
  await actualizarTotales(orden_id);
});


// INIT

setTotales(0, 0, 0);
cargarOrdenes();