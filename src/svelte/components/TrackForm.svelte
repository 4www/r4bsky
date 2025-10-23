<script>
  import { fetchOEmbed } from '../../libs/oembed.js'
  const props = $props()
  const initialProp = $derived(props.initial || { url: '', title: '', description: '', discogs_url: '' })
  const submitText = $derived(props.submitLabel || 'Save')
  const onSubmit = $derived(props.onSubmit || null)

  let url = $state(initialProp.url || '')
  let title = $state(initialProp.title || '')
  let description = $state(initialProp.description || '')
  let discogs_url = $state(initialProp.discogs_url || initialProp.discogsUrl || '')
  let status = $state('')
  let prefilled = $state(false)

  // Populate from initial when it arrives (edit case)
  $effect(() => {
    if (!prefilled && (initialProp.url || initialProp.title || initialProp.description || initialProp.discogs_url || initialProp.discogsUrl)) {
      url = initialProp.url || ''
      title = initialProp.title || ''
      description = initialProp.description || ''
      discogs_url = initialProp.discogs_url || initialProp.discogsUrl || ''
      prefilled = true
    }
  })

  // Autofill title from oEmbed on create when URL present and title empty
  $effect(() => {
    if (url && !title) {
      ;(async () => {
        try {
          const data = await fetchOEmbed(url)
          if (data?.title && !title) title = data.title
        } catch (_) {}
      })()
    }
  })

  async function submit(e) {
    e?.preventDefault?.()
    status = ''
    try {
      const res = await onSubmit?.({ url, title, description, discogs_url })
      return res
    } catch (err) {
      status = err?.message || String(err)
    }
  }
</script>

<form onsubmit={submit}>
  <fieldset>
    <legend><label for="url">Track URL</label></legend>
    <input id="url" name="url" type="url" bind:value={url} required />
  </fieldset>
  <fieldset>
    <legend><label for="title">Title</label></legend>
    <input id="title" name="title" type="text" bind:value={title} required />
  </fieldset>
  <fieldset>
    <legend><label for="description">Description (optional)</label></legend>
    <textarea id="description" name="description" bind:value={description}></textarea>
  </fieldset>
  <fieldset>
    <legend><label for="discogs_url">Discogs URL (optional)</label></legend>
    <input id="discogs_url" name="discogs_url" type="url" bind:value={discogs_url} />
  </fieldset>
  <fieldset>
    <button type="submit">{submitText}</button>
  </fieldset>
  {#if status}<output>{status}</output>{/if}
  
</form>
