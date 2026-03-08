import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import ru from "./locales/ru.json";
import ka from "./locales/ka.json";

const STORAGE_KEY = "velvet-lang";

export const LANGUAGES = [
  { code: "en", label: "EN" },
  { code: "ru", label: "RU" },
  { code: "ka", label: "GE" },
] as const;

export type LocaleCode = (typeof LANGUAGES)[number]["code"];

const savedLang = (() => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && LANGUAGES.some((l) => l.code === v)) return v as LocaleCode;
  } catch {
    // localStorage not available
  }
  return undefined;
})();

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ru: { translation: ru },
    ka: { translation: ka },
  },
  lng: savedLang || "en",
  fallbackLng: "en",
  supportedLngs: ["en", "ru", "ka"],
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

i18n.on("languageChanged", (lng) => {
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    // localStorage not available
  }
});

export default i18n;
