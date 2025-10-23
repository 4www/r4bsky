<script>
  const { value = '', placeholder = '', name = '' } = $props()
  let v = value
  $effect(() => { v = value })
</script>

<textarea bind:value={v} {placeholder} {name}></textarea>

