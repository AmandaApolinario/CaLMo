import ApiService from '@/services/api.service';

export const publishDiagramEvent = (diagramId, action, data) => {
  return ApiService.post(`cld/${diagramId}/emit-event`, {
    action,
    data
  });
};