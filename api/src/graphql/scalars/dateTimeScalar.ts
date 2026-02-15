import { GraphQLScalarType, GraphQLError } from 'graphql';

export const DateTimeScalar = new GraphQLScalarType({
    name: 'DateTime',
    description: 'DateTime scalar type - expects ISO 8601 format with time',
    serialize(value: any): string {
        if (value instanceof Date) {
            return value.toISOString();
        }
        if (typeof value === 'string') {
            return value;
        }
        throw new GraphQLError(`Value is not a valid DateTime: ${value}`);
    },
    parseValue(value: any): string {
        if (typeof value === 'string') {
            const date = new Date(value);
            if (isNaN(date.getTime())) {
                throw new GraphQLError(`Value is not a valid ISO 8601 datetime: ${value}`);
            }
            return value;
        }
        throw new GraphQLError(`Value is not a string: ${value}`);
    },
    parseLiteral(ast: any): string {
        if (ast.kind === 'StringValue') {
            const date = new Date(ast.value);
            if (isNaN(date.getTime())) {
                throw new GraphQLError(`Value is not a valid ISO 8601 datetime: ${ast.value}`);
            }
            return ast.value;
        }
        throw new GraphQLError(`Can only parse strings to datetimes but got a: ${ast.kind}`);
    },
});
