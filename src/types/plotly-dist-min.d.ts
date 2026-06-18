// Type declaration for the minified runtime bundle. We import `plotly.js-dist-min`
// at runtime (dynamically, browser-only) and borrow the figure types from the
// `@types/plotly.js` dev dependency.
declare module "plotly.js-dist-min" {
  import type { Data, Layout, Config } from "plotly.js";

  export function newPlot(
    root: HTMLElement,
    data: Data[],
    layout?: Partial<Layout>,
    config?: Partial<Config>,
  ): Promise<HTMLElement>;

  export function react(
    root: HTMLElement,
    data: Data[],
    layout?: Partial<Layout>,
    config?: Partial<Config>,
  ): Promise<HTMLElement>;

  export function relayout(
    root: HTMLElement,
    update: Partial<Layout>,
  ): Promise<HTMLElement>;

  export function purge(root: HTMLElement): void;

  export const Plots: { resize(root: HTMLElement): void };
}
