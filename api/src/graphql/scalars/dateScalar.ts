import { GraphQLScalarType, GraphQLError } from 'graphql';

export const DateScalar = new GraphQLScalarType({
    name: 'Date',
    description: 'Date scalar type - expects ISO 8601 format',
    serialize(value: any): string {
        if (value instanceof Date) {
            return value.toISOString();
        }
        if (typeof value === 'string') {
            return value;
        }
        throw new GraphQLError(`Value is not a valid Date: ${value}`);
    },
    parseValue(value: any): string {
        if (typeof value === 'string') {
            // Validate it's a valid ISO 8601 date
            const date = new Date(value);
            if (isNaN(date.getTime())) {
                throw new GraphQLError(`Value is not a valid ISO 8601 date: ${value}`);
            }
            return value;
        }
        throw new GraphQLError(`Value is not a string: ${value}`);
    },
    parseLiteral(ast: any): string {
        if (ast.kind === 'StringValue') {
            const date = new Date(ast.value);
            if (isNaN(date.getTime())) {
                throw new GraphQLError(`Value is not a valid ISO 8601 date: ${ast.value}`);
            }
            return ast.value;
        }
        throw new GraphQLError(`Can only parse strings to dates but got a: ${ast.kind}`);
    },
});
