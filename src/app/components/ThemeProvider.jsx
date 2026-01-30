"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setDarkMode } from "../../lib/redux/slices/uiSlice";

const ThemeProvider = ({ children }) => {
    const dispatch = useDispatch();
    const darkMode = useSelector((state) => state.ui.darkMode);

    // Initial Sync on Mount
    useEffect(() => {
        // Check local storage or system preference
        const storedTheme = localStorage.getItem("theme");
        const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

        if (storedTheme === "dark" || (!storedTheme && systemPrefersDark)) {
            dispatch(setDarkMode(true));
            document.documentElement.classList.add("dark");
        } else {
            dispatch(setDarkMode(false));
            document.documentElement.classList.remove("dark");
        }
    }, [dispatch]);

    // Sync Redux state changes to DOM and LocalStorage
    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    }, [darkMode]);

    return <>{children}</>;
};

export default ThemeProvider;
