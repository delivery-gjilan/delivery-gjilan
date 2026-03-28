import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
    schema: "../api/src/generated/schema.generated.graphql",
    documents: ["src/**/*.tsx", "src/**/*.ts", "!./src/gql/**", "!**/*_old.tsx", "!**/dynamic-pricing/page.tsx", "!**/financial/pricing/page.tsx", "!**/commissions/page.tsx"],
    ignoreNoDocuments: true, // for better experience with the watcher
    generates: {
        "./src/gql/": {
            preset: "client",
        },
    },
};

export default config;
