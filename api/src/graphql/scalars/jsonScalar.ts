import { GraphQLScalarType, GraphQLError } from 'graphql';

export const JSONScalar = new GraphQLScalarType({
    name: 'JSON',
    description: 'JSON scalar type - represents arbitrary JSON values',
    serialize(value: any): any {
        // Send to client - already a JS object/array/primitive
        return value;
    },
    parseValue(value: any): any {
        // Parse from client variable
        return value;
    },
    parseLiteral(ast: any): any {
        // Parse from inline query
        switch (ast.kind) {
            case 'StringValue':
                return ast.value;
            case 'BooleanValue':
                return ast.value;
            case 'IntValue':
                return parseInt(ast.value, 10);
            case 'FloatValue':
                return parseFloat(ast.value);
            case 'ObjectValue':
                return parseObject(ast);
            case 'ListValue':
                return ast.values.map((v: any) => JSONScalar.parseLiteral(v));
            case 'NullValue':
                return null;
            default:
                throw new GraphQLError(`Unexpected kind in parseLiteral: ${ast.kind}`);
        }
    },
});

function parseObject(ast: any): Record<string, any> {
    const value = Object.create(null);
    ast.fields.forEach((field: any) => {
        value[field.name.value] = JSONScalar.parseLiteral(field.value);
    });
    return value;
}
