<script>
  import { onMount } from 'svelte'
  import Skeleton from './Skeleton.svelte'

  export let variant = 'wallet'
  export let connected = false
  let loading = true
  // Transición de entrada independiente del RPC: las consultas se inician al montar el contenido.
  onMount(() => {
    const timer = setTimeout(() => loading = false, 500)
    return () => clearTimeout(timer)
  })
</script>

{#if loading}
  <div class="finance-skeleton" class:remittances={variant === 'remittances'} role="status" aria-label={variant === 'remittances' ? 'Cargando Remesas' : 'Cargando Billetera'} aria-busy="true">
    <div class="skeleton-shape" aria-hidden="true">
      {#if variant === 'wallet'}
        <div class="panel banner">
          <div class="line"><Skeleton width="100px" height="24px" radius="20px" /><Skeleton width="150px" height="24px" radius="20px" delay={60} /></div>
          <div class="banner-body"><div class="group"><Skeleton width="120px" height="12px" /><Skeleton width="min(260px,100%)" height="22px" delay={100} /><Skeleton width="180px" height="12px" /></div><div class="group balance"><Skeleton width="120px" height="12px" /><Skeleton width="180px" height="38px" delay={120} /></div></div>
        </div>
      {:else}
        <div class="metrics">{#each [0, 1, 2] as item}<div class="panel metric"><Skeleton width="40%" height="12px" delay={item * 70} /><Skeleton width="32%" height="22px" delay={item * 70 + 40} /><Skeleton width="68%" height="11px" delay={item * 70 + 80} /></div>{/each}</div>
      {/if}
      {#if connected || variant === 'wallet'}
        <div class="workspace" class:wallet={variant === 'wallet'}>
          {#if variant === 'wallet'}
            <div class="stack wallet-stack">
              <div class="panel network"><Skeleton width="140px" height="18px" /><Skeleton height="46px" radius="12px" delay={120} /></div>
              <div class="panel form"><Skeleton width="65%" height="24px" /><Skeleton width="80%" height="12px" /><div class="fields">{#each [0, 1] as item}<div class="group"><Skeleton width="32%" height="12px" /><Skeleton height="40px" radius="12px" delay={150 + item * 90} /></div>{/each}</div><div class="footer"><Skeleton height="38px" radius="12px" delay={300} /></div></div>
            </div>
            <div class="panel history"><Skeleton width="50%" height="20px" /><div class="line">{#each [0, 1, 2] as item}<Skeleton width="22%" height="30px" delay={item * 50} />{/each}</div>{#each [0, 1, 2] as item}<Skeleton height="64px" radius="12px" delay={150 + item * 90} />{/each}</div>
          {:else}
            <div class="panel form"><div class="line">{#each [0, 1, 2, 3] as item}<Skeleton width="22%" height="26px" delay={item * 40} />{/each}</div><Skeleton width="55%" height="22px" /><Skeleton width="80%" height="12px" /><div class="fields">{#each [0, 1] as item}<div class="group"><Skeleton width="35%" height="12px" /><Skeleton height="42px" radius="12px" delay={140 + item * 90} /><Skeleton width="75%" height="10px" /></div>{/each}</div><div class="footer"><Skeleton height="38px" radius="12px" delay={300} /></div></div>
            <div class="stack information"><div class="panel tabs"><Skeleton width="48%" height="30px" /><Skeleton width="48%" height="30px" delay={80} /></div>{#each [0, 1] as card}<div class="panel summary"><Skeleton width="65%" height="20px" delay={card * 80} />{#each [0, 1, 2, 3] as row}<div class="line"><Skeleton width="32%" height="12px" delay={row * 50} /><Skeleton width="40%" height="12px" delay={row * 50 + 60} /></div>{/each}</div>{/each}</div>
            <div class="panel contacts"><Skeleton width="60%" height="12px" /><Skeleton width="90%" height="18px" /><div class="contact"><Skeleton width="32px" height="32px" circle /><div class="group"><Skeleton width="70%" height="14px" /><Skeleton width="90%" height="10px" /></div></div></div>
          {/if}
        </div>
      {:else}
        <div class="panel empty"><Skeleton width="56px" height="56px" circle /><Skeleton width="min(340px,80%)" height="24px" /><Skeleton width="min(480px,90%)" height="14px" /><Skeleton width="180px" height="42px" radius="12px" /></div>
      {/if}
    </div>
  </div>
{/if}
<!-- El contenido permanece montado: no se reinician consultas ni se pierde estado al terminar la transición. -->
<div class="loaded-content" hidden={loading} inert={loading}><slot /></div>

<style>
  .loaded-content{display:contents}.loaded-content[hidden]{display:none}
  .finance-skeleton{flex:1;min-width:0;min-height:0;display:flex}
  .skeleton-shape{display:flex;flex-direction:column;gap:16px;flex:1;min-width:0;min-height:0}
  .panel{background:var(--surface-panel);border:1px solid var(--border-panel);border-radius:var(--radius-panel);padding:20px;min-width:0;min-height:0;display:flex;flex-direction:column;gap:16px;overflow:hidden}
  .line{display:flex;align-items:center;justify-content:space-between;gap:12px}.group{display:flex;flex-direction:column;gap:10px;min-width:0}
  .banner{flex:none;gap:12px;padding:16px 20px}.banner>.line{justify-content:flex-start;padding-bottom:12px;border-bottom:1px solid var(--border-panel)}.banner-body{display:flex;justify-content:space-between;gap:24px}.balance{align-items:flex-end}
  .workspace{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1.3fr) minmax(0,.85fr);gap:var(--remittance-gap,24px)}
  .workspace.wallet{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
  .stack{min-width:0;min-height:0;display:grid;gap:16px}.wallet-stack{grid-template-rows:auto minmax(0,1fr)}.information{grid-template-rows:auto repeat(2,minmax(0,1fr));gap:var(--remittance-gap,24px)}
  .network{gap:12px}.form{gap:18px}.fields{display:grid;gap:20px;margin-top:12px}.footer{margin-top:auto;padding-top:16px;border-top:1px solid var(--border-panel)}
  .metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--remittance-gap,24px);flex:none}.metric{padding:10px 16px;gap:5px;border-radius:14px}.tabs{flex-direction:row;justify-content:space-between;padding:8px;gap:8px}.summary{gap:18px}.contact{display:flex;align-items:center;gap:10px;padding:12px;border:1px solid var(--border-input);border-radius:12px}.contact .group{flex:1}.empty{align-items:center;justify-content:center;min-height:320px}
  @media(min-width:1001px) and (max-height:800px){.panel{padding:12px;gap:12px}.metric{padding:8px 12px;gap:4px}.metric :global(.skeleton:last-child){display:none}.banner{padding:10px 14px}.banner>.line{padding-bottom:6px}.tabs{padding:6px}.fields{gap:14px;margin-top:6px}.summary{gap:12px}}
  @media(max-width:1000px){.finance-skeleton{flex:none;display:block}.workspace{grid-template-columns:repeat(2,minmax(0,1fr))}.workspace>.form{grid-column:1/-1;min-height:420px}.information,.contacts{min-height:400px}.workspace.wallet{grid-template-columns:1fr}.wallet-stack .form{min-height:300px}.history{min-height:360px}.metric{padding:16px}}
  @media(max-width:700px){.workspace{grid-template-columns:1fr}.metrics{grid-template-columns:1fr}.information,.contacts{min-height:360px}.banner-body{flex-direction:column}.balance{align-items:flex-start}.panel{padding:16px}}
</style>
