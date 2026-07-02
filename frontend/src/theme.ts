export type Theme = "dark" | "light";

const KEY = "ims_theme";

export function getTheme(): Theme {
    const saved = localStorage.getItem(KEY);
    return saved === "light" ? "light" : "dark"; // dark is the default
}

export function applyTheme(theme: Theme): void {
    document.documentElement.setAttribute("data-theme", theme);
}

export function setTheme(theme: Theme): void {
    localStorage.setItem(KEY, theme);
    applyTheme(theme);
}
