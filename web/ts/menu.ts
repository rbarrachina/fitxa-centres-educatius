(() => {
  type InitApi = { init: () => void };
  type MapesWindow = Window & { FitxaCentre?: InitApi; MapaEscolar?: InitApi };

  const win = window as MapesWindow;

  function byId<T extends HTMLElement>(id: string): T {
    return document.getElementById(id) as T;
  }

  function activateSection(section: "fitxa" | "mapa"): void {
    const fitxaActive = section === "fitxa";
    byId<HTMLElement>("sectionFitxa").classList.toggle("hidden", !fitxaActive);
    byId<HTMLElement>("sectionMapa").classList.toggle("hidden", fitxaActive);
    byId<HTMLButtonElement>("menuFitxa").classList.toggle("active", fitxaActive);
    byId<HTMLButtonElement>("menuMapa").classList.toggle("active", !fitxaActive);
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (win.FitxaCentre && typeof win.FitxaCentre.init === "function") {
      win.FitxaCentre.init();
    }
    if (win.MapaEscolar && typeof win.MapaEscolar.init === "function") {
      win.MapaEscolar.init();
    }

    byId<HTMLButtonElement>("menuFitxa").addEventListener("click", () => activateSection("fitxa"));
    byId<HTMLButtonElement>("menuMapa").addEventListener("click", () => activateSection("mapa"));
  });
})();
