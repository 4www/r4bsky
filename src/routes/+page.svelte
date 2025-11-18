<script lang="ts">
  import { bskyOAuth } from '$lib/services/bsky-oauth';
  import { session } from '$lib/state/session';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import StateCard from '$lib/components/ui/state-card.svelte';
  import { Music4 } from 'lucide-svelte';
  import { locale, translate } from '$lib/i18n';

  let handle = $state('');
  let error = $state('');
  let signingIn = $state(false);
  const t = (key, vars = {}) => translate($locale, key, vars);

  async function handleSignIn() {
    if (!handle.trim()) {
      error = t('home.errorRequired');
      return;
    }

    error = '';
    signingIn = true;

    try {
      await bskyOAuth.signIn(handle.trim());
    } catch (err) {
      error = t('home.errorMessage', { message: (err as Error)?.message || 'Unknown error' });
      signingIn = false;
    }
  }

  const isAuthenticated = $derived($session && $session.did);
</script>

{#if isAuthenticated}
  <div class="container max-w-4xl py-12 px-4">
    <div class="mb-12 text-center space-y-4 animate-in">
      <h1 class="text-5xl font-bold text-gradient">
        {t('home.timelineDisabledTitle')}
      </h1>
      <p class="text-xl text-muted-foreground max-w-2xl mx-auto">
        {t('home.timelineDisabledDescription')}
      </p>
    </div>

    <div class="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
      <Card class="card-hover border-2">
        <CardHeader class="pb-4">
          <div class="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Music4 class="h-6 w-6 text-primary" />
          </div>
          <CardTitle class="text-xl">{t('home.exploreProfiles')}</CardTitle>
          <CardDescription class="text-base">
            Discover music creators and their collections on the network
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button href="/search" class="w-full" size="lg">
            {t('home.exploreProfiles')}
          </Button>
        </CardContent>
      </Card>

      <Card class="card-hover border-2">
        <CardHeader class="pb-4">
          <div class="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Music4 class="h-6 w-6 text-primary" />
          </div>
          <CardTitle class="text-xl">{t('home.visitFollowing')}</CardTitle>
          <CardDescription class="text-base">
            Check out tracks from people you follow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button href="/following" variant="outline" class="w-full" size="lg">
            {t('home.visitFollowing')}
          </Button>
        </CardContent>
      </Card>
    </div>
  </div>
{:else}
  <div class="container mx-auto max-w-md mt-12 px-4">
    <div class="mb-8 text-center space-y-3 animate-in">
      <h1 class="text-4xl font-bold text-gradient">{t('home.title')}</h1>
      <p class="text-lg text-muted-foreground">{t('home.subtitle')}</p>
    </div>

    <Card class="border-2 shadow-xl">
      <CardContent class="pt-6">
        <form onsubmit={(e) => { e.preventDefault(); handleSignIn(); }} class="space-y-6">
          <div class="space-y-2">
            <Label for="handle" class="text-base">{t('home.handleLabel')}</Label>
            <Input
              id="handle"
              type="text"
              placeholder={t('home.handlePlaceholder')}
              bind:value={handle}
              disabled={signingIn}
              class="h-12 text-base"
            />
          </div>

          {#if error}
            <div class="rounded-lg bg-destructive/15 border border-destructive/20 p-4 text-sm text-destructive">
              {error}
            </div>
          {/if}

          <Button type="submit" class="w-full h-12 text-base" disabled={signingIn}>
            {signingIn ? t('home.submitting') : t('home.submit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
{/if}
