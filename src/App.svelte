<script lang="ts">
  import { ethers } from 'ethers';

  let account: string | null = null;
  let balance: string | null = null;
  let symbol: string = '';
  let networkName: string = '';
  let provider: ethers.BrowserProvider | null = null;
  let errorMessage: string = '';

  function getEthereumProvider(): any {
    if (typeof window !== 'undefined' && 'ethereum' in window) {
      return (window as unknown as { ethereum: any }).ethereum;
    }
    return null;
  }

  // Mapeo manual para asegurar nombres legibles según ChainId de la red
  function parseNetworkName(chainId: bigint, defaultName: string): string {
    const id = Number(chainId);
    switch (id) {
      case 57:
        return 'Syscoin Mainnet';
      case 570:
        return 'zkSYS Mainnet';
      case 11155111:
        return 'Ethereum Sepolia';
      case 17000:
        return 'Ethereum Holesky';
      case 1:
        return 'Ethereum Mainnet';
      default:
        // Si no está mapeada manualmente, muestra el nombre que reporta el provider o el ID
        return defaultName !== 'unknown' ? defaultName : `Chain ID: ${id}`;
    }
  }

  async function updateNetworkAndBalance(addr: string) {
    if (!provider) return;
    try {
      // 1. Obtener el saldo de la red activa
      const rawBalance = await provider.getBalance(addr);
      balance = ethers.formatEther(rawBalance);

      // 2. Obtener la red actual
      const network = await provider.getNetwork();
      
      // Asignar Nombre de Red y Símbolo
      networkName = parseNetworkName(network.chainId, network.name);

      if (network.chainId === 57n || network.chainId === 570n) {
        symbol = 'SYS';
      } else {
        symbol = 'ETH';
      }
    } catch (error: any) {
      errorMessage = 'Error actualizando red y saldo: ' + (error?.message || 'Error desconocido');
    }
  }

  async function connectWallet(): Promise<void> {
    errorMessage = '';
    const ethProvider = getEthereumProvider();

    if (!ethProvider) {
      errorMessage = 'Pali Wallet no está instalada en tu navegador.';
      return;
    }

    try {
      provider = new ethers.BrowserProvider(ethProvider);
      const accounts: string[] = await provider.send('eth_requestAccounts', []);
      
      if (accounts.length > 0) {
        account = accounts[0];
        await updateNetworkAndBalance(account);

        // Eventos en tiempo real
        ethProvider.on('chainChanged', async () => {
          if (account && ethProvider) {
            provider = new ethers.BrowserProvider(ethProvider);
            await updateNetworkAndBalance(account);
          }
        });

        ethProvider.on('accountsChanged', async (newAccounts: string[]) => {
          if (newAccounts.length > 0) {
            account = newAccounts[0];
            await updateNetworkAndBalance(account);
          } else {
            disconnect();
          }
        });
      }
    } catch (error: any) {
      errorMessage = 'Error al conectar Pali Wallet: ' + (error?.message || 'Error desconocido');
    }
  }

  function disconnect(): void {
    account = null;
    balance = null;
    provider = null;
    symbol = '';
    networkName = '';
  }
</script>

<main class="page-wrapper">
  <div class="card">
    <header class="header">
      <h1 class="title">Demo Pali Wallet + Svelte 🚀</h1>
      <p class="subtitle">InkaPay dApp - Sistemas Distribuidos</p>
    </header>

    {#if errorMessage}
      <div class="alert">{errorMessage}</div>
    {/if}

    {#if !account}
      <button on:click={connectWallet} class="btn btn-connect">
        🔐 Iniciar sesión con Pali Wallet
      </button>
    {:else}
      <div class="info-container">
        <div class="info-group">
          <span class="label">🌐 Red Conectada:</span>
          <span class="network-badge">{networkName}</span>
        </div>

        <div class="info-group">
          <span class="label">📬 Dirección:</span>
          <code class="address">{account}</code>
        </div>

        <div class="info-group balance-box">
          <span class="label">💰 Saldo Disponible:</span>
          <p class="balance">{balance ? parseFloat(balance).toFixed(4) : '0'} <span class="currency">{symbol}</span></p>
        </div>

        <button on:click={disconnect} class="btn btn-disconnect">
          Desconectar
        </button>
      </div>
    {/if}
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background-color: #0f172a;
    color: #f8fafc;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .page-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 20px;
    box-sizing: border-box;
  }

  .card {
    background-color: #1e293b;
    border: 1px solid #334155;
    border-radius: 16px;
    padding: 32px;
    width: 100%;
    max-width: 460px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
    text-align: center;
  }

  .header {
    margin-bottom: 24px;
  }

  .title {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0 0 8px 0;
    line-height: 1.2;
    color: #ffffff;
  }

  .subtitle {
    font-size: 0.875rem;
    color: #94a3b8;
    margin: 0;
  }

  .info-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .info-group {
    text-align: left;
    background-color: #0f172a;
    padding: 12px 16px;
    border-radius: 8px;
    border: 1px solid #334155;
  }

  .label {
    display: block;
    font-size: 0.75rem;
    color: #94a3b8;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .network-badge {
    display: inline-block;
    background-color: #0284c7;
    color: #ffffff;
    font-weight: 600;
    font-size: 0.85rem;
    padding: 2px 8px;
    border-radius: 4px;
  }

  .address {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.825rem;
    color: #38bdf8;
    word-break: break-all;
  }

  .balance-box {
    text-align: center;
    background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
    border-color: #4338ca;
  }

  .balance {
    font-size: 2rem;
    font-weight: 800;
    color: #4ade80;
    margin: 0;
    line-height: 1.1;
  }

  .currency {
    font-size: 1rem;
    color: #cbd5e1;
    font-weight: 600;
  }

  .btn {
    width: 100%;
    padding: 12px 20px;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.95rem;
    cursor: pointer;
    transition: background-color 0.2s ease, transform 0.1s ease;
  }

  .btn:active {
    transform: scale(0.98);
  }

  .btn-connect {
    background-color: #3b82f6;
    color: #ffffff;
  }

  .btn-connect:hover {
    background-color: #2563eb;
  }

  .btn-disconnect {
    background-color: #ef4444;
    color: #ffffff;
    margin-top: 8px;
  }

  .btn-disconnect:hover {
    background-color: #dc2626;
  }

  .alert {
    background-color: rgba(239, 68, 68, 0.1);
    border: 1px solid #ef4444;
    color: #fca5a5;
    padding: 10px;
    border-radius: 6px;
    font-size: 0.85rem;
    margin-bottom: 16px;
  }
</style>