import Tag from '@/components/ui/Tag';
import { IconLightbulb } from '@/components/ui/Icons';
import { getResearchTypeInfo } from '@/lib/constants';
import type { Entry } from '@/types';

export default function EntryTags({ entry, showProject, showEnergy }: { entry: Entry; showProject?: boolean; showEnergy?: boolean }) {
  const rType = getResearchTypeInfo(entry.research_type || '');
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
      {entry.topic_tag_id && <Tag label={entry.topic_tag_id.split('.').pop() || ''} color="var(--accent-sky)" />}
      {showProject && entry.project_tag_id && <Tag label={entry.project_tag_id.split('.').pop() || ''} color="#818cf8" />}
      {entry.research_type && <Tag label={rType.label} color={rType.color} />}
      {showEnergy && (
        <>
          <Tag label={`能量 ${entry.energy_level}`} color={entry.energy_level >= 4 ? 'var(--accent-emerald)' : '#fb7185'} />
          {entry.aha_moment && <IconLightbulb size={16} />}
        </>
      )}
    </div>
  );
}
