<script>
  export let onConnect = () => {};
</script>

<button class="primary-btn" onclick={onConnect}>Conectar wallet</button>

<style>
  .primary-btn {
    border: 0;
    border-radius: 12px;
    padding: 12px 18px;
    background: var(--accent-primary);
    color: #0a2430;
    font-weight: 700;
    box-shadow: 0 8px 24px rgba(34, 211, 238, 0.15);
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .primary-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 28px rgba(34, 211, 238, 0.28);
  }
</style>
