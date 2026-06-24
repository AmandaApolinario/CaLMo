export const getDiagramEventClientId = (event) =>
  event?.clientId ?? event?.user_id ?? event?.data?.clientId ?? null;

export async function checkpointAfterSuccessful(operation, markSaved) {
  const result = await operation();
  markSaved();
  return result;
}
