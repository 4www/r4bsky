<script lang="ts">
  import { Dialog as DialogRoot, DialogContent, DialogHeader, DialogTitle, DialogOverlay, DialogPortal } from './dialog/index';

  let { title, onClose, children } = $props();
  let open = $state(true);

  $effect(() => {
    if (!open && onClose) {
      onClose();
    }
  });
</script>

<DialogRoot bind:open={open}>
  <DialogPortal>
    <DialogOverlay />
    <DialogContent>
      <DialogHeader>
        <DialogTitle class="dialog-title">{title}</DialogTitle>
      </DialogHeader>
      <div class="dialog-body">
        {@render children()}
      </div>
    </DialogContent>
  </DialogPortal>
</DialogRoot>

<style>
  .dialog-title {
    font-size: var(--font-size-2);
    font-weight: var(--font-weight-6);
  }
  .dialog-body {
    margin-top: var(--size-4);
  }
</style>
