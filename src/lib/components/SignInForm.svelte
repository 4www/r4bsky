<script lang="ts">
  import { bskyOAuth } from '$lib/services/bsky-oauth';
  import { session } from '$lib/state/session';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Loader2 } from 'lucide-svelte';
  import { locale, translate } from '$lib/i18n';

  interface Props {
    variant?: 'default' | 'settings';
    showCard?: boolean;
    title?: string;
    description?: string;
  }

  let {
    variant = 'default',
    showCard = true,
    title,
    description
  }: Props = $props();

  let handle = $state('');
  let error = $state('');
  let signingIn = $state(false);
  const t = (key, vars = {}) => translate($locale, key, vars);

  const displayTitle = $derived(title || t('settings.signInTitle'));
  const displayDescription = $derived(description || t('settings.signInDescription'));

  async function handleSignIn(e?: Event) {
    if (e) e.preventDefault();

    if (!handle.trim()) {
      error = t('home.errorRequired');
      return;
    }

    error = '';
    signingIn = true;

    try {
      await bskyOAuth.signIn(handle.trim());
      session.refresh();
    } catch (err) {
      error = t('home.errorMessage', { message: (err as Error)?.message || 'Unknown error' });
      signingIn = false;
    }
  }
</script>

{#if showCard}
  {#if variant === 'default'}
    <Card class="card">
      <CardContent>
        <form onsubmit={handleSignIn} class="signin-form">
          <div class="field">
            <Label for="signin-handle">
              {t('home.handleLabel')}
            </Label>
            <Input
              id="signin-handle"
              type="text"
              placeholder={t('home.handlePlaceholder')}
              bind:value={handle}
              disabled={signingIn}
            />
          </div>

          {#if error}
            <div class="error-message">
              {error}
            </div>
          {/if}

          <Button type="submit" disabled={signingIn || !handle.trim()}>
            {#if signingIn}
              <Loader2 class="spinner" />
              {t('home.submitting')}
            {:else}
              {t('home.submit')}
            {/if}
          </Button>
        </form>
      </CardContent>
    </Card>
  {:else}
    <Card>
      <CardHeader>
        <CardTitle>{displayTitle}</CardTitle>
        <CardDescription>{displayDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onsubmit={handleSignIn} class="signin-form">
          <div class="field">
            <Label for="signin-handle">{t('home.handleLabel')}</Label>
            <Input
              id="signin-handle"
              type="text"
              placeholder={t('home.handlePlaceholder')}
              bind:value={handle}
              disabled={signingIn}
            />
          </div>

          {#if error}
            <div class="error-message">
              {error}
            </div>
          {/if}

          <Button type="submit" disabled={signingIn || !handle.trim()}>
            {#if signingIn}
              <Loader2 class="spinner" />
              {t('settings.signInWorking')}
            {:else}
              {t('settings.signInButton')}
            {/if}
          </Button>
        </form>
      </CardContent>
    </Card>
  {/if}
{:else}
  <form onsubmit={handleSignIn} class="signin-form">
    <div class="field">
      <Label for="signin-handle">{t('home.handleLabel')}</Label>
      <Input
        id="signin-handle"
        type="text"
        placeholder={t('home.handlePlaceholder')}
        bind:value={handle}
        disabled={signingIn}
      />
    </div>

    {#if error}
      <div class="error-message">
        {error}
      </div>
    {/if}

    <Button type="submit" disabled={signingIn || !handle.trim()}>
      {#if signingIn}
        <Loader2 class="spinner" />
        {t('settings.signInWorking')}
      {:else}
        {t('settings.signInButton')}
      {/if}
    </Button>
  </form>
{/if}

<style>
  .signin-form {
    display: grid;
    gap: var(--size-4);
  }
  .field {
    display: grid;
    gap: var(--size-2);
  }
  .error-message {
    padding: var(--size-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-2);
  }
  .signin-form :global(.spinner) {
    width: 1rem;
    height: 1rem;
    margin-right: var(--size-2);
    animation: var(--animation-spin);
  }
</style>
