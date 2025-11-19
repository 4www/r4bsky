<script lang="ts">
  import { bskyOAuth } from '$lib/services/bsky-oauth';
  import { session } from '$lib/state/session';
  import { theme, DEFAULT_LIGHT_COLORS, DEFAULT_DARK_COLORS } from '$lib/state/theme';
  import { setR4Profile } from '$lib/services/r4-service';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { LogOut, Shield, User, Loader2, Palette, Sun, Moon, MonitorSmartphone, RotateCcw } from 'lucide-svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { locale as localeStore, translate, availableLocales } from '$lib/i18n';

  let working = $state(false);
  let handle = $state('');
  let permissionError = $state('');
  let themeSaving = $state(false);
  let themeSaved = $state(false);
  let themeError = $state('');
  const t = (key, vars = {}) => translate($localeStore, key, vars);

  // Helper function to convert HSL string to hex color
  function hslToHex(hsl: string): string {
    const [h, s, l] = hsl.split(' ').map((v) => parseFloat(v.replace('%', '')));
    const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = (l / 100) - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }

  // Helper function to convert hex color to HSL string
  function hexToHsl(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  }

  // Get current effective theme mode
  let effectiveMode = $derived.by(() => {
    if ($theme.mode === 'auto') {
      return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return $theme.mode;
  });

  // Local color values - simple state, no reactivity
  let currentBg = $state(hslToHex(effectiveMode === 'dark' ? $theme.darkColors.background : $theme.lightColors.background));
  let currentFg = $state(hslToHex(effectiveMode === 'dark' ? $theme.darkColors.foreground : $theme.lightColors.foreground));
  let currentAccent = $state(hslToHex(effectiveMode === 'dark' ? $theme.darkColors.accent : $theme.lightColors.accent));

  // Simple save function - call it manually
  async function saveTheme() {
    if (!$session?.did) return;

    themeSaving = true;
    themeError = '';
    themeSaved = false;

    try {
      // Update theme store
      if (effectiveMode === 'dark') {
        theme.setDarkColors({
          background: hexToHsl(currentBg),
          foreground: hexToHsl(currentFg),
          accent: hexToHsl(currentAccent),
        });
      } else {
        theme.setLightColors({
          background: hexToHsl(currentBg),
          foreground: hexToHsl(currentFg),
          accent: hexToHsl(currentAccent),
        });
      }

      // Save to AT Protocol
      await setR4Profile({
        mode: $theme.mode,
        lightBackground: effectiveMode === 'light' ? hexToHsl(currentBg) : $theme.lightColors.background,
        lightForeground: effectiveMode === 'light' ? hexToHsl(currentFg) : $theme.lightColors.foreground,
        lightAccent: effectiveMode === 'light' ? hexToHsl(currentAccent) : $theme.lightColors.accent,
        darkBackground: effectiveMode === 'dark' ? hexToHsl(currentBg) : $theme.darkColors.background,
        darkForeground: effectiveMode === 'dark' ? hexToHsl(currentFg) : $theme.darkColors.foreground,
        darkAccent: effectiveMode === 'dark' ? hexToHsl(currentAccent) : $theme.darkColors.accent,
      });

      themeSaved = true;
    } catch (error) {
      themeError = String(error?.message || error);
    } finally {
      themeSaving = false;
    }
  }

  // Reset to defaults
  function resetColors() {
    const defaultColors = effectiveMode === 'dark' ? DEFAULT_DARK_COLORS : DEFAULT_LIGHT_COLORS;
    currentBg = hslToHex(defaultColors.background);
    currentFg = hslToHex(defaultColors.foreground);
    currentAccent = hslToHex(defaultColors.accent);
    saveTheme();
  }

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

<div class="container max-w-2xl py-6">
  <div class="mb-4">
    <h1 class="text-2xl font-bold">{t('settings.title')}</h1>
    <p class="text-sm text-muted-foreground mt-1">{t('settings.description')}</p>
  </div>

  <div class="space-y-3">
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
            <Palette class="h-5 w-5" />
            Theme & Appearance
          </CardTitle>
          <CardDescription>
            Customize your theme colors. Changes are saved to your profile and visible to others.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <!-- Theme Mode Selector -->
          <div class="space-y-2">
            <Label>Theme Mode</Label>
            <div class="grid grid-cols-3 gap-2">
              <button
                type="button"
                onclick={() => theme.setMode('auto')}
                class="flex flex-col items-center gap-2 p-3 rounded-md border-2 transition-all {$theme.mode === 'auto' ? 'border-primary text-foreground' : 'border-border hover:border-primary/50'}"
              >
                <MonitorSmartphone class="h-5 w-5" />
                <span class="text-xs font-medium">Auto</span>
              </button>
              <button
                type="button"
                onclick={() => theme.setMode('light')}
                class="flex flex-col items-center gap-2 p-3 rounded-md border-2 transition-all {$theme.mode === 'light' ? 'border-primary text-foreground' : 'border-border hover:border-primary/50'}"
              >
                <Sun class="h-5 w-5" />
                <span class="text-xs font-medium">Light</span>
              </button>
              <button
                type="button"
                onclick={() => theme.setMode('dark')}
                class="flex flex-col items-center gap-2 p-3 rounded-md border-2 transition-all {$theme.mode === 'dark' ? 'border-primary text-foreground' : 'border-border hover:border-primary/50'}"
              >
                <Moon class="h-5 w-5" />
                <span class="text-xs font-medium">Dark</span>
              </button>
            </div>
          </div>

          <!-- Current Theme Colors -->
          <div class="space-y-3 p-3 rounded-lg bg-muted/30">
            <div class="flex items-center justify-between">
              <h3 class="font-medium flex items-center gap-2">
                {#if effectiveMode === 'dark'}
                  <Moon class="h-4 w-4" />
                  Dark Mode Colors
                {:else}
                  <Sun class="h-4 w-4" />
                  Light Mode Colors
                {/if}
              </h3>
              {#if themeSaving}
                <span class="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 class="h-3 w-3 animate-spin" />
                  Saving...
                </span>
              {:else if themeSaved}
                <span class="text-xs text-green-600 dark:text-green-400">
                  Saved!
                </span>
              {/if}
            </div>
            <div class="space-y-3">
              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-2">
                  <Label for="current-bg">Background</Label>
                  <div class="flex gap-2">
                    <input
                      id="current-bg"
                      type="color"
                      bind:value={currentBg}
                      onchange={saveTheme}
                      class="h-10 w-16 rounded border border-border cursor-pointer"
                    />
                    <Input
                      type="text"
                      bind:value={currentBg}
                      onchange={saveTheme}
                      placeholder={effectiveMode === 'dark' ? '#000000' : '#ffffff'}
                      class="flex-1 font-mono text-xs"
                    />
                  </div>
                </div>
                <div class="space-y-2">
                  <Label for="current-fg">Foreground</Label>
                  <div class="flex gap-2">
                    <input
                      id="current-fg"
                      type="color"
                      bind:value={currentFg}
                      onchange={saveTheme}
                      class="h-10 w-16 rounded border border-border cursor-pointer"
                    />
                    <Input
                      type="text"
                      bind:value={currentFg}
                      onchange={saveTheme}
                      placeholder={effectiveMode === 'dark' ? '#ffffff' : '#000000'}
                      class="flex-1 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
              <div class="space-y-2">
                <Label for="current-accent">Accent Color</Label>
                <div class="flex gap-2">
                  <input
                    id="current-accent"
                    type="color"
                    bind:value={currentAccent}
                    onchange={saveTheme}
                    class="h-10 w-16 rounded border border-border cursor-pointer"
                  />
                  <Input
                    type="text"
                    bind:value={currentAccent}
                    onchange={saveTheme}
                    placeholder="#8b5cf6"
                    class="flex-1 font-mono text-xs"
                  />
                </div>
              </div>
            </div>
            <div class="flex gap-2">
              <Button
                onclick={resetColors}
                variant="outline"
                size="sm"
                class="flex-1"
              >
                <RotateCcw class="mr-2 h-4 w-4" />
                Reset to Defaults
              </Button>
              <Button
                onclick={saveTheme}
                variant="default"
                size="sm"
                class="flex-1"
                disabled={themeSaving}
              >
                {#if themeSaving}
                  <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                {:else}
                  <Palette class="mr-2 h-4 w-4" />
                  Save Now
                {/if}
              </Button>
            </div>
            <p class="text-xs text-muted-foreground">
              Pick a color to save automatically, or click "Save Now". Switch theme mode above to customize other mode.
            </p>
          </div>

          {#if themeError}
            <div class="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {themeError}
            </div>
          {/if}

          <p class="text-xs text-muted-foreground">
            Theme colors are saved to AT Protocol and will be visible to others when they visit your profile.
          </p>
        </CardContent>
      </Card>

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
            <div class="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {permissionError}
            </div>
          {/if}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <LogOut class="h-5 w-5" />
            {t('settings.signOutTitle')}
          </CardTitle>
          <CardDescription>
            {t('settings.signOutDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onclick={signOut} disabled={working} variant="outline" class="w-full">
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
