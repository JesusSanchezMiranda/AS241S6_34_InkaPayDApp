<script>
  export let step = 1
  export let compact = false
  const labels = ['Beneficiario', 'Monto', 'Revisión', 'Comprobante']
</script>

<ol class:compact aria-label="Progreso de la remesa">
  {#each labels as label, index}<li class:active={step === index + 1} class:done={step > index + 1} aria-current={step === index + 1 ? 'step' : undefined}><span aria-hidden="true">{step > index + 1 ? '✓' : index + 1}</span><small>{label}</small></li>{/each}
</ol>

<style>
  ol{list-style:none;padding:0;margin:0 0 var(--space-6);display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--space-2)}li{display:flex;flex-direction:column;align-items:center;gap:var(--space-2);color:var(--text-secondary);border-bottom:2px solid var(--border-input);padding-bottom:var(--space-3);min-width:0}li span{display:grid;place-items:center;border:1px solid var(--border-input);width:32px;height:32px;border-radius:50%;font-weight:700}.active{color:var(--accent-primary);border-color:var(--accent-primary)}.active span{border-color:var(--accent-primary)}.done{color:var(--accent-success);border-color:var(--accent-success)}small{font-size:.75rem}@media(max-width:400px){small{font-size:.65rem}}
  @media(min-width:1001px){.compact{margin:0;gap:6px}.compact li{flex-direction:row;justify-content:center;gap:5px;padding-bottom:7px}.compact li span{width:22px;height:22px;font-size:.65rem;flex:none}.compact small{font-size:.62rem}}
</style>
