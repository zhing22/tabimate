/** A component: the element to insert, and how to stop its timers or listeners. */
export interface Component {
  readonly el: HTMLElement;
  destroy(): void;
}
