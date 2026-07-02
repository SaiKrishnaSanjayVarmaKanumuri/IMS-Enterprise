import React, { useState } from "react";
import { Menu, Sun, Moon } from "lucide-react";
import NotificationsBell from "./NotificationsBell";
import { getTheme, setTheme, Theme } from "../theme";

/**
 * App top bar over the content column. Holds the global controls on the right
 * (theme toggle + notifications) and, on mobile, the menu button that opens the
 * sidebar drawer.
 */
const TopBar: React.FC<{ onMenu: () => void }> = ({ onMenu }) => {
    const [theme, setThemeState] = useState<Theme>(getTheme());

    const toggle = () => {
        const next: Theme = theme === "dark" ? "light" : "dark";
        setTheme(next);
        setThemeState(next);
    };

    return (
        <header className="ims-topbar">
            <button className="ims-topbar-menu ims-mobile-only" onClick={onMenu} aria-label="Open menu">
                <Menu size={22} />
            </button>
            <div className="ims-topbar-spacer" />
            <div className="ims-topbar-right">
                <button
                    className="icon-toggle"
                    onClick={toggle}
                    title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                    aria-label="Toggle theme"
                >
                    {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <NotificationsBell direction="down" />
            </div>
        </header>
    );
};

export default TopBar;
