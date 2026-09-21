# InkaPay · Demo Svelte + Vite

InkaPay es una DApp educativa para explorar una wallet blockchain no custodial orientada a remesas y pagos de bajo costo en Perú.

## Estructura

- `src/lib/services/evmWallet.js`: conexión EVM con ethers.js v6, saldo, eventos, cambio de red y signer.
- `src/lib/services/utxoWallet.js`: adaptador aislado para la API UTXO de `window.pali`.
- `src/lib/stores/wallet.js` y `src/lib/stores/network.js`: estado global reactivo.
- `src/lib/config/networks.js`: redes EVM/UTXO, RPC, símbolos y exploradores.
- `src/lib/components/`: conexión, dirección, saldo, selector de red y formulario de transacción.
- `src/routes/`: landing (`Home`), dashboard (`Dashboard`) y gestión de redes (`Networks`).
- `src/App.svelte`: navegación y composición, sin lógica de negocio.

## Ejecutar

```bash
npm install
npm run dev
```

Para probar la conexión y las transacciones, instala/desbloquea Pali Wallet y usa una red EVM de prueba como Sepolia. La primera vez que cambies a una red no agregada, Pali mostrará la aprobación de `wallet_addEthereumChain`.

## Funcionalidades nuevas

1. **Inicio:** navega por Descripción, Objetivos, Beneficios, Características y Desarrollador.
2. **Transacciones:** en Dashboard conecta Pali, escribe una dirección y monto, firma con `signer.sendTransaction()`, y sigue el hash desde Pendiente hasta Confirmada.
3. **Cambio de red:** en Redes se separan EVM y UTXO. EVM usa `wallet_switchEthereumChain` y captura 4902 para agregar la red. Pali documenta la lectura UTXO mediante `wallet_getNetwork`, `wallet_getAddress` y `wallet_getBalance`; el adaptador intenta variantes de switch cuando están disponibles y muestra una instrucción útil cuando la extensión no lo soporta.
4. **Consulta de saldo:** Dashboard permite consultar un address externo vía `JsonRpcProvider` y consultar en paralelo todas las redes EVM configuradas con `Promise.all`.

La lista EVM incluye Rollux, Syscoin NEVM, Ethereum Mainnet, Polygon Mainnet, Syscoin NEVM Testnet, zkSYS, Ethereum Hoodi y Ethereum Sepolia. La conexión EVM usa el estándar EIP-1193, por lo que funciona con Pali Wallet y MetaMask cuando cualquiera de ellas está inyectada en `window.ethereum`. La consulta multi-red incluye además Syscoin UTXO Mainnet/Testnet mediante Blockbook cuando se proporciona un address UTXO compatible.

El formulario de envío normaliza el monto con `ethers.toBeHex(ethers.parseEther(String(monto)))`, evitando el error de Pali `value must be a string` al enviar, por ejemplo, 1 ETH.

La imagen placeholder del desarrollador se encuentra en `src/assets/dev-photo.jpg`.
