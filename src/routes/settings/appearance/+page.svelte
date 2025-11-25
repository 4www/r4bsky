<script lang="ts">
  import { session } from '$lib/state/session';
  import { theme, DEFAULT_LIGHT_COLORS, DEFAULT_DARK_COLORS } from '$lib/state/theme';
  import { setR4Profile } from '$lib/services/r4-service';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Loader2, Palette, Sun, Moon, MonitorSmartphone, RotateCcw } from 'lucide-svelte';
  import { locale, translate } from '$lib/i18n';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  let themeSaving = $state(false);
  let themeSaved = $state(false);
  let themeError = $state('');
  const t = (key, vars = {}) => translate($locale, key, vars);

  // Redirect to account page if not authenticated
  onMount(() => {
    if (!$session?.did) {
      goto('/settings/account');
    }
  });

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

  // Local color values
  let currentBg = $state('');
  let currentFg = $state('');
  let currentAccent = $state('');

  // Update color values when mode changes
  $effect(() => {
    currentBg = hslToHex(effectiveMode === 'dark' ? $theme.darkColors.background : $theme.lightColors.background);
    currentFg = hslToHex(effectiveMode === 'dark' ? $theme.darkColors.foreground : $theme.lightColors.foreground);
    currentAccent = hslToHex(effectiveMode === 'dark' ? $theme.darkColors.accent : $theme.lightColors.accent);
  });

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
</script>

<div class="settings-stack">
  <!-- Theme Mode -->
  <Card>
    <CardHeader>
      <CardTitle class="card-title-icon">
        <MonitorSmartphone class="icon" />
        {t('settings.appearanceThemeModeTitle')}
      </CardTitle>
      <CardDescription>
        {t('settings.appearanceThemeModeDescription')}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <fieldset class="field-group">
        <Label>{t('settings.appearanceSelectMode')}</Label>
        <div class="mode-grid">
          <button
            type="button"
            onclick={() => theme.setMode('auto')}
            disabled={$theme.mode === 'auto'}
            class="mode-btn"
            class:active={$theme.mode === 'auto'}
          >
            <MonitorSmartphone class="icon" />
            <span>{t('settings.appearanceModeAuto')}</span>
          </button>
          <button
            type="button"
            onclick={() => theme.setMode('light')}
            disabled={$theme.mode === 'light'}
            class="mode-btn"
            class:active={$theme.mode === 'light'}
          >
            <Sun class="icon" />
            <span>{t('settings.appearanceModeLight')}</span>
          </button>
          <button
            type="button"
            onclick={() => theme.setMode('dark')}
            disabled={$theme.mode === 'dark'}
            class="mode-btn"
            class:active={$theme.mode === 'dark'}
          >
            <Moon class="icon" />
            <span>{t('settings.appearanceModeDark')}</span>
          </button>
        </div>
      </fieldset>
    </CardContent>
  </Card>

  <!-- Theme Colors -->
  <Card>
    <CardHeader>
      <CardTitle class="card-title-icon">
        <Palette class="icon" />
        {t('settings.appearanceThemeColorsTitle')}
      </CardTitle>
      <CardDescription>
        {t('settings.appearanceThemeColorsDescription')}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div class="color-panel">
        <header class="color-panel-header">
          <h3>
            {#if effectiveMode === 'dark'}
              <Moon class="icon-sm" />
              {t('settings.appearanceDarkModeColors')}
            {:else}
              <Sun class="icon-sm" />
              {t('settings.appearanceLightModeColors')}
            {/if}
          </h3>
          {#if themeSaving}
            <span class="status-text">
              <Loader2 class="icon-sm spin" />
              {t('settings.appearanceSaving')}
            </span>
          {:else if themeSaved}
            <span class="status-text success">
              {t('settings.appearanceSaved')}
            </span>
          {/if}
        </header>
        <div class="color-grid">
          <div class="field-group">
            <Label for="current-bg">{t('settings.appearanceBackground')}</Label>
            <div class="color-input-row">
              <input
                id="current-bg"
                type="color"
                bind:value={currentBg}
                onchange={saveTheme}
                class="color-picker"
              />
              <Input
                type="text"
                bind:value={currentBg}
                onchange={saveTheme}
                placeholder={effectiveMode === 'dark' ? '#000000' : '#ffffff'}
                class="color-text"
              />
            </div>
          </div>
          <div class="field-group">
            <Label for="current-fg">{t('settings.appearanceForeground')}</Label>
            <div class="color-input-row">
              <input
                id="current-fg"
                type="color"
                bind:value={currentFg}
                onchange={saveTheme}
                class="color-picker"
              />
              <Input
                type="text"
                bind:value={currentFg}
                onchange={saveTheme}
                placeholder={effectiveMode === 'dark' ? '#ffffff' : '#000000'}
                class="color-text"
              />
            </div>
          </div>
          <div class="field-group full-width">
            <Label for="current-accent">{t('settings.appearanceAccentColor')}</Label>
            <div class="color-input-row">
              <input
                id="current-accent"
                type="color"
                bind:value={currentAccent}
                onchange={saveTheme}
                class="color-picker"
              />
              <Input
                type="text"
                bind:value={currentAccent}
                onchange={saveTheme}
                placeholder="#8b5cf6"
                class="color-text"
              />
            </div>
          </div>
        </div>
        <div class="button-row">
          <Button onclick={resetColors} variant="secondary" size="sm">
            <RotateCcw class="icon-sm" />
            {t('settings.appearanceResetToDefaults')}
          </Button>
          <Button onclick={saveTheme} variant="default" size="sm" disabled={themeSaving}>
            {#if themeSaving}
              <Loader2 class="icon-sm spin" />
              {t('settings.appearanceSaving')}
            {:else}
              <Palette class="icon-sm" />
              {t('settings.appearanceSaveNow')}
            {/if}
          </Button>
        </div>
      </div>

      {#if themeError}
        <div class="error-box">
          {themeError}
        </div>
      {/if}
    </CardContent>
  </Card>
</div>

<style>
  .settings-stack {
    display: flex;
    flex-direction: column;
    gap: var(--size-fluid-3);
  }

  .card-title-icon {
    display: flex;
    align-items: center;
    gap: var(--size-2);
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: var(--size-2);
  }

  .mode-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--size-2);
  }

  .mode-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--size-2);
    padding: var(--size-3);
    border: var(--border-size-2) solid var(--border);
    border-radius: var(--radius-2);
    background: transparent;
    color: var(--foreground);
    transition: all 0.15s var(--ease-2);
    cursor: pointer;
  }

  .mode-btn:hover:not(:disabled) {
    background: var(--foreground);
    color: var(--background);
    border-color: transparent;
  }

  .mode-btn.active {
    background: var(--foreground);
    color: var(--background);
    border-color: var(--foreground);
  }

  .mode-btn:disabled {
    cursor: not-allowed;
  }

  .mode-btn span {
    font-weight: var(--font-weight-5);
  }

  .color-panel {
    display: flex;
    flex-direction: column;
    gap: var(--size-3);
    padding: var(--size-3);
    background: color-mix(in srgb, var(--muted) 30%, transparent);
    border-radius: var(--radius-3);
  }

  .color-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .color-panel-header h3 {
    display: flex;
    align-items: center;
    gap: var(--size-2);
    font-weight: var(--font-weight-5);
  }

  .status-text {
    display: flex;
    align-items: center;
    gap: var(--size-1);
    color: var(--muted-foreground);
  }

  .status-text.success {
    color: var(--primary);
  }

  .color-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--size-3);
  }

  @media (min-width: 768px) {
    .color-grid {
      grid-template-columns: 1fr 1fr;
    }
    .color-grid .full-width {
      grid-column: span 2;
    }
  }

  .color-input-row {
    display: flex;
    gap: var(--size-2);
  }

  .color-picker {
    width: 4rem;
    height: 2.5rem;
    border: var(--border-size-1) solid var(--border);
    border-radius: var(--radius-2);
    cursor: pointer;
  }

  :global(.color-text) {
    flex: 1;
    font-family: var(--font-mono);
  }

  .button-row {
    display: flex;
    gap: var(--size-2);
  }

  .button-row :global(button) {
    flex: 1;
  }

  .error-box {
    margin-top: var(--size-3);
    padding: var(--size-3);
    background: color-mix(in srgb, var(--destructive) 15%, transparent);
    border-radius: var(--radius-2);
  }

  .icon {
    width: 1.25rem;
    height: 1.25rem;
  }

  .icon-sm {
    width: 1rem;
    height: 1rem;
  }

  :global(.spin) {
    animation: var(--animation-spin);
  }
</style>
