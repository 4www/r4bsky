<script lang="ts">
  import { bskyOAuth } from '$lib/services/bsky-oauth';
  import { session } from '$lib/state/session';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { LogOut, Shield, User, Loader2 } from 'lucide-svelte';

  let working = $state(false);
  let handle = $state('');

  async function signOut() {
    try {
      working = true;
      await bskyOAuth.signOut();
      session.refresh();
      location.hash = '#/';
    } catch (e) {
      console.error(e);
    } finally {
      working = false;
    }
  }

  async function managePermissions() {
    try {
      working = true;
      await bskyOAuth.requestScopes();
    } catch (e) {
      console.error(e);
    } finally {
      working = false;
    }
  }

  async function handleSignIn(e) {
    e.preventDefault();
    if (handle) {
      working = true;
      try {
        await bskyOAuth.signIn(handle);
        session.refresh();
      } catch (e) {
        console.error(e);
      } finally {
        working = false;
      }
    }
  }
</script>

<div class="container max-w-2xl py-8">
  <div class="mb-6">
    <h1 class="text-3xl font-bold">Settings</h1>
    <p class="text-muted-foreground mt-1">Manage your account and permissions</p>
  </div>

  {#if $session?.did}
    <div class="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <User class="h-5 w-5" />
            Account
          </CardTitle>
          <CardDescription>Your Bluesky account information</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <Label>Handle</Label>
            <div class="text-sm font-mono bg-muted px-3 py-2 rounded-md">
              @{$session.handle || 'Loading...'}
            </div>
          </div>
          <div class="space-y-2">
            <Label>DID</Label>
            <div class="text-sm font-mono bg-muted px-3 py-2 rounded-md break-all">
              {$session.did}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <Shield class="h-5 w-5" />
            Permissions
          </CardTitle>
          <CardDescription>
            Manage app permissions for accessing your Bluesky data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onclick={managePermissions} disabled={working} variant="outline" class="w-full">
            {#if working}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              Processing...
            {:else}
              <Shield class="mr-2 h-4 w-4" />
              Manage Permissions
            {/if}
          </Button>
          <p class="text-xs text-muted-foreground mt-3">
            You'll be redirected to Bluesky to update your permissions
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-destructive flex items-center gap-2">
            <LogOut class="h-5 w-5" />
            Sign Out
          </CardTitle>
          <CardDescription>
            Sign out from your Bluesky account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onclick={signOut} disabled={working} variant="destructive" class="w-full">
            {#if working}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              Signing out...
            {:else}
              <LogOut class="mr-2 h-4 w-4" />
              Sign Out
            {/if}
          </Button>
        </CardContent>
      </Card>
    </div>
  {:else}
    <Card>
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>
          Sign in with your Bluesky account to start sharing music
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onsubmit={handleSignIn} class="space-y-4">
          <div class="space-y-2">
            <Label for="signin-handle">Bluesky Handle</Label>
            <Input
              id="signin-handle"
              name="handle"
              type="text"
              bind:value={handle}
              placeholder="your-handle.bsky.social"
              disabled={working}
            />
          </div>
          <Button type="submit" class="w-full" disabled={working || !handle.trim()}>
            {#if working}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            {:else}
              Sign In with Bluesky
            {/if}
          </Button>
        </form>
      </CardContent>
    </Card>
  {/if}
</div>
