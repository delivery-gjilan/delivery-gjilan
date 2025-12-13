import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils';
import { GraphQLSchema, defaultFieldResolver, GraphQLError } from 'graphql';
import { GraphQLContext } from '../context';

/**
 * Directive transformer for @skipAuth
 * Validates that userId exists in context for protected fields
 * Skips validation if field has @skipAuth directive
 * Only applies to Query, Mutation, and Subscription root fields
 * 
 * When TESTING_MODE_SKIP_AUTH is enabled, all fields are public
 */
export function skipAuthDirective(schema: GraphQLSchema, directiveName = 'skipAuth'): GraphQLSchema {
    // Check if testing mode is enabled (skips auth for everything)
    const testingModeEnabled = process.env.TESTING_MODE_SKIP_AUTH === 'true';

    return mapSchema(schema, {
        [MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName, typeName) => {
            // Only check authentication for Query, Mutation, and Subscription fields
            // Skip nested object type fields
            if (typeName !== 'Query' && typeName !== 'Mutation' && typeName !== 'Subscription') {
                return fieldConfig;
            }

            // In testing mode, skip auth for everything
            if (testingModeEnabled) {
                return fieldConfig;
            }

            // Check if field has @skipAuth directive
            const skipAuthDirective = getDirective(schema, fieldConfig, directiveName)?.[0];

            if (skipAuthDirective) {
                // Field is public, no authentication required
                return fieldConfig;
            }

            // Field is protected, wrap resolver with authentication check
            const { resolve = defaultFieldResolver } = fieldConfig;

            fieldConfig.resolve = async function (source, args, context: GraphQLContext, info) {
                // Check if userId exists in context
                if (!context.userData?.userId) {
                    throw new GraphQLError('Authentication required', {
                        extensions: {
                            code: 'UNAUTHENTICATED',
                            http: { status: 401 },
                        },
                    });
                }

                // User is authenticated, proceed with original resolver
                return resolve(source, args, context, info);
            };

            return fieldConfig;
        },
    });
}
