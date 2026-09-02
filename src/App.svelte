<script lang="ts">
  import { ethers } from 'ethers';

  let account: string | null = null;
  let balance: string | null = null;
  let symbol: string = '';
  let networkName: string = '';
  let provider: ethers.BrowserProvider | null = null;
  let errorMessage: string = '';
  let copied = false;

  function getEthereumProvider(): any {
    if (typeof window !== 'undefined' && 'ethereum' in window) {
      return (window as unknown as { ethereum: any }).ethereum;
    }
    return null;
  }

  function parseNetworkName(chainId: bigint, defaultName: string): string {
    const id = Number(chainId);
    switch (id) {
      case 57057:
        return 'zkSYS Mainnet';
      case 11155111:
        return 'Ethereum Sepolia';
      case 560048:
        return 'Ethereum Hoodi';
      default:
        return defaultName !== 'unknown' ? defaultName : `Chain ID: ${id}`;
    }
  }

  async function updateNetworkAndBalance(addr: string) {
    if (!provider) return;
    try {
      const rawBalance = await provider.getBalance(addr);
      balance = ethers.formatEther(rawBalance);

      const network = await provider.getNetwork();
      networkName = parseNetworkName(network.chainId, network.name);

      if (network.chainId === 57n || network.chainId === 57057n) {
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

  function formatAddress(addr: string): string {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  }

  function copyAddress() {
    if (account) {
      navigator.clipboard.writeText(account);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    }
  }
</script>

<main class="page-wrapper">
  <div class="card">
    <header class="header">
      <div class="brand-badge">
        <i class="ri-flashlight-fill"></i> InkaPay dApp
      </div>
    </header>

    {#if errorMessage}
      <div class="alert">
        <i class="ri-error-warning-line alert-icon"></i>
        <span>{errorMessage}</span>
      </div>
    {/if}

    {#if !account}
      <div class="connect-container">
        <div class="wallet-illustration">
          <i class="ri-wallet-3-line"></i>
        </div>
        <p class="connect-text">Conecta tu billetera para acceder a tu saldo y datos de red en tiempo real.</p>
        <button on:click={connectWallet} class="btn btn-connect">
          <i class="ri-key-2-line"></i> Conectar Pali Wallet
        </button>
      </div>
    {:else}
      <div class="info-container">
        <!-- Badge de Estado de Red -->
        <div class="status-bar">
          <div class="status-indicator">
            <span class="dot"></span>
            <span class="status-text">Conectado</span>
          </div>
          <div class="network-badge">
            <i class="ri-global-line"></i>
            <span>{networkName}</span>
          </div>
        </div>

        <!-- Caja de Saldo Principal -->
        <div class="balance-box">
          <span class="label"><i class="ri-bank-card-line"></i> Saldo Disponible</span>
          <div class="balance-amount">
            {balance ? parseFloat(balance).toFixed(4) : '0.0000'}
            <span class="currency">{symbol}</span>
          </div>
        </div>

        <!-- Dirección de Cuenta con Botón Copiar -->
        <div class="info-group">
          <div class="info-label-wrap">
            <i class="ri-user-3-line"></i>
            <span class="label">Dirección Pública</span>
          </div>
          <div class="address-wrapper">
            <code class="address">{formatAddress(account)}</code>
            <button class="btn-copy" on:click={copyAddress} title="Copiar dirección">
              {#if copied}
                <i class="ri-check-line success-icon"></i>
              {:else}
                <i class="ri-file-copy-line"></i>
              {/if}
            </button>
          </div>
        </div>

        <button on:click={disconnect} class="btn btn-disconnect">
          <i class="ri-logout-box-r-line"></i> Desconectar Billetera
        </button>
      </div>
    {/if}
  </div>
</main>

<style>
  @import url('https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css');

  :global(body) {
    margin: 0;
    padding: 0;
    background: radial-gradient(circle at top, #1e1b4b 0%, #0f172a 100%);
    color: #f8fafc;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
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
    background: rgba(30, 41, 59, 0.7);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    padding: 32px;
    width: 100%;
    max-width: 420px;
    box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5);
  }

  .header {
    text-align: center;
    margin-bottom: 28px;
  }

  .brand-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(99, 102, 241, 0.15);
    color: #818cf8;
    border: 1px solid rgba(99, 102, 241, 0.3);
    font-size: 0.75rem;
    font-weight: 700;
    padding: 4px 12px;
    border-radius: 20px;
    margin-bottom: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .title {
    font-size: 1.6rem;
    font-weight: 800;
    margin: 0 0 6px 0;
    color: #ffffff;
  }

  .subtitle {
    font-size: 0.85rem;
    color: #94a3b8;
    margin: 0;
  }

  .connect-container {
    text-align: center;
    padding: 10px 0;
  }

  .wallet-illustration {
    font-size: 3.5rem;
    color: #6366f1;
    margin-bottom: 12px;
  }

  .connect-text {
    font-size: 0.875rem;
    color: #94a3b8;
    margin-bottom: 24px;
    line-height: 1.5;
  }

  .info-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .status-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(15, 23, 42, 0.6);
    padding: 10px 14px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .dot {
    width: 8px;
    height: 8px;
    background-color: #22c55e;
    border-radius: 50%;
    box-shadow: 0 0 8px #22c55e;
  }

  .status-text {
    font-size: 0.8rem;
    color: #cbd5e1;
    font-weight: 600;
  }

  .network-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(56, 189, 248, 0.1);
    color: #38bdf8;
    font-weight: 600;
    font-size: 0.8rem;
    padding: 4px 10px;
    border-radius: 8px;
    border: 1px solid rgba(56, 189, 248, 0.2);
  }

  .balance-box {
    text-align: center;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%);
    border: 1px solid rgba(168, 85, 247, 0.3);
    border-radius: 16px;
    padding: 20px;
  }

  .label {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 0.75rem;
    color: #cbd5e1;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
  }

  .balance-amount {
    font-size: 2.2rem;
    font-weight: 800;
    color: #ffffff;
    margin-top: 6px;
    line-height: 1;
  }

  .currency {
    font-size: 1.1rem;
    color: #a855f7;
    font-weight: 700;
  }

  .info-group {
    background: rgba(15, 23, 42, 0.6);
    padding: 12px 16px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .info-label-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #94a3b8;
  }

  .address-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .address {
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    font-size: 0.875rem;
    color: #38bdf8;
    font-weight: 600;
  }

  .btn-copy {
    background: transparent;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    padding: 4px;
    font-size: 1rem;
    transition: color 0.2s;
  }

  .btn-copy:hover {
    color: #ffffff;
  }

  .success-icon {
    color: #22c55e;
  }

  .btn {
    width: 100%;
    padding: 14px 20px;
    border: none;
    border-radius: 12px;
    font-weight: 700;
    font-size: 0.95rem;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.2s ease;
  }

  .btn-connect {
    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
    color: #ffffff;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  }

  .btn-connect:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
  }

  .btn-disconnect {
    background: rgba(239, 68, 68, 0.1);
    color: #f87171;
    border: 1px solid rgba(239, 68, 68, 0.2);
  }

  .btn-disconnect:hover {
    background: rgba(239, 68, 68, 0.2);
  }

  .alert {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #fca5a5;
    padding: 12px 16px;
    border-radius: 12px;
    font-size: 0.85rem;
    margin-bottom: 16px;
  }

  .alert-icon {
    font-size: 1.2rem;
  }
</style>