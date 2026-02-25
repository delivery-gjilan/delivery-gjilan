import en from '../localization/en.json';
import al from '../localization/al.json';
import { Translation } from '@/localization/schema';
import { SUPPORTED_LANGUAGES } from '@/utils/constants';
import { LanguageChoice } from '@/utils/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface LocaleStore {
    languageChoice: LanguageChoice;
    translations: Translation | null;
    setLanguageChoice: (choice: LanguageChoice) => void;
    loadTranslation: () => void;
}

function getTranslationFromLanguage(language: LanguageChoice): Translation {
    switch (language) {
        case 'en':
            return en as Translation;
        case 'al':
            return al as Translation;
        default:
            throw new Error(`Unsupported language: ${language}`);
    }
}

export const useLocaleStore = create<LocaleStore>()(
    persist(
        (set) => ({
            languageChoice: 'en',
            translations: en as Translation, // Initialize with default language
            setLanguageChoice: (choice) => {
                if (!SUPPORTED_LANGUAGES.includes(choice)) return;
                const newTranslation = getTranslationFromLanguage(choice);
                set({ languageChoice: choice, translations: newTranslation });
            },
            loadTranslation: () => {
                const choice = useLocaleStore.getState().languageChoice;
                const newTranslations = getTranslationFromLanguage(choice);
                useLocaleStore.setState({ translations: newTranslations });
            },
        }),
        {
            name: 'locale-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({ languageChoice: state.languageChoice }),
            onRehydrateStorage: () => (state) => {
                // Load correct translations after store rehydrates
                if (state) {
                    const translations = getTranslationFromLanguage(state.languageChoice);
                    useLocaleStore.setState({ translations });
                }
            },
        },
    ),
);
