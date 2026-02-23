import { translationSchema } from './schema';
import en from './en.json';
import al from './al.json';

const languages = { en, al };

let hasError = false;

for (const [lang, data] of Object.entries(languages)) {
    const result = translationSchema.safeParse(data);
    if (!result.success) {
        console.error(`\n❌ Translation validation failed for "${lang}":`);
        for (const issue of result.error.issues) {
            console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
        }
        hasError = true;
    } else {
        console.log(`✅ "${lang}" translations are valid`);
    }
}

if (hasError) {
    process.exit(1);
}
