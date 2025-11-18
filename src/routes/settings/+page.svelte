<script lang="ts">
  import { bskyOAuth } from '$lib/services/bsky-oauth';
  import { session } from '$lib/state/session';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { LogOut, Shield, User, Loader2 } from 'lucide-svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { locale as localeStore, translate, availableLocales } from '$lib/i18n';

  let working = $state(false);
  let handle = $state('');
  const t = (key, vars = {}) => translate($localeStore, key, vars);

  async function signOut() {
    try {
      working = true;
      await bskyOAuth.signOut();
      session.refresh();
      goto(resolve('/'));
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
    <h1 class="text-3xl font-bold">{t('settings.title')}</h1>
    <p class="text-muted-foreground mt-1">{t('settings.description')}</p>
  </div>

  <div class="space-y-4">
    {#if $session?.did}
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <User class="h-5 w-5" />
            {t('settings.accountTitle')}
          </CardTitle>
          <CardDescription>{t('settings.accountDescription')}</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <Label>{t('settings.handleLabel')}</Label>
            <div class="text-sm font-mono bg-muted px-3 py-2 rounded-md">
              @{$session.handle || '...'}
            </div>
          </div>
          <div class="space-y-2">
            <Label>{t('settings.didLabel')}</Label>
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
            {t('settings.permissionsTitle')}
          </CardTitle>
          <CardDescription>
            {t('settings.permissionsDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onclick={managePermissions} disabled={working} variant="outline" class="w-full">
            {#if working}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              {t('settings.permissionsWorking')}
            {:else}
              <Shield class="mr-2 h-4 w-4" />
              {t('settings.permissionsButton')}
            {/if}
          </Button>
          <p class="text-xs text-muted-foreground mt-3">
            {t('settings.permissionsFootnote')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-destructive flex items-center gap-2">
            <LogOut class="h-5 w-5" />
            {t('settings.signOutTitle')}
          </CardTitle>
          <CardDescription>
            {t('settings.signOutDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onclick={signOut} disabled={working} variant="destructive" class="w-full">
            {#if working}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              {t('settings.signOutWorking')}
            {:else}
              <LogOut class="mr-2 h-4 w-4" />
              {t('settings.signOutButton')}
            {/if}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle class="text-destructive flex items-center gap-2">
            <LogOut class="h-5 w-5" />
            {t('settings.signOutTitle')}
          </CardTitle>
          <CardDescription>
            {t('settings.signOutDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onclick={signOut} disabled={working} variant="destructive" class="w-full">
            {#if working}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              {t('settings.signOutWorking')}
            {:else}
              <LogOut class="mr-2 h-4 w-4" />
              {t('settings.signOutButton')}
            {/if}
          </Button>
        </CardContent>
      </Card>
    {:else}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.signInTitle')}</CardTitle>
          <CardDescription>
            {t('settings.signInDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onsubmit={handleSignIn} class="space-y-4">
            <div class="space-y-2">
              <Label for="signin-handle">{t('home.handleLabel')}</Label>
              <Input
                id="signin-handle"
                name="handle"
                type="text"
                bind:value={handle}
                placeholder={t('home.handlePlaceholder')}
                disabled={working}
              />
            </div>
            <Button type="submit" class="w-full" disabled={working || !handle.trim()}>
              {#if working}
                <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                {t('settings.signInWorking')}
              {:else}
                {t('settings.signInButton')}
              {/if}
            </Button>
          </form>
        </CardContent>
      </Card>
    {/if}

    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          {t('settings.languageTitle')}
        </CardTitle>
        <CardDescription>
          {t('settings.languageDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-2">
        <Label for="language-select">{t('settings.languageLabel')}</Label>
        <select
          id="language-select"
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          bind:value={$localeStore}
        >
          {#each availableLocales as option}
            <option value={option.code}>{option.label}</option>
          {/each}
        </select>
      </CardContent>
    </Card>
  </div>
</div>
