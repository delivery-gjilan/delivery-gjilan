import { eq, isNull } from 'drizzle-orm';

import { getDB } from '../database';
import { businesses } from '../database/schema';

const GJILAN_CENTER = {
  latitude: 42.4635,
  longitude: 21.4694,
  address: 'Gjilan, Kosovo',
};

const MAX_RADIUS_METERS = 1800;

function hashString(input: string): number {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function getSpreadLocation(seed: string) {
  const radiusHash = hashString(`${seed}:radius`) / 0xffffffff;
  const angleHash = hashString(`${seed}:angle`) / 0xffffffff;
  const radiusMeters = 250 + radiusHash * (MAX_RADIUS_METERS - 250);
  const angleRadians = angleHash * Math.PI * 2;

  const latOffset = (radiusMeters * Math.cos(angleRadians)) / 111320;
  const lngOffset =
    (radiusMeters * Math.sin(angleRadians)) /
    (111320 * Math.cos((GJILAN_CENTER.latitude * Math.PI) / 180));

  return {
    latitude: Number((GJILAN_CENTER.latitude + latOffset).toFixed(6)),
    longitude: Number((GJILAN_CENTER.longitude + lngOffset).toFixed(6)),
    address: `${GJILAN_CENTER.address} (approx)`,
  };
}

async function main() {
  const db = await getDB();

  const allBusinesses = await db.query.businesses.findMany({
    where: isNull(businesses.deletedAt),
    columns: {
      id: true,
      name: true,
    },
  });

  let updatedCount = 0;

  for (const business of allBusinesses) {
    const nextLocation = getSpreadLocation(business.id);
    const updatedAt = new Date().toISOString();

    const updated = await db
      .update(businesses)
      .set({
        locationLat: nextLocation.latitude,
        locationLng: nextLocation.longitude,
        locationAddress: nextLocation.address,
        updatedAt,
      })
      .where(eq(businesses.id, business.id))
      .returning({ id: businesses.id, name: businesses.name });

    if (updated.some((item) => item.id === business.id)) {
      updatedCount += 1;
      console.log(`- ${business.name}: ${nextLocation.latitude}, ${nextLocation.longitude}`);
    }
  }

  console.log(`Updated ${updatedCount} businesses to spread around Gjilan.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to update business locations:', error);
    process.exit(1);
  });
