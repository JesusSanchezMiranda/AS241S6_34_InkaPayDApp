# Validación de la actividad · Remesas InkaPay

Fecha: 17 de octubre de 2026. La columna de estado evalúa la implementación y la evidencia disponible; no declara una transacción real que no se haya firmado.

## Reorganización y referencias · solicitud actual

| Verificación solicitada | Estado | Evidencia |
| --- | --- | --- |
| Constantes en un archivo y sin precios anteriores | CUMPLE | `config/rates.js` contiene precios, fecha, conversión y formato. Búsqueda en código y README sin las constantes/precios anteriores. |
| ETH / SYS / USDC coherentes en PEN | CUMPLE | 1 ETH = S/ 8,349.00; 1 SYS/tSYS = S/ 0.0069; 1 USDC = S/ 3.45. Pruebas numéricas y de navegador; comprobante, detalle y PNG usan la misma conversión incluso para registros antiguos. POL muestra Sin referencia. |
| Div 1 conservado; Div 2 alterna; Div 3 funcional | CUMPLE | Stepper, campos y flujo conservados con presentación compacta; sin duplicar beneficiarios dentro del formulario. Resumen/Historial mantiene el componente montado y conserva filtros sin consultar al alternar. Lista con iniciales, precarga únicamente mediante Volver a elegir sin salir del Paso 1, búsqueda con más de cinco guardados, edición en la propia lista sin alterar la remesa y eliminación confirmada. |
| Secciones sueltas eliminadas | CUMPLE | Se retiraron HTML/estilos de «¿Cómo recibe tu familiar?» y el historial inferior; solo queda el historial dentro de Div 2. |
| Selector compartido e historial por red | CUMPLE | Mismo `WalletNetworkSelect` de Billetera. Prueba de cambio/agregado automático de red y filtrado por cuenta/red. Conserva borrador compatible y advierte al faltar USDC o cambiar la moneda nativa. |
| Nativo, USDC y comprobante siguen funcionando | CUMPLE en pruebas simuladas | Prueba completa de autorización/rechazo, contrato ERC-20, Pendiente → Confirmada, modal y descarga PNG. La firma con una wallet real no se ha ejecutado en esta actividad. |

Tres columnas desde 1001 px, con los dos primeros paneles de igual ancho y la lista más estrecha. La columna central separa los botones (tarjeta superior) del contenido alternable: dos tarjetas apiladas para el resumen del envío y la comparación, o una única tarjeta de historial; el conjunto comparte altura estable con formulario y beneficiarios entre pasos y pestañas, ajustada al espacio de la pantalla. Verificados los cuatro pasos nativos y revisión/comprobante USDC a 1920×945, 1440×900, 1366×768 y 1280×720 sin scroll de página ni del cuerpo del formulario. A 1100 px se conservan tres columnas; a 390 px se apilan. Solo las listas largas o contenido excepcional usan scroll interno oscuro; el formulario mantiene sus acciones al pie. Por la última solicitud se retiraron el aviso de demostración y el texto bajo los totales; también el botón Nuevo beneficiario. Remesas comparte márgenes con Billetera y las tres vistas operativas usan Space Grotesk con base de 18 px. Las comisiones inferiores a un céntimo usan «< S/ 0.01» y conservan el importe nativo.

## Punto 1 · Transacciones enfocadas en remesas

| Verificación | Estado | Corrección y evidencia |
| --- | --- | --- |
| Envío nativo a blockchain | CUMPLE en implementación | `prepareRemittance` estima gas y saldo; `sendRemittance` transmite mediante el signer de Pali con `chainId` explícito. Probado con signer y proveedor EIP-1193 simulados. |
| Envío USDC cuando está configurado | CUMPLE en implementación | Usa el contrato configurado, comprueba su código, consulta decimales/saldo y ejecuta `transfer`. Pruebas verifican el destinatario del contrato y el monto de 6 decimales; el gas sigue en ETH. Dirección Sepolia cotejada con Circle. |
| Hash y estado Pendiente → Confirmada | CUMPLE | Registra el hash al transmitir y confirma con recibo; timeouts conservan Pendiente. El sondeo del historial recupera pendientes tras recargar. Pruebas de éxito, reversión, cancelación y aceleración. |
| Comprobante con motivo y referencia | CUMPLE | Tarjeta, detalle, hash, fecha, red, beneficiario, PEN referencial y descarga PNG probados en navegador. |
| Registro identificable como remesa | CUMPLE | `kind: 'remesa'`, motivo, referencia y beneficiario se conservan con cuenta/red/hash. Se combinan con movimientos remotos y se etiquetan en ambos historiales. |
| Verificación de extremo a extremo con Pali y fondos reales de testnet | PARCIAL | El código y el flujo pasan con un proveedor simulado. No se ha firmado ni transmitido una operación real desde una wallet del usuario. La guía del README deja los pasos exactos de Sepolia nativo y USDC; se necesita una cuenta con fondos de prueba y autorización en Pali para completar esta evidencia. |

## Punto 2 · Historial obtenido de explorador y filtrado por red

| Verificación | Estado | Corrección y evidencia |
| --- | --- | --- |
| Obtiene movimientos de una API, además del almacenamiento local | CUMPLE | Usa Blockscout REST v2 en Hoodi/Sepolia y `txlist`/`tokentx` en las otras redes compatibles. Se verificaron HTTP 200 y datos reales en v2 de Hoodi y Sepolia, sustituyendo los endpoints antiguos limitados. Las pruebas comprueban la unión con respuestas remotas y la indicación Verificado en explorador. |
| Solo muestra la cuenta y red activas | CUMPLE | Se filtra por cuenta y `networkId`; un cambio limpia resultados e invalida respuestas anteriores. Pruebas de cambios de red/cuenta y respuesta tardía. |
| Recarga automática al cambiar de red | CUMPLE | Un store compartido vuelve a consultar al cambiar cuenta/red; se verificó Sepolia → Hoodi → Sepolia, además de las consultas de API reales para zkSYS. |
| Filtros por estado | CUMPLE | Pendientes, Confirmadas, Con error y Todas en ambas vistas; Billetera conserva Recibidas/Enviadas. |
| Detalle y enlace al explorador | CUMPLE | El detalle usa la red guardada en la operación, permite copiar/descargar y conserva el foco. Prueba de diálogo y Escape. |
| Remesas etiquetadas en el historial | CUMPLE | La metadata local se une por hash/red y, en tokens, por contrato/beneficiario. Un transfer revertido conserva la etiqueta, el monto original y el estado Error. |
| Estados de carga, vacío y error con reintento | CUMPLE | Pruebas de vacío, error del proveedor, respaldo local visible, reintento y filtros sin resultados. |
| Respaldo claro si una red no tiene API compatible | CUMPLE | Bitcoin/Syscoin UTXO y redes sin adaptador muestran aviso explícito y no presentan almacenamiento local como información del explorador. Las remesas requieren una red EVM configurada. |
| Consulta independiente de clave para testnets principales | CUMPLE | Sepolia y Hoodi pasan a APIs públicas Blockscout; zkSYS mantiene su API propia. Etherscan V2 en Ethereum/Polygon sigue requiriendo clave y lo informa si falta. |

## Navegación, diseño y experiencia

| Verificación | Estado | Corrección y evidencia |
| --- | --- | --- |
| Vista exclusiva y pestaña activa | CUMPLE | `src/views/Remesas.svelte`; Billetera conserva solo su flujo cuenta a cuenta e historial. Conectar desde Remesas mantiene la sección. |
| Resumen de tres tarjetas con datos reales del historial | CUMPLE | Suma remesas confirmadas por activo, cuenta los envíos y estima ahorro desde las comisiones. Permite cargar movimientos anteriores desde Historial; sin datos muestra 0 y ayuda. |
| Beneficiarios guardados y edición/eliminación | CUMPLE | Tarjetas con iniciales, alias y dirección abreviada. Validación EVM, guardado opcional y confirmación al eliminar. |
| Cuatro pasos, validación y conservación del borrador | CUMPLE | Motivos con chips, referencia libre, revisión explícita, autorización Pali y comprobante. Atrás/Continuar probado sin perder el monto. |
| Resumen en vivo, ahorro, recepción y repetición | CUMPLE | Dos tarjetas con fuente ampliada, comisión nativa/PEN y comparación contra constante configurable. Volver a elegir carga solo nombre y dirección en el Paso 1; no copia importes ni avanza automáticamente. |
| Responsive y consistencia visual | CUMPLE | Tres columnas desde 1001 px, altura común estable en escritorio, apilado móvil, superficies/bordes/sombras existentes convertidos en tokens reutilizables. Space Grotesk en las tres vistas operativas; Inicio conserva Inter. Comprobado en navegador a 1440 y 390 px, sin desbordamiento horizontal. |
| Errores, loaders, motivos de botones deshabilitados y foco | CUMPLE | Mensajes en español para rechazo, fondos, red y token; revisión bloqueada hasta confirmar, foco al título de cada paso y foco atrapado/restaurado en el detalle. |
| Preservación de cuenta a cuenta, conexión, redes y saldo | CUMPLE en implementación | Se reutilizan servicios/stores; se corrige el provider al cambiar red y se descartan respuestas tardías de saldo. Billetera sigue mostrando el formulario e historial. La interacción real con la extensión comparte la limitación de prueba indicada en Punto 1. |

## Evidencia y límites

- `npm test`: **19/19** pruebas de servicios e integración de stores, incluidas pausa 429, conservación de resultados parciales y cursores de Blockscout v2.
- `npm run test:browser`: flujo con Chromium/Playwright y proveedor EIP-1193 simulado, sin usar fondos. Capturas y comprobante en `test-results/`, excluidos de Git.
- `npm run build`: compilación de producción. Vite puede advertir del tamaño del bundle; esa advertencia no impide compilar.
- Consultas reales de API: Sepolia/Hoodi devuelven movimientos y zkSYS devuelve una lista vacía válida para la dirección pública usada en la comprobación. También se verificó CORS desde el navegador.
- La etiqueta, alias, motivo y referencia son metadata de producto guardada en este navegador. No están escritos en el calldata de las transferencias ni en una BD; al borrar el almacenamiento se recupera la transferencia del explorador, pero no esos metadatos. No se declara persistencia entre equipos.
- Tasas PEN/precios de activos: valores de demostración configurables, rotulados como referenciales. No se ha consultado una cotización de mercado.
- No hay incumplimientos conocidos pendientes de implementación. La evidencia de una firma y confirmación reales con Pali queda **PARCIAL**, identificada de forma explícita, hasta ejecutar la prueba manual del README.

Fuentes cotejadas: [contrato oficial de USDC](https://developers.circle.com/stablecoins/usdc-contract-addresses), [recibos y espera en ethers v6](https://docs.ethers.org/v6/single-page/), [redes soportadas por Etherscan](https://docs.etherscan.io/supported-chains), [configuración oficial de Hoodi](https://github.com/eth-clients/hoodi).
