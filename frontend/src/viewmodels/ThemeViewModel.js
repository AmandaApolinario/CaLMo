import { ref, watch } from 'vue';

const THEME_KEY = 'calmo-theme';

const currentTheme = ref(localStorage.getItem(THEME_KEY) || 'dark');

const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    currentTheme.value = theme;
    localStorage.setItem(THEME_KEY, theme);
};

const toggleTheme = () => {
    const next = currentTheme.value === 'dark' ? 'light' : 'dark';
    applyTheme(next);
};

const initTheme = () => {
    applyTheme(currentTheme.value);
};

export function useTheme() {
    return {
        currentTheme,
        toggleTheme,
        initTheme
    };
}
