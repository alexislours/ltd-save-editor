<script lang="ts">
  import Toolbar from './shell/Toolbar.svelte';
  import PaletteRail from './shell/PaletteRail.svelte';
  import CanvasStage from './canvas/CanvasStage.svelte';
  import InspectorRail from './shell/InspectorRail.svelte';
  import StatusBar from './shell/StatusBar.svelte';
  import KeyboardHelpDialog from './shell/KeyboardHelpDialog.svelte';

  let hover = $state<{
    x: number;
    y: number;
    collisionCount?: number;
    ugcIndex?: number;
  } | null>(null);
</script>

<div
  class="workbench-root relative left-1/2 grid w-screen h-[calc(100svh-var(--header-h,160px))] -translate-x-1/2"
  style="grid-template-rows: auto minmax(0,1fr) auto; grid-template-columns: auto minmax(0,1fr) auto;"
>
  <Toolbar />
  <PaletteRail />
  <CanvasStage onHover={(info) => (hover = info)} />
  <InspectorRail />
  <StatusBar {hover} />
</div>

<KeyboardHelpDialog />

<style>
  :global(.workbench-root:fullscreen) {
    left: 0 !important;
    width: 100vw !important;
    height: 100svh !important;
    transform: none !important;
    translate: none !important;
    background: var(--color-surface-sunken, #000);
  }
</style>
