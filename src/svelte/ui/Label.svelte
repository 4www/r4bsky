<script>
  const { forId = '' } = $props()
</script>

<label for={forId}><slot /></label>

