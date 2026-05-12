import { AIReading, FortuneRecord } from '../domain/types';
import { authenticatedRequest } from './client';

type ApiNote = {
  id: string;
  fulfilled: boolean;
  note: string;
  noted_at: string;
  created_at: string;
};

type ApiRecord = {
  id: string;
  profile_id: string | null;
  question: string;
  hexagram_name: string | null;
  changed_hexagram_name: string | null;
  favorite: boolean;
  cast_at: string;
  payload: FortuneRecord;
  ai_reading_status: string;
  notes: ApiNote[];
  created_at: string;
  updated_at: string;
};

type ApiRecordList = {
  items: ApiRecord[];
  total: number;
  limit: number;
  offset: number;
};

function noteIdFromApi(id: string, index: number) {
  const numeric = Number(id);
  return Number.isFinite(numeric) ? numeric : index + 1;
}

function fromApiRecord(item: ApiRecord): FortuneRecord {
  const payload = item.payload;
  return {
    ...payload,
    id: item.id,
    question: item.question || payload.question,
    createdAt: item.cast_at || payload.createdAt,
    favorite: item.favorite,
    profile: payload.profile,
    verificationNotes: item.notes.map((note, index) => ({
      id: noteIdFromApi(note.id, index),
      fulfilled: note.fulfilled,
      note: note.note,
      createdAt: note.noted_at || note.created_at,
    })),
  };
}

function isCompleteRecord(record: FortuneRecord) {
  return Array.isArray(record.hexagram?.lines)
    && record.hexagram.lines.length === 6
    && Array.isArray(record.hexagram?.changedLines)
    && record.hexagram.changedLines.length === 6
    && Array.isArray(record.hexagram?.movingLineIndexes)
    && Boolean(record.analysis?.spiritAnalyses);
}

function recordTitle(record: FortuneRecord) {
  return {
    hexagram_name: record.hexagram.name,
    changed_hexagram_name: record.hexagram.changedName ?? null,
  };
}

export async function saveRemoteRecord(record: FortuneRecord): Promise<FortuneRecord> {
  const saved = await authenticatedRequest<ApiRecord>('/api/v1/records', {
    method: 'POST',
    body: JSON.stringify({
      id: record.id,
      profile_id: record.profile?.remoteId ?? null,
      question: record.question,
      ...recordTitle(record),
      favorite: Boolean(record.favorite),
      cast_at: record.createdAt,
      payload: record,
    }),
  });
  return fromApiRecord(saved);
}

export async function listRemoteRecords(limit = 100): Promise<FortuneRecord[]> {
  const data = await authenticatedRequest<ApiRecordList>(`/api/v1/records?limit=${limit}`);
  return data.items.map(fromApiRecord).filter(isCompleteRecord);
}

export async function toggleRemoteFavorite(record: FortuneRecord): Promise<FortuneRecord> {
  const updated = await authenticatedRequest<ApiRecord>(`/api/v1/records/${record.id}/favorite`, { method: 'POST' });
  return fromApiRecord(updated);
}

export async function generateRemoteAIReading(recordId: string, lang: 'zh' | 'en' = 'zh'): Promise<AIReading> {
  return authenticatedRequest<AIReading>(`/api/v1/records/${recordId}/ai-reading?lang=${lang}`, { method: 'POST' });
}
