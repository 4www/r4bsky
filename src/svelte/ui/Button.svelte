<script>
  export let type = 'button'
  export let variant = 'default' // default | outline | ghost
  export let size = 'md' // sm | md | lg
  export let href = ''
  let base = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'
  let sizes = {
    sm: 'h-8 px-3',
    md: 'h-9 px-4',
    lg: 'h-10 px-6'
  }
  let variants = {
    default: 'bg-black text-white hover:bg-black/90 focus:ring-black',
    outline: 'border border-neutral-300 hover:bg-neutral-50 focus:ring-neutral-300',
    ghost: 'hover:bg-neutral-100'
  }
</script>

{#if href}
  <a href={href} class={`${base} ${sizes[size]} ${variants[variant]}`}><slot /></a>
{:else}
  <button {type} class={`${base} ${sizes[size]} ${variants[variant]}`}><slot /></button>
{/if}

