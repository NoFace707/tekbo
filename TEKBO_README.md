# Tekbo · Generador de Recibos y Proformas (Vendedor)

Extensión del proyecto original (Login + Gestión de Usuarios) con el
**Generador Tekbo V17** para el rol `vendedor`, implementado a partir del
HTML de referencia `Web final v7.html`, con paleta visual actualizada
(azul oscuro `#000e51` + verde claro `#f1f8e9` / `#7cb342`) y arquitectura
basada en **principios SOLID**.

---

## 1. Qué se implementó

### 1.1 Paleta de colores (todo el proyecto)

- `tailwind.config.js` ahora define los tokens `brand.*` (azul oscuro) y
  `lime.*` (verde claro) más el token `tekbo.*` con colores específicos del
  generador (naranja, print green, accent green, etc.).
- `index.css` actualiza los gradientes `app-bg` y `login-shell` y añade las
  reglas `@media print` para imprimir solo el recibo.
- Se reemplazaron **todos** los usos de `emerald-600` (color primario
  anterior) por `brand-800` / `lime-*` en:
  - `MainLayout.jsx` (sidebar, header, avatar, brand)
  - `LoginPage.jsx` (logo y banda)
  - `HomePage.jsx` (KPIs, badges, barras de progreso)
  - `AdminUsersPage.jsx` (tabla, toggles, badges, selects)
  - `ProfilePage.jsx` (avatar y rol)
  - `Button.jsx`, `Input.jsx`, `Alert.jsx`, `PageLoader.jsx`

### 1.2 Generador Tekbo para el rol vendedor

Ruta nueva: **`/panel`** (componente `VendedorPanelPage`).

Funcionalidad trasladada **tal cual** del HTML original:

- Toolbar superior con:
  - Botón 🧹 (nueva hoja)
  - Trigger desplegable del historial de clientes
  - Botón 💾 Guardar / Actualizar / Guardar Nuevo (cambia de etiqueta
    según el estado)
- Menú tipo **acordeón** con clientes y archivos, botones ✕ para borrar
  cliente o archivo, y botón **+ NUEVA HOJA** por cliente.
- **Asistente Rápido** (magic box verde claro) que interpreta:
  - `Cliente Ana` → setea el campo cliente
  - `Celular 77712345` → setea el celular (solo dígitos)
  - `2 Pantallas a 500` → agrega el ítem `{qty:2, desc:"Pantallas", price:500}`
- Form grid de cliente (Cliente, Fecha, Dirección, Celular).
- Editor de ítems (máx. 7 filas) con descripción / cantidad / precio.
- Input de descuento en Bs.
- Acciones:
  - **CAMBIAR A PROFORMA / CAMBIAR A RECIBO** (toggle naranja/azul)
  - **IMPRIMIR / PDF** (usa `window.print()` con CSS `@media print`)
- Recibo/Proforma imprimible con:
  - Banda azul superior
  - Logo + título RECIBO/PROFORMA (Oswald)
  - Datos del cliente
  - Tabla de detalle con Subtotal / Descuento / Total
  - Firmas RECIBÍ/ENTREGUÉ CONFORME (solo en RECIBO, ocultas en PROFORMA)
  - Footer con imagen
- **Toast** efímero para feedback.
- **Autoguardado** cada 10 s (borrador temporal + archivo activo).
- Persistencia en `localStorage` con claves `tekbo_db_v17` y `tekbo_temp_v17`
  (mismas que el HTML original → compatible hacia atrás).

### 1.3 Integración con el proyecto existente

- **Ruta**: `/panel` agregada a `App.jsx`, envuelta en `ProtectedRoute`
  (cualquier usuario autenticado puede verla; pensada para vendedor).
- **Sidebar**: el rol `vendedor` ahora tiene 3 items (Dashboard, Generador
  Tekbo, Mi perfil) en `MainLayout.jsx`.
- **CTA en HomePage**: banner destacado al tope del dashboard del vendedor
  que enlaza al generador.

---

## 2. Arquitectura SOLID

El módulo Tekbo se diseñó aplicando los 5 principios SOLID:

### S — Single Responsibility

Cada archivo tiene **una sola razón para cambiar**:

| Archivo | Responsabilidad única |
|---|---|
| `services/tekbo/tekboConstants.js` | Definir constantes invariantes. |
| `services/tekbo/tekboFormatterService.js` | Formatear moneda/fecha/capitalización. |
| `services/tekbo/tekboStorageService.js` | Leer/escribir `localStorage`. |
| `services/tekbo/tekboDocumentService.js` | Cálculos de dominio (totales, padding, validación). |
| `services/tekbo/tekboMagicInputService.js` | Parsear comandos del Asistente Rápido. |
| `services/tekbo/tekboClientService.js` | Orquestar clientes/archivos (CRUD). |
| `hooks/tekbo/useTekboState.js` | Estado del panel + acciones. |
| `components/tekbo/TekboToolbar.jsx` | Toolbar superior. |
| `components/tekbo/ClientHistoryMenu.jsx` | Menú acordeón de historial. |
| `components/tekbo/MagicAssistant.jsx` | Input del asistente rápido. |
| `components/tekbo/CustomerForm.jsx` | Form de datos del cliente. |
| `components/tekbo/ItemsEditor.jsx` | Editor de ítems. |
| `components/tekbo/DiscountInput.jsx` | Input de descuento. |
| `components/tekbo/DocumentActions.jsx` | Botones toggle + imprimir. |
| `components/tekbo/ReceiptDocument.jsx` | Render del recibo/proforma. |
| `components/tekbo/TekboToast.jsx` | Notificación flotante. |
| `components/tekbo/TekboControlPanel.jsx` | Compositor del panel. |

### O — Open/Closed

- Añadir un nuevo comando del Asistente Rápido no requiere modificar el
  hook ni los componentes: basta extender `parseMagicInput`.
- Añadir un nuevo tipo de documento (p. ej. FACTURA) se hace agregando
  un valor en `DOCUMENT_TYPE` sin tocar `computeTotals` ni `ReceiptDocument`.
- Los servicios exportan **funciones puras**: extensión por composición,
  no por edición.

### L — Liskov Substitution

- `tekboStorageService` exporta un objeto `tekboStorage` que cumple una
  interfaz implícita (`readDatabase`, `writeDatabase`, `readTempWork`,
  `writeTempWork`, `clearTempWork`). Cualquier implementación que respete
  esa interfaz puede sustituirlo (p. ej. para tests con memoria).
- `TekboControlPanel` recibe su lógica del hook `useTekboState`. Si en el
  futuro se reemplaza por un hook con otra fuente (p. ej. Redux o React
  Query), el componente no cambia.

### I — Interface Segregation

- Los componentes `Tekbo*` **no** dependen de un objeto "estado gigante".
  Cada uno declara solo las props que realmente usa:
  - `CustomerForm` recibe `values` + `onChange`.
  - `ItemsEditor` recibe `items` + `onAdd/onUpdate/onRemove`.
  - `ClientHistoryMenu` recibe `clients` + 4 callbacks específicos.
  - `ReceiptDocument` recibe `doc` + `totals` ya calculados.
- `tekboStorage` expone solo 5 funciones de persistencia; no filtra
  lógica de dominio ni UI.

### D — Dependency Inversion

- Los componentes UI **no** conocen `localStorage`. Dependen del hook
  `useTekboState`, que a su vez depende de los **servicios** (abstracciones
  de dominio), no de la implementación concreta de storage.
- `tekboClientService` depende de la interfaz de `tekboStorageService` y
  de `tekboDocumentService`, no de detalles de bajo nivel.
- `tekboMagicInputService` se carga dinámicamente en el hook, desacoplando
  la lógica de parsing del bundle inicial.

```
┌──────────────────────────────────────────────────────┐
│ UI (components/tekbo/*)                              │
│  └── solo presenta; recibe props y emite callbacks   │
└──────────────────────────────────────────────────────┘
                       │ depende de
                       ▼
┌──────────────────────────────────────────────────────┐
│ Hook (hooks/tekbo/useTekboState.js)                  │
│  └── posee el estado; orquesta acciones              │
└──────────────────────────────────────────────────────┘
                       │ delega en
                       ▼
┌──────────────────────────────────────────────────────┐
│ Servicios de dominio (services/tekbo/*)              │
│  ├── tekboClientService  (CRUD de clientes/archivos) │
│  ├── tekboDocumentService (totales, validación)      │
│  ├── tekboMagicInputService (parser)                 │
│  ├── tekboFormatterService (formato)                 │
│  └── tekboStorageService  (persistencia)             │
└──────────────────────────────────────────────────────┘
                       │ abstrae
                       ▼
              localStorage (implementación)
```

---

## 3. Cómo correr

Sigue el flujo original del proyecto:

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8000

Crear un usuario con rol `vendedor` desde el panel admin y luego entrar
al sidebar → **Generador Tekbo** (o al CTA del dashboard).

---

## 4. Estructura de archivos nueva

```
frontend/src/
├── services/tekbo/
│   ├── index.js
│   ├── tekboClientService.js
│   ├── tekboConstants.js
│   ├── tekboDocumentService.js      (+ createItemFromProduct)
│   ├── tekboFormatterService.js
│   ├── tekboMagicInputService.js
│   └── tekboStorageService.js
├── services/
│   └── productsService.js           (CRUD HTTP /api/products/)
├── hooks/tekbo/
│   ├── useTekboState.js             (+ addProductItem)
│   └── useTekboProducts.js          (carga catálogo para el picker)
├── hooks/products/
│   └── useProducts.js               (estado + acciones CRUD admin)
├── components/tekbo/
│   ├── ClientHistoryMenu.jsx
│   ├── CustomerForm.jsx
│   ├── DiscountInput.jsx
│   ├── DocumentActions.jsx
│   ├── ItemsEditor.jsx
│   ├── MagicAssistant.jsx
│   ├── ProductPicker.jsx            (selector de catálogo)
│   ├── ReceiptDocument.jsx
│   ├── TekboControlPanel.jsx        (integra ProductPicker + monto a pagar)
│   ├── TekboToast.jsx
│   └── TekboToolbar.jsx
└── pages/
    ├── AdminProductsPage.jsx        (CRUD admin: /productos)
    └── VendedorPanelPage.jsx
```

Backend:

```
backend/src/
├── config/
│   ├── settings.py                  (INSTALLED_APPS += 'products')
│   └── urls.py                      (/api/products/)
├── products/
│   ├── __init__.py
│   ├── apps.py
│   ├── admin.py
│   ├── models.py                    (Product: nombre, detalle, stock, costo)
│   ├── permissions.py               (IsAdminOrReadOnlyCatalog)
│   ├── serializers.py               (ProductReadSerializer, ProductWriteSerializer)
│   ├── views.py                     (ProductViewSet)
│   ├── urls.py
│   └── migrations/
│       ├── __init__.py
│       └── 0001_initial.py
└── dashboard/
    └── views.py                     (KPI de productos agregado al admin)
```

---

## 5. Módulo de Productos (CRUD admin + integración vendedor)

### 5.1 Backend — app `products`

- **Modelo `Product`** (SRP): solo `nombre`, `detalle`, `stock`
  (PositiveIntegerField), `costo` (DecimalField Bs), `created_at`,
  `updated_at`. Sin imágenes.
- **Permisos** (ISP): `IsAdminOrReadOnlyCatalog` — admin escribe,
  cualquier usuario autenticado (incluido vendedor) puede listar/ver.
- **Serializers** (ISP): separados para lectura (`ProductReadSerializer`,
  con `costo_display` ya formateado) y escritura (`ProductWriteSerializer`
  con validaciones de no-negativos y nombre no-vacío).
- **ViewSet** (OCP): soporta filtros `?search=`, `?in_stock=true|false`
  y `?ordering=nombre|-nombre|costo|-costo|stock|-stock` sin tocar
  serializers ni permisos.
- **Endpoint**: `GET/POST /api/products/` y `GET/PATCH/DELETE /api/products/<id>/`.
- **Dashboard admin**: ahora muestra KPI "Productos" con subtexto
  `X en stock · Y agotados`.

### 5.2 Frontend — AdminProductsPage

- Ruta `/productos` protegida por `AdminRoute` (solo admin).
- Sidebar con item "Productos" + icono `BoxIcon`.
- Tabla con buscador (debounce), filtro "Solo con stock", badges de stock
  (verde si > 0, rojo si agotado), costo en Bs formateado.
- Modal crear/editar con los 4 campos (nombre requerido, stock ≥ 0,
  costo ≥ 0).
- Confirmación de borrado con dialog de advertencia.
- Hook `useProducts` (SRP/DIP): estado + acciones CRUD, debounce de
  búsqueda, race-condition safe (cada request tiene su id y se descarta
  si llegó una más reciente).

### 5.3 Frontend — Integración Tekbo (rol vendedor)

- **Hook `useTekboProducts`** (SRP): wrapper delgado sobre `useProducts`
  que expone `inStockProducts` (productos con stock > 0) para el picker.
- **Componente `ProductPicker`** (SRP): catálogo buscable por nombre o
  detalle, qty ajustable por producto, botón `+` para agregar al
  documento. Respeta `MAX_ITEM_ROWS = 7` (deshabilita agregar cuando se
  alcanza). Muestra stock disponible.
- **Adaptador `createItemFromProduct`** (OCP): convierte un Product del
  backend en un ítem Tekbo `{desc, qty, price, productId?}`. Si en el
  futuro el producto viene de otra fuente, solo cambia el adaptador.
- **Acción `addProductItem`** en `useTekboState` (OCP): el hook no conoce
  la forma del Product; delega en el adaptador.
- **`TekboControlPanel`**: integra `ProductPicker` entre `CustomerForm`
  e `ItemsEditor`. Cada producto agregado se vuelve un ítem editable
  como cualquier otro (qty y precio se pueden ajustar manualmente).
- **Banner "Monto a pagar"**: resumen visual con el total calculado por
  `computeTotals` (subtotal − descuento) que se actualiza automáticamente
  al agregar/quitar/editar ítems.

### 5.4 Stock NO se descuenta (pendiente de discusión)

Tal como solicitaste, **no se implementó el descuento de stock al
vender**. Las notas visibles en el picker lo aclaran:
> "La cantidad sí descuenta stock real cuando confirmes la venta
> (próximamente)."

Cuando quieras implementarlo, el campo `productId` ya está disponible en
cada ítem para que un futuro servicio de ventas pueda recorrer los
`items` del documento y decrementar el `stock` correspondiente por
`productId` y `qty`.

