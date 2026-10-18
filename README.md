# InkaPay · Remesas con comprobante verificable

DApp educativa en Svelte 5, Vite y ethers.js v6 para enviar activos desde Pali Wallet. Navegación: **Inicio | Billetera | Remesas | Redes**. Las operaciones de producción solicitan una firma a la wallet y se transmiten a la blockchain; no hay saldos ni envíos ficticios en la aplicación.

## Ejecutar

```bash
npm install
npm run dev
npm test
npm run build
```

Instala y desbloquea Pali Wallet con una cuenta EVM. La conexión usa `window.ethereum` (EIP-1193); también admite una wallet compatible como MetaMask. El cambio de red solicita `wallet_switchEthereumChain` y, ante el código 4902, agrega la red con `wallet_addEthereumChain` y vuelve a solicitar el cambio.

El historial de **Sepolia, Hoodi y las redes Syscoin EVM configuradas no requiere una clave**. Para Ethereum Mainnet y Polygon, copia `.env.example` a `.env.local`, define `VITE_ETHERSCAN_API_KEY` y reinicia Vite. Las variables `VITE_*` son públicas en el cliente: esa clave es de consulta, nunca una clave privada o frase de recuperación.

Si la pestaña conserva una estructura anterior después de actualizar el código, recárgala con **Ctrl+F5**. El servidor usa el puerto fijo 5173 (`strictPort`) y vigilancia por sondeo en Windows para detectar guardados externos. Los contactos y comprobantes guardados permanecen en el almacenamiento del navegador.

## Flujo de Remesas

Sin conexión se muestra un estado vacío con **Conectar wallet**. Al conectar desde Remesas se permanece en esa vista.

1. **Beneficiario:** escribe una dirección y un alias o selecciona un contacto de la tercera columna. Puedes guardar, editar o eliminar beneficiarios en este navegador. Se valida con `ethers.isAddress` y se rechaza la dirección cero. El Paso 1 no muestra casilla de guardado: la acción Editar permite guardar el contacto desde su propia fila, sin modificar el envío; los demás destinatarios aparecen como frecuentes después de confirmar su remesa.
2. **Monto:** elige moneda nativa o USDC cuando la red tiene un contrato configurado, escribe el monto, selecciona un motivo y agrega una referencia opcional. Atrás/Continuar conserva el borrador.
3. **Revisión:** consulta destinatario, red, monto, gas, total máximo y equivalente en soles. Marca la confirmación y pulsa **Confirmar y enviar**. Solo Pali autoriza la operación.
4. **Comprobante:** muestra el hash desde **Pendiente** hasta **Confirmada**, beneficiario, motivo, referencia, fecha, red y enlace al explorador. Puedes copiar el hash, descargar un PNG y comenzar otra remesa.

Debajo del título y las tres tarjetas de totales, Remesas organiza tres paneles:

- **Cuerpo de la transacción:** conserva el stepper, los campos y la revisión de cuatro pasos.
- **Columna central:** una tarjeta superior independiente contiene los botones **Resumen / Historial**; debajo, **Resumen** muestra dos tarjetas apiladas (resumen del envío y comparación de comisiones), mientras **Historial** ocupa ese mismo espacio en una sola tarjeta. Los botones alternan el resumen en vivo y la comparación tradicional con el historial de remesas de la cuenta/red activa. El historial permanece montado al ocultarse: conserva sus filtros y no vuelve a consultar por alternar. Ya no hay un historial inferior de ancho completo.
- **Beneficiarios frecuentes:** lista compacta que combina beneficiarios guardados y destinatarios de remesas confirmadas en la cuenta/red actual, con iniciales, alias y dirección abreviada. Solo **Volver a elegir** precarga nombre y dirección en el Paso 1: no avanza automáticamente ni copia importes, motivos o referencias anteriores. El nombre y la dirección de la fila son informativos. **Editar** abre un formulario en la propia lista y guarda el contacto sin modificar el borrador de remesa; **Eliminar** exige confirmación. Incluye búsqueda al superar cinco beneficiarios. Se retiró el botón Nuevo beneficiario; los destinatarios se introducen directamente en el Paso 1. Los frecuentes anteriores, como un contacto no guardado que ya recibió una remesa, también aparecen; se deduplican por dirección y prevalece el alias guardado. Eliminar un frecuente lo oculta sin borrar su historial; vuelve a aparecer si recibe otra remesa confirmada.

En escritorio (más de 1000 px) se muestran tres columnas (1.3 / 1.3 / 0.85): las dos primeras tienen el mismo ancho y la lista de beneficiarios es más estrecha. **El formulario y la lista de beneficiarios comparten altura con el conjunto de tarjetas centrales.** La tarjeta superior central contiene únicamente los botones; debajo se alternan dos tarjetas de resumen o una única tarjeta de historial. El tamaño del conjunto permanece estable al cambiar de paso o pestaña. La vista ocupa `100dvh`; el grid utiliza el espacio que queda bajo el encabezado y las métricas, sin scroll de página. Se compactaron encabezado, totales, stepper y comprobante; Activo/Monto y los datos de revisión se organizan en dos columnas. Las acciones del formulario permanecen al pie. El formulario adapta su densidad a la altura de la tarjeta: cada etiqueta, entrada y ayuda forman un grupo; los bloques de beneficiario y monto se agrupan con separaciones moderadas de 12–20 px, sin distribuirlos por toda la altura y la revisión aprovecha el alto con filas más legibles. Las consultas de contenedor amplían tipografía, controles y separación cuando hay espacio, conservando la variante compacta en ventanas bajas. Los beneficiarios se muestran exclusivamente como lista en la tercera columna, sin tarjetas duplicadas en el formulario.

Billetera y Remesas comparten un skeleton de entrada de 500 ms que reproduce sus tarjetas y columnas. El contenido se monta desde el inicio, de modo que la transición no retrasa las consultas ni reinicia el formulario. El historial muestra tres filas skeleton durante la carga sin movimientos previos; las actualizaciones con datos conservan las filas visibles. La animación respeta la preferencia de movimiento reducido.

Se verifican los cuatro pasos en 1920×945, 1440×900, 1366×768 y 1280×720: sin desplazamiento de página ni del cuerpo del formulario y sin cambios en la altura entre pasos. Las listas largas de historial/beneficiarios mantienen desplazamiento interno oscuro; un contenido excepcionalmente largo o una ventana más baja conserva acceso mediante desplazamiento interno, sin hacer crecer la página. En tablet se usa formulario arriba y dos paneles debajo; hasta 700 px se apilan para mantener los controles accesibles. Remesas usa separaciones de 24 px entre columnas y tarjetas centrales (18 px en ventanas bajas), márgenes verticales más amplios, rellenos consistentes y sombras sin halo. Los encabezados y métricas son más compactos; el resumen y la comparación incorporan iconos. La revisión solo amplía su texto cuando dispone de suficiente ancho y alto. Se reutilizan los tokens de tarjetas, botones, bordes, radios y sombras. Se eliminó por completo la tarjeta «¿Cómo recibe tu familiar?».

**Tipografía y márgenes:** Billetera, Remesas y Redes usan `--workspace-gutter` para igualar ambos laterales. Las tres vistas operativas (Billetera, Remesas y Redes) usan Space Grotesk con base de 18 px, lo que aumenta los textos habituales aproximadamente 1–2 px. Inicio conserva su tipografía y tamaño.

**Redes:** dos paneles de la misma altura: lista de redes con iconos y botones EVM/UTXO a la izquierda, consultor por dirección a la derecha. Conserva selección/cambio de red y consultas públicas individuales o multi-red. Se retiró la sección de arquitectura de proveedores y se rediseñó el skeleton con las dos columnas. Desde 1001 px ocupa el espacio disponible sin scroll de página; las listas y resultados extensos se desplazan dentro de sus paneles. En móvil se apilan. Una respuesta de una consulta anterior no sustituye los resultados después de cambiar de red, dirección o modo. `npm run test:networks` comprueba consultas simuladas EVM/UTXO, skeleton, resultados obsoletos, móvil y alineación en cinco resoluciones de escritorio.

El encabezado reutiliza `WalletNetworkSelect`, el mismo selector con iconos y teclado de Billetera. Permite cambiar/agregar redes en Pali y actualiza activos, equivalentes, totales e historial. Se deshabilita mientras se autoriza/sigue un envío. Billetera conserva el envío cuenta a cuenta y su historial; Redes conserva las consultas de saldo.

**Billetera compacta:** selección de red y envío cuenta a cuenta se apilan en la columna izquierda; el historial ocupa la columna derecha y abarca la altura conjunta de ambas tarjetas. El banner conserva su estructura en dos filas: conexión/red y Desconectar arriba; dirección, datos de la wallet y saldo debajo, con tamaños y espacios reducidos. En escritorio la vista se ajusta a la altura disponible y los movimientos se desplazan dentro del historial. El selector personalizado incluye iconos, grupos EVM/UTXO y navegación por teclado; se cierra con Escape o al pulsar fuera. El envío tiene un mini encabezado con icono y descripción, y su botón queda al pie. En pantallas estrechas las tarjetas se apilan para mantener los controles accesibles. El historial conserva los filtros como botones.

### Tasas y comisiones referenciales

`src/lib/config/rates.js` es la única fuente de precios ilustrativos (fecha de referencia: **2026-10-17**): `USD_PEN = 3.45`, `ETH_USD = 2420`, `SYS_USD = 0.002`, `USDC_USD = 1` y `POL_USD = null`. Los soles se derivan multiplicando el precio USD por USD/PEN: **1 ETH = S/ 8,349.00; 1 SYS/tSYS = S/ 0.0069; 1 USDC = S/ 3.45**. POL y cualquier símbolo no acordado muestran **Sin referencia**, también en los totales; no se sustituyen por cero. `remittances.js` conserva motivos y comisión tradicional (7%) y reutiliza estas funciones.

Se usa formato `es-PE`, coma para miles y punto decimal. Los importes pequeños conservan decimales; las comisiones positivas inferiores a un céntimo muestran **< S/ 0.01** junto al importe nativo. Formulario, resumen, comparación, tarjetas, comprobante, detalle y PNG comparten la conversión. Los comprobantes antiguos se presentan con esta referencia actual de la demo; no se usa el PEN persistido con tasas anteriores. No se consulta un mercado en vivo. Se retiró el aviso superior de demostración y el texto de alcance bajo los totales para aprovechar la altura; los importes siguen identificados como referenciales en sus tarjetas y comprobantes.

La comisión se estima en el RPC y se reserva un margen del 20% de gas. La revisión vence a los dos minutos. La comparación resta el gas estimado al 7% del monto; puede mostrar costo adicional si el gas supera ese porcentaje. No incluye conversión ni retiro. El comprobante confirmado guarda el gas efectivamente utilizado cuando está disponible. No se suman ETH y USDC como si fueran la misma moneda: el resumen los separa y muestra además el equivalente referencial.



## Historial por cuenta y red

`stores/history.js` es la fuente compartida por Billetera y Remesas. Consulta movimientos nativos y ERC-20 mediante Blockscout REST v2 (Hoodi/Sepolia) o `txlist`/`tokentx` (otras redes configuradas), ordena, deduplica, pagina y combina los resultados con los comprobantes locales de InkaPay. REST v2 usa cursores independientes para monedas y tokens, con hasta 50 filas por flujo y página. Cada cambio de cuenta o red limpia los datos anteriores y consulta el contexto nuevo; las respuestas tardías se descartan. Con la vista abierta hay actualización cada 60 segundos y botón Actualizar.

| Red | API de movimientos | Clave |
| --- | --- | --- |
| Ethereum Sepolia | `https://eth-sepolia.blockscout.com/api/v2` | No |
| Ethereum Hoodi | `https://eth-hoodi.blockscout.com/api/v2` | No |
| zkSYS | `https://explorer-zk.tanenbaum.io/api` | No |
| Rollux | `https://explorer.rollux.com/api` | No |
| Syscoin NEVM | `https://explorer.syscoin.org/api` | No |
| Syscoin NEVM Testnet | `https://explorer.tanenbaum.io/api` | No |
| Ethereum Mainnet / Polygon | Etherscan V2, con `chainid` | `VITE_ETHERSCAN_API_KEY` |
| Bitcoin / Syscoin UTXO | Sin adaptador de historial en esta demo | Respaldo local explícito |

Sepolia y Hoodi consultan Blockscout REST v2, pero sus enlaces de comprobante siguen abriendo Etherscan en la misma red. La API antigua de Hoodi devolvió HTTP 429 durante el diagnóstico; los endpoints v2 de monedas y tokens respondieron HTTP 200. Si prefieres Etherscan para estas testnets, establece `VITE_TESTNET_HISTORY_PROVIDER=etherscan` y configura `VITE_ETHERSCAN_API_KEY`; una clave de mainnet por sí sola no altera el proveedor de testnet. Los endpoints dependen de la disponibilidad del proveedor.

El historial ofrece filtros **Todas, Recibidas, Enviadas, Pendientes, Confirmadas y Con error**. Remesas recientes muestra únicamente las remesas enviadas por la cuenta activa en esa red. Un movimiento confirmado por el explorador se identifica como tal; un registro aún no indexado aparece como **Respaldo local**. Carga, vacío, errores, reintento y red sin API tienen mensajes propios. Se serializan las consultas y se reutilizan resultados durante 60 segundos. Ante un 429 se respeta `Retry-After` (60 segundos si no se informa), se comparte la pausa entre cuentas y vistas y se muestra una cuenta regresiva. No se lanzan tres reintentos seguidos ni se permite forzar consultas durante esa pausa. Al terminar, la consulta se reanuda automáticamente mientras la vista esté visible. Los datos disponibles se conservan incluso si solo falla la consulta de tokens.

**Persistencia:** el explorador aporta los movimientos y sus estados; `localStorage` conserva alias, motivo, referencia, estimación PEN y la etiqueta `kind: 'remesa'`, porque una transferencia nativa/ERC-20 ordinaria no contiene esos metadatos. No hay una BD de producto. Si borras los datos del navegador o usas otro equipo, el explorador conserva la transferencia, pero no se recuperan automáticamente su alias, motivo o etiqueta Remesa. Los totales se calculan a partir del historial consultado y los comprobantes de este navegador. Los movimientos anteriores se cargan desde Historial.

Los pendientes se verifican también mediante recibos RPC cuando vuelve a cargarse el historial. Un timeout no se registra falsamente como error; queda Pendiente hasta verificarse. Acelerar una transacción actualiza el hash; cancelarla no produce un comprobante de éxito. Cambiar de cuenta o red invalida la revisión y conserva beneficiario, motivo y referencia. Conserva también el monto si el activo sigue disponible con el mismo símbolo. Si falta USDC o cambia la moneda nativa, limpia únicamente el monto y muestra un aviso para elegir uno nuevo. El seguimiento del envío iniciado continúa aunque se abandone la vista.

## Probar el flujo completo con Pali en testnet

1. Ejecuta `npm run dev`, abre la URL y entra a **Remesas** sin conectar. Verifica el estado vacío y pulsa **Conectar wallet**.
2. En el selector del encabezado de **Remesas**, selecciona **Ethereum Sepolia** y acepta el cambio en Pali. Necesitas ETH de prueba para el monto y el gas, y una segunda dirección EVM que controles como beneficiario.
3. Crea y guarda un beneficiario. Edita su alias en la propia lista, guarda y pulsa **Volver a elegir** para precargarlo en el Paso 1. Pulsa Continuar. Escribe un monto pequeño de ETH de prueba, elige **Apoyo familiar** y agrega una referencia. Usa Atrás y comprueba que no se pierde el monto.
4. Continúa a Revisión, comprueba la red, el destinatario y el total, marca la confirmación y pulsa **Confirmar y enviar**. Autoriza en Pali. Verifica **Pendiente → Confirmada**, copia el hash, abre el explorador y descarga el comprobante PNG.
5. En el panel central pulsa **Historial** y abre el detalle. Verifica motivo/referencia, etiqueta Remesa, fecha, estado y explorador. Prueba filtros y, desde Beneficiarios frecuentes, **Volver a elegir**, que carga solo nombre y dirección en el Paso 1. En Billetera la misma remesa aparece etiquetada dentro del historial general.
6. Para USDC, usa el [faucet oficial de Circle](https://faucet.circle.com/) y conserva ETH de prueba para gas. El contrato configurado en Sepolia es `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` (6 decimales), publicado en [Circle](https://developers.circle.com/stablecoins/usdc-contract-addresses). Repite el envío eligiendo USDC; la revisión debe mostrar monto en USDC más gas en ETH.
7. Cambia a **Hoodi** y luego **zkSYS** desde el selector del encabezado, o desde Pali. El título del historial debe cambiar inmediatamente; ninguna remesa de Sepolia debe quedar visible. Cada red vuelve a consultar su propia API. Regresa a Sepolia y comprueba que reaparecen sus remesas. Cambia también de cuenta y verifica que solo aparecen movimientos de esa cuenta.
8. Rechaza una firma, prueba un monto superior al saldo y revisa que los errores sean claros y no se cree un envío exitoso. En una red sin USDC no debe aparecer como activo elegible. Cambiar de red mientras revisas debe invalidar la revisión.
9. Para simular un fallo del explorador, bloquea su endpoint en las herramientas del navegador y pulsa Actualizar. Debe terminar la carga, mostrar el error y conservar el respaldo local identificado. Desbloquea y pulsa Reintentar.
10. Comprueba a 390 px de ancho, navegación por Tab, foco del título al cambiar de paso y apertura/cierre del detalle con Escape. La consulta de saldo y el envío cuenta a cuenta siguen disponibles en sus vistas.

## Pruebas y reporte de actividad

`npm test` ejecuta 19 pruebas de servicios: nativo, USDC, precisión, gas/saldos, revisión vencida, cambio de cuenta/red, estados, cancelación/aceleración, respuesta de explorador, transfer revertido, descarte de respuestas tardías, pausa 429/Retry-After, resultados parciales y paginación REST v2.

`npm run test:browser` ejecuta `tests/browser-flow.mjs` contra el servidor local con Playwright y un proveedor EIP-1193 **simulado**. Cubre navegación, beneficiarios, validación, rechazo, ETH/USDC, comprobante PNG, detalle/foco, filtros, errores/reintento, precarga explícita en el Paso 1, edición independiente del envío, cuenta/red, referencias PEN, altura común estable en los cuatro pasos a 1920×945, 1440×900, 1366×768 y 1280×720, sin scroll de página/formulario, conservación del filtro entre pestañas y móvil. Guarda capturas y un PNG en `test-results/` (ignorado por Git). Para ejecutarlo instala Playwright en tu entorno de pruebas y su Chromium, o apunta a una instalación existente mediante `INKAPAY_PLAYWRIGHT_PATH` y `INKAPAY_BROWSER_PATH`; `INKAPAY_TEST_URL` permite cambiar la URL.

El [reporte punto por punto](docs/validacion-remesas.md) distingue implementación comprobada, consultas reales de APIs y la prueba con firma real pendiente. **Estas pruebas automatizadas no firman ni envían fondos en una testnet real.**

## Archivos nuevos o modificados para esta actividad

| Archivo | Responsabilidad |
| --- | --- |
| `src/views/Remesas.svelte` | Márgenes compartidos con Billetera, encabezado con selector y totales sin avisos superiores |
| `src/App.svelte` | Pestaña Remesas, conexión que conserva la vista y eventos externos de red |
| `src/pages/Dashboard.svelte` | Retira el bloque de remesas de Billetera |
| `src/lib/components/network/WalletNetworkSelect.svelte` | Selector compartido por Billetera y el encabezado de Remesas |
| `src/lib/components/network/NetworkIcon.svelte` | Iconos reutilizables para el selector personalizado |
| `src/lib/components/transactions/RemittanceForm.svelte` | Flujo conservado, grid de tres columnas con botones y contenido en tarjetas centrales separadas, formulario compacto, resumen/historial persistente y borrador al cambiar de red |
| `src/lib/components/remittances/BeneficiaryList.svelte` | Lista compacta, búsqueda, precarga explícita en el Paso 1, edición independiente y eliminación confirmada |
| `src/lib/components/remittances/Stepper.svelte` | Progreso accesible con variante compacta para escritorio |
| `src/lib/components/remittances/BeneficiaryCard.svelte` | Seleccionar, editar y eliminar beneficiarios |
| `src/lib/components/remittances/RemittanceReceipt.svelte` | Comprobante con PEN centralizado, copia y descarga |
| `src/lib/components/transactions/TransactionHistory.svelte` | Historial compartido, filtros y estado del origen de datos |
| `src/lib/components/transactions/TransactionModal.svelte` | Motivo, descarga, foco del diálogo y retorno al control de origen |
| `src/lib/components/transactions/TransactionForm.svelte` | Conserva cuenta/red de la operación y verifica el contexto antes de firmar |
| `src/lib/services/remittance.js` | Prepara, transmite y sigue nativo/ERC-20; maneja reemplazos y timeouts |
| `src/lib/services/remittanceReceipt.js` | Exportación PNG con colores del sistema y tasas compartidas |
| `src/lib/services/explorerApi.js` | Normalización de movimientos/estado, paginación, caché, límites y errores |
| `src/lib/services/transactionHistory.js` | Combina datos y metadatos sin mezclar cuentas o redes |
| `src/lib/services/evmWallet.js` | Renueva BrowserProvider tras cambios externos de red |
| `src/lib/stores/history.js` | Fuente reactiva compartida, sondeo y confirmación RPC de pendientes |
| `src/lib/stores/beneficiaries.js` | Persistencia validada de beneficiarios |
| `src/lib/stores/transactions.js` | Comprobantes locales; actualizaciones por hash y red |
| `src/lib/stores/wallet.js` | Descarta respuestas de saldo/cuenta que ya no corresponden |
| `src/lib/config/rates.js` | Única fuente de precios, fecha, conversión y formato PEN/comisiones |
| `src/lib/config/remittances.js` | Motivos y cálculo de ahorro con las tasas compartidas |
| `src/lib/config/networks.js` | APIs públicas, catálogo de redes/USDC y metadatos testnet |
| `src/app.css` | Márgenes compartidos y Space Grotesk en Billetera/Remesas/Redes con base de 18 px; Inicio conserva Inter |
| `tests/remittance.test.js`, `tests/browser-flow.mjs` | Pruebas de servicios y navegador |
| `package.json`, `.gitignore`, `.env.example` | Comandos de pruebas, exclusión de resultados y configuración API |
| `vite.config.js` | Puerto de desarrollo fijo y detección de cambios externos en Windows |
| `README.md`, `docs/validacion-remesas.md` | Guía completa y reporte de cumplimiento |

No se añadieron dependencias de aplicación ni se modificó `package-lock.json`. El adaptador UTXO permanece en `src/lib/services/utxoWallet.js`; los envíos de remesas de esta actividad usan redes EVM.
