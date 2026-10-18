<script>
  export let network;
  $: ethereum = ['ETH'].includes(network?.symbol);
</script>

<span class="network-mark" class:polygon={network?.id === 'polygon'} aria-hidden="true">
  {#if ethereum}<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1 5 12l7 4 7-4-7-11Z"/><path d="m5 14 7 9 7-9-7 4-7-4Z" opacity=".65"/></svg>
  {:else if network?.id === 'polygon'}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="m9 5-5 3v6l5 3 5-3v-4l5-3 4 3v6l-5 3-4-2M9 5l5 3v3M4 14l5-3 5 3" transform="translate(-1 0)"/></svg>
  {:else if network?.id === 'bitcoin'}<i class="ri-bit-coin-fill"></i>
  {:else}<span>{network?.icon || '◈'}</span>{/if}
</span>

<style>
  .network-mark{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;flex:none;background:var(--bg-card);color:var(--accent-primary);font:700 1rem var(--font-heading)}.polygon{color:var(--accent-secondary)}svg{width:19px;height:21px}.network-mark i{font-size:1.3rem}
</style>
