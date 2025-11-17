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
  <div class="container max-w-3xl py-16 px-4">
    <StateCard
      icon={Music4}
      title={t('home.timelineDisabledTitle')}
      description={t('home.timelineDisabledDescription')}
    >
      {#snippet actions()}
        <Button variant="outline" href="/search">
          {t('home.exploreProfiles')}
        </Button>
        <Button href="/following">
          {t('home.visitFollowing')}
        </Button>
      {/snippet}
    </StateCard>
  </div>
{:else}
  <div class="container mx-auto max-w-md mt-16 px-4">
    <Card>
      <CardHeader>
        <CardTitle>{t('home.title')}</CardTitle>
        <CardDescription>
          {t('home.subtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onsubmit={(e) => { e.preventDefault(); handleSignIn(); }} class="space-y-4">
          <div class="space-y-2">
            <Label for="handle">{t('home.handleLabel')}</Label>
            <Input
              id="handle"
              type="text"
              placeholder={t('home.handlePlaceholder')}
              bind:value={handle}
              disabled={signingIn}
            />
          </div>

          {#if error}
            <div class="text-sm text-destructive">{error}</div>
          {/if}

          <Button type="submit" class="w-full" disabled={signingIn}>
            {signingIn ? t('home.submitting') : t('home.submit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
{/if}
