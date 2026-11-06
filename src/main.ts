// Composition root: later steps wire config, core, data, services, ui and scene here.
const root = document.querySelector<HTMLDivElement>('#app');

if (root) {
  const heading = document.createElement('h1');
  heading.textContent = 'Tabimate — coming soon';
  root.replaceChildren(heading);
}
