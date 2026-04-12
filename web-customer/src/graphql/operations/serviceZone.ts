import { gql } from "@apollo/client";

export const GET_SERVICE_ZONES = gql`
    query GetServiceZones {
        deliveryZones {
            id
            name
            polygon {
                lat
                lng
            }
            isActive
            isServiceZone
        }
    }
`;
