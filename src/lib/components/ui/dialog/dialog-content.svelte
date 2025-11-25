<script lang="ts">
	import { Dialog as DialogPrimitive, type WithoutChildrenOrChild } from "bits-ui";
	import X from "@lucide/svelte/icons/x";
	import type { Snippet } from "svelte";
	import * as Dialog from "./index";
	import { clsx } from "clsx";
	import { locale, translate } from "$lib/i18n";

	let {
		ref = $bindable(null),
		class: className,
		portalProps,
		children,
		...restProps
	}: WithoutChildrenOrChild<DialogPrimitive.ContentProps> & {
		portalProps?: DialogPrimitive.PortalProps;
		children: Snippet;
	} = $props();
	const t = (key: string) => translate($locale, key);
</script>

<Dialog.Portal {...portalProps}>
	<Dialog.Overlay />
	<DialogPrimitive.Content bind:ref class={clsx("dialog-content", className)} {...restProps}>
		{@render children?.()}
		<DialogPrimitive.Close class="dialog-close">
			<X size={16} />
			<span class="sr-only">{t("dialog.close")}</span>
		</DialogPrimitive.Close>
	</DialogPrimitive.Content>
</Dialog.Portal>
