<script>
  const { type = 'text', value = '', placeholder = '', name = '' } = $props()
  let v = value
  $effect(() => { v = value })
  function onInput(e) { v = e.target.value; dispatchEvent(new CustomEvent('input')) }
</script>

<input {type} bind:value={v} {placeholder} {name} />

