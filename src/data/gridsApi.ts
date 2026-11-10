import type { SpaceListSkeleton } from '@/types/feed';
import type { AmigoUser, SpaceData } from '@/types/grid';
import { api, ApiError } from './api/client';
import { readAll, readPage } from './amigosApi';

export { joinSpace } from './discoveryApi';

/** The grids the signed-in user belongs to. */
export const fetchMyGridsPage = (offset: number) => readPage<SpaceListSkeleton>('/space/user_space_getter', offset);
export const fetchMyGrids = () => readAll(fetchMyGridsPage);

/** One grid's profile. Fails with an ApiError when the grid doesn't exist or can't be shown. */
export async function fetchGrid(spaceId: string): Promise<SpaceData> {
  const { data } = await api.get<{ data?: SpaceData | null }>('/space/data', { space_id: spaceId });
  if (!data?.data) throw new ApiError('This grid is unavailable.', 404);
  return data.data;
}

// ---- people in a grid -------------------------------------------------------------------------------------------

// A grid with nobody listed comes back as 409.
export const fetchParticipants = (spaceId: string, offset: number) => readPage<AmigoUser>('/space/participant', offset, { space_id: spaceId }, [404, 409]);
export const fetchAdmins = (spaceId: string) => readAll((offset) => readPage<AmigoUser>('/space/get_admins', offset, { space_id: spaceId }, [404, 409]));

/** The server refuses these with an empty 409, so give that a readable message. */
async function act(run: () => Promise<unknown>, refused: string) {
  try {
    await run();
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) throw new ApiError(refused, 409);
    throw e;
  }
}

export const leaveGrid = (spaceId: string) =>
  act(() => api.put('/space/leave', undefined, { query: { space_id: spaceId } }), 'You can’t leave this grid.');
export const addParticipant = (spaceId: string, userId: string) =>
  act(() => api.put('/space/add', { participant: userId, space_id: spaceId }), 'Couldn’t add them. They may already be in the grid, or only admins can add people.');
export const removeParticipant = (spaceId: string, userId: string) =>
  act(() => api.put('/space/remove', { participant: userId, space_id: spaceId }), 'Couldn’t remove them. Only admins can remove people.');
export const makeAdmin = (spaceId: string, userId: string) =>
  act(() => api.put('/space/make_admin', undefined, { query: { party_id: userId, space_id: spaceId } }), 'Couldn’t make them an admin.');
export const removeAdmin = (spaceId: string, userId: string) =>
  act(() => api.put('/space/remove_admin', undefined, { query: { party_id: userId, space_id: spaceId } }), 'Couldn’t remove their admin role.');
