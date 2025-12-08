import { z } from 'zod';

export const translationSchema = z.object(
    {
        language: z.string({ message: 'Language name is required to be string' }),
        common: z.object(
            {
                ok: z.string({ message: 'Ok message is required to be string' }),
                cancel: z.string({ message: 'Cancel message is required to be string' }),
                save: z.string({ message: 'Save message is required to be string' }),
                delete: z.string({ message: 'Delete message is required to be string' }),
                error: z.string({ message: 'Error message is required to be string' }),
                date: z.string({ message: 'Date message is required to be string' }),
                today: z.string({ message: 'Today message is required to be string' }),
            },
            { message: 'Common translations must be an object' },
        ),
        auth: z.object(
            {
                login: z.object(
                    {
                        title: z.string({ message: 'Login title is required to be string' }),
                        description: z.string({ message: 'Login description is required to be string' }),
                        actions: z.object(
                            {
                                login: z.string({ message: 'Login action is required to be string' }),
                                need_account: z.string({ message: 'Need account action is required to be string' }),
                            },
                            { message: 'Login actions must be an object' },
                        ),
                    },
                    { message: 'Login translations must be an object' },
                ),
            },
            { message: 'Auth translations must be an object' },
        ),
        home: z.object(
            {
                title: z.string({ message: 'Home title is required to be string' }),
                subtitle: z.string({ message: 'Home subtitle is required to be string' }),
            },
            { message: 'Home translations must be an object' },
        ),
        orders: z.object(
            {
                title: z.string({ message: 'Orders title is required to be string' }),
                subtitle: z.string({ message: 'Orders subtitle is required to be string' }),
                empty: z.string({ message: 'Empty orders message is required to be string' }),
                items: z.string({ message: 'Items label is required to be string' }),
                total: z.string({ message: 'Total label is required to be string' }),
            },
            { message: 'Orders translations must be an object' },
        ),
        profile: z.object(
            {
                title: z.string({ message: 'Profile title is required to be string' }),
                account_section: z.string({ message: 'Account section title is required to be string' }),
                email: z.string({ message: 'Email label is required to be string' }),
                phone: z.string({ message: 'Phone label is required to be string' }),
                language: z.string({ message: 'Language label is required to be string' }),
                app_version: z.string({ message: 'App version label is required to be string' }),
                logout: z.string({ message: 'Logout button label is required to be string' }),
                logout_confirm: z.string({ message: 'Logout confirm message is required to be string' }),
            },
            { message: 'Profile translations must be an object' },
        ),
        tabs: z.object(
            {
                home: z.string({ message: 'Home tab title is required to be string' }),
                orders: z.string({ message: 'Orders tab title is required to be string' }),
                create: z.string({ message: 'Create tab title is required to be string' }),
                profile: z.string({ message: 'Profile tab title is required to be string' }),
            },
            { message: 'Tabs translations must be an object' },
        ),
        restaurant: z.object(
            {
                title: z.string({ message: 'Restaurant title is required to be string' }),
                add_to_cart: z.string({ message: 'Add to cart button is required to be string' }),
            },
            { message: 'Restaurant translations must be an object' },
        ),
    },
    { message: 'Translation schema must be an object' },
);

export type Translation = z.infer<typeof translationSchema>;
