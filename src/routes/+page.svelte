<script lang="ts">
  import { bskyOAuth } from '$lib/services/bsky-oauth';
  import { session } from '$lib/state/session';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import TimelineTracks from './TimelineTracks.svelte';

  let handle = $state('');
  let error = $state('');
  let signingIn = $state(false);

  async function handleSignIn() {
    if (!handle.trim()) {
      error = 'Please enter your handle';
      return;
    }

    error = '';
    signingIn = true;

    try {
      await bskyOAuth.signIn(handle.trim());
    } catch (err) {
      error = (err as Error)?.message || 'Sign in failed';
      signingIn = false;
    }
  }

  const isAuthenticated = $derived($session && $session.did);
</script>

{#if isAuthenticated}
  <TimelineTracks />
{:else}
  <div class="container mx-auto max-w-md mt-16 px-4">
    <Card>
      <CardHeader>
        <CardTitle>Welcome to R4 AT Protocol</CardTitle>
        <CardDescription>
          Share and discover music tracks on Bluesky
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onsubmit={(e) => { e.preventDefault(); handleSignIn(); }} class="space-y-4">
          <div class="space-y-2">
            <Label for="handle">Your Bluesky Handle</Label>
            <Input
              id="handle"
              type="text"
              placeholder="alice.bsky.social"
              bind:value={handle}
              disabled={signingIn}
            />
          </div>

          {#if error}
            <div class="text-sm text-destructive">{error}</div>
          {/if}

          <Button type="submit" class="w-full" disabled={signingIn}>
            {signingIn ? 'Signing in...' : 'Sign in with Bluesky'}
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
{/if}
