(() => {
    const win = window;
    function byId(id) {
        return document.getElementById(id);
    }
    function activateSection(section) {
        const fitxaActive = section === "fitxa";
        byId("sectionFitxa").classList.toggle("hidden", !fitxaActive);
        byId("sectionMapa").classList.toggle("hidden", fitxaActive);
        byId("menuFitxa").classList.toggle("active", fitxaActive);
        byId("menuMapa").classList.toggle("active", !fitxaActive);
    }
    document.addEventListener("DOMContentLoaded", () => {
        if (win.FitxaCentre && typeof win.FitxaCentre.init === "function") {
            win.FitxaCentre.init();
        }
        if (win.MapaEscolar && typeof win.MapaEscolar.init === "function") {
            win.MapaEscolar.init();
        }
        byId("menuFitxa").addEventListener("click", () => activateSection("fitxa"));
        byId("menuMapa").addEventListener("click", () => activateSection("mapa"));
    });
})();
