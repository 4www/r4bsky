<script lang="ts">
  import { User } from 'lucide-svelte';
  import { clsx } from 'clsx';

  const {
    src = '',
    alt = '',
    size = 'md',
    class: extraClass = '',
  } = $props();

  const iconSizes = { sm: 16, md: 24, lg: 32, xl: 48 };

  let imageLoaded = $state(!!src);
  let imageError = $state(false);

  function handleLoad() {
    imageLoaded = true;
    imageError = false;
  }

  function handleError() {
    imageError = true;
    imageLoaded = false;
  }
</script>

{#if src && !imageError}
  <img
    {src}
    {alt}
    class={clsx('avatar', `avatar-${size}`, extraClass)}
    onload={handleLoad}
    onerror={handleError}
  />
{:else}
  <div class={clsx('avatar', `avatar-${size}`, extraClass)}>
    <User size={iconSizes[size]} />
  </div>
{/if}

<style>
  .avatar {
    border-radius: var(--radius-round);
    border: 2px solid var(--border);
    object-fit: cover;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .avatar-sm { width: 2rem; height: 2rem; }
  .avatar-md { width: 3rem; height: 3rem; }
  .avatar-lg { width: 4rem; height: 4rem; }
  .avatar-xl { width: 6rem; height: 6rem; }
</style>
