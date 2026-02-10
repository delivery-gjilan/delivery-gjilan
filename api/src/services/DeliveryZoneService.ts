import { DeliveryZoneRepository } from '@/repositories/DeliveryZoneRepository';
import type { CreateDeliveryZoneInput, UpdateDeliveryZoneInput } from '@/generated/types.generated';
import { GraphQLError } from 'graphql';

// Point-in-polygon algorithm (ray casting)
function isPointInPolygon(point: { lat: number; lng: number }, polygon: Array<[number, number]>): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        // GeoJSON coordinates are [lng, lat]
        const xi = polygon[i][0],
            yi = polygon[i][1];
        const xj = polygon[j][0],
            yj = polygon[j][1];

        const intersect = yi > point.lat !== yj > point.lat && point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
    }
    return inside;
}

export class DeliveryZoneService {
    constructor(private repository: DeliveryZoneRepository) {}

    async createZone(input: CreateDeliveryZoneInput) {
        console.log('DeliveryZoneService.createZone called with:', input);
        
        // Validate geometry is valid GeoJSON
        try {
            const geom = JSON.parse(input.geometry);
            console.log('Parsed geometry:', geom);
            if (geom.type !== 'Polygon' || !Array.isArray(geom.coordinates)) {
                throw new Error('Invalid polygon geometry');
            }
        } catch (err) {
            console.error('Geometry validation error:', err);
            throw new GraphQLError('Invalid geometry format. Must be valid GeoJSON Polygon', {
                extensions: { code: 'INVALID_INPUT' },
            });
        }

        const zoneData = {
            name: input.name,
            description: input.description || null,
            feeDelta: input.feeDelta,
            color: input.color || '#3b82f6',
            priority: input.priority || 0,
            isActive: input.isActive !== false ? 'true' : 'false',
            geometry: input.geometry,
        };
        console.log('Creating zone with data:', zoneData);
        
        const created = await this.repository.create(zoneData);
        console.log('Repository returned:', created);
        
        return created;
    }

    async updateZone(id: string, input: UpdateDeliveryZoneInput) {
        const existing = await this.repository.findById(id);
        if (!existing) {
            throw new GraphQLError('Zone not found', { extensions: { code: 'NOT_FOUND' } });
        }

        if (input.geometry) {
            try {
                const geom = JSON.parse(input.geometry);
                if (geom.type !== 'Polygon' || !Array.isArray(geom.coordinates)) {
                    throw new Error('Invalid polygon geometry');
                }
            } catch (err) {
                throw new GraphQLError('Invalid geometry format. Must be valid GeoJSON Polygon', {
                    extensions: { code: 'INVALID_INPUT' },
                });
            }
        }

        const updates: any = {};
        if (input.name !== undefined) updates.name = input.name;
        if (input.description !== undefined) updates.description = input.description;
        if (input.feeDelta !== undefined) updates.feeDelta = input.feeDelta;
        if (input.color !== undefined) updates.color = input.color;
        if (input.priority !== undefined) updates.priority = input.priority;
        if (input.isActive !== undefined) updates.isActive = input.isActive ? 'true' : 'false';
        if (input.geometry !== undefined) updates.geometry = input.geometry;

        return this.repository.update(id, updates);
    }

    async deleteZone(id: string): Promise<boolean> {
        const existing = await this.repository.findById(id);
        if (!existing) {
            throw new GraphQLError('Zone not found', { extensions: { code: 'NOT_FOUND' } });
        }
        return this.repository.delete(id);
    }

    async getAllZones() {
        return this.repository.findAll();
    }

    async getZoneById(id: string) {
        return this.repository.findById(id);
    }

    async calculateDeliveryFee(latitude: number, longitude: number, baseDeliveryFee: number) {
        const zones = await this.repository.findActiveZones();

        let matchedZone: any = null;
        let highestFee = baseDeliveryFee;

        for (const zone of zones) {
            try {
                const geom = JSON.parse(zone.geometry);
                if (geom.type === 'Polygon' && geom.coordinates && geom.coordinates[0]) {
                    const polygon = geom.coordinates[0]; // First ring is outer boundary
                    if (isPointInPolygon({ lat: latitude, lng: longitude }, polygon)) {
                        const zoneTotalFee = baseDeliveryFee + Number(zone.feeDelta);
                        // User wants: "Highest fee wins" for overlaps
                        if (zoneTotalFee > highestFee) {
                            highestFee = zoneTotalFee;
                            matchedZone = zone;
                        }
                    }
                }
            } catch (err) {
                console.error(`Error parsing zone ${zone.id} geometry:`, err);
            }
        }

        return {
            zone: matchedZone,
            totalFee: highestFee,
            baseDeliveryFee,
        };
    }
}
