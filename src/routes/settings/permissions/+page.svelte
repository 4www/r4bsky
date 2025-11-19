<script lang="ts">
  import { bskyOAuth } from '$lib/services/bsky-oauth';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Loader2, Shield } from 'lucide-svelte';

  let working = $state(false);
  let permissionError = $state('');

  async function managePermissions() {
    try {
      working = true;
      permissionError = '';
      console.log('Requesting permissions...');
      await bskyOAuth.requestScopes();
      console.log('Permissions requested (should have redirected)');
      // If we reach here without redirect, something went wrong
      permissionError = 'Expected to redirect but did not. Check console for errors.';
    } catch (e) {
      console.error('Permission request error:', e);
      permissionError = String(e?.message || e || 'Failed to request permissions');
    } finally {
      working = false;
    }
  }
</script>

<div class="space-y-6">
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center gap-2">
        <Shield class="h-5 w-5" />
        App Permissions
      </CardTitle>
      <CardDescription>
        Manage access permissions for Radio4000
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-3">
      <div class="rounded-lg bg-muted/50 p-3 text-sm space-y-2">
        <p class="font-semibold mb-2">AT Protocol Permissions:</p>
        <div class="space-y-2 text-xs">
          <div class="border-l-2 border-primary/50 pl-2">
            <p class="font-mono text-foreground">com.radio4000.track</p>
            <p class="text-muted-foreground">Actions: create, update, delete</p>
          </div>
          <div class="border-l-2 border-primary/50 pl-2">
            <p class="font-mono text-foreground">com.radio4000.favorite</p>
            <p class="text-muted-foreground">Actions: create, delete</p>
          </div>
          <div class="border-l-2 border-primary/50 pl-2">
            <p class="font-mono text-foreground">app.bsky.graph.follow</p>
            <p class="text-muted-foreground">Actions: create, delete</p>
          </div>
          <div class="border-l-2 border-primary/50 pl-2">
            <p class="font-mono text-foreground">com.radio4000.profile</p>
            <p class="text-muted-foreground">Actions: create, update, delete</p>
          </div>
        </div>
      </div>
      <Button onclick={managePermissions} disabled={working} variant="outline" class="w-full">
        {#if working}
          <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          Requesting permissions...
        {:else}
          <Shield class="mr-2 h-4 w-4" />
          Request Permissions
        {/if}
      </Button>
      <p class="text-xs text-muted-foreground">
        This will redirect you to your server to grant Radio4000 specific permissions. Use this if features aren't working or you want to review access.
      </p>
      {#if permissionError}
        <div class="rounded-md bg-destructive/15 p-3 text-sm text-foreground/70">
          {permissionError}
        </div>
      {/if}
    </CardContent>
  </Card>
</div>
