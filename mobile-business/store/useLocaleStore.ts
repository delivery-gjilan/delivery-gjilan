import en from '@/localization/en.json';
import al from '@/localization/al.json';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type LanguageChoice = 'en' | 'al';

type Translations = Record<string, any>;

interface LocaleStore {
    languageChoice: LanguageChoice;
    translations: Translations | null;
    setLanguageChoice: (choice: LanguageChoice) => void;
    loadTranslation: () => void;
}

function getTranslationFromLanguage(language: LanguageChoice): Translations {
    switch (language) {
        case 'en':
            return en as Translations;
        case 'al':
            return al as Translations;
        default:
            return en as Translations;
    }
}

export const useLocaleStore = create<LocaleStore>()(
    persist(
        (set) => ({
            languageChoice: 'en',
            translations: en as Translations,
            setLanguageChoice: (choice) => {
                const translations = getTranslationFromLanguage(choice);
                set({ languageChoice: choice, translations });
            },
            loadTranslation: () => {
                const choice = useLocaleStore.getState().languageChoice;
                const translations = getTranslationFromLanguage(choice);
                useLocaleStore.setState({ translations });
            },
        }),
        {
            name: 'business-locale-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({ languageChoice: state.languageChoice }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    const translations = getTranslationFromLanguage(state.languageChoice);
                    state.translations = translations;
                }
            },
        },
    ),
);
