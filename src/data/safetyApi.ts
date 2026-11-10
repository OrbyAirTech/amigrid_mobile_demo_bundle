import { api, ApiError } from './api/client';

/** Why you can report a person. The server only accepts these. */
export const USER_REASONS = [
  { key: 'spam', label: 'Spam' },
  { key: 'harassment', label: 'Harassment' },
  { key: 'hate_speech', label: 'Hate speech' },
  { key: 'impersonation', label: 'Pretending to be someone' },
  { key: 'nudity', label: 'Nudity' },
  { key: 'violence', label: 'Violence' },
  { key: 'scam', label: 'Scam' },
  { key: 'other', label: 'Something else' },
] as const;
export type UserReason = (typeof USER_REASONS)[number]['key'];

/** The server answers 409 for a duplicate pending report or a report against yourself. */
const refused = (e: unknown, message: string): never => {
  if (e instanceof ApiError && e.status === 409) throw new ApiError(message, 409);
  throw e;
};

/** POST /safety/report_user. One pending report per person; the reporter is taken from the session. */
export async function reportUser(userId: string, reason: UserReason, description?: string) {
  try {
    await api.post('/safety/report_user', { reported_user: Number(userId), reason, description: description?.trim() || null });
  } catch (e) {
    refused(e, 'You’ve already reported this person, and we’re looking into it.');
  }
}

/** POST /safety/report_issue pointing at a grid (ref_table 'spaces'). Category 'content' is for things people posted or run. */
export async function reportGrid(spaceId: string, gridName: string, reason: string, details?: string) {
  const description = [reason, details?.trim()].filter(Boolean).join(': ');
  await api.post('/safety/report_issue', {
    category: 'content',
    subject: `Reported grid: ${gridName}`.slice(0, 200),
    description: description.slice(0, 2000),
    ref_id: Number(spaceId),
    ref_table: 'spaces',
  });
}
