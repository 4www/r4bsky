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
    <DialogOverlay class="fixed inset-0 z-50 bg-black/80" />
    <DialogContent class="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg">
      <DialogHeader>
        <DialogTitle class="text-lg font-semibold">{title}</DialogTitle>
      </DialogHeader>
      <div class="mt-4">
        {@render children()}
      </div>
    </DialogContent>
  </DialogPortal>
</DialogRoot>
