export function getSingleArchetypeColor(
  archetypeKey,
  metadataById,
  getFallbackColor,
) {
  const metadata = metadataById.get(archetypeKey);
  return metadata?.color || getFallbackColor(metadata?.type);
}
