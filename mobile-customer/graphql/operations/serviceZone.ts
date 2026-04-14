import { graphql } from '@/gql';

export const GET_SERVICE_ZONES = graphql(`
    query GetServiceZones {
        deliveryZones {
            id
            name
            polygon {
                lat
                lng
            }
            isActive
        }
    }
`);