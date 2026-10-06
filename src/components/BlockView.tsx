import type { Block } from '../content/schema';
import type { Attempt } from '../data/types';
import { ExerciseCard } from '../exercises/ExerciseCard';
import { SpeakButton } from './Audio';
import { Bi } from './Bi';

type Ctx = { lessonId: string; stepId: string; attempts: Attempt[]; onSaved: () => void };

export function BlockView({ block, ctx }: { block: Block; ctx: Ctx }) {
  switch (block.kind) {
    case 'text':
      return (
        <section className="card flat">
          {block.title && <Bi text={block.title} as="div" className="block-title" />}
          <Bi text={block.body} as="p" />
        </section>
      );
    case 'note':
      return (
        <aside className="note">
          <div className="note-title">{block.title?.cs ?? 'Pamatujte si'}</div>
          <Bi text={block.body} as="div" />
        </aside>
      );
    case 'phrases':
      return (
        <section className="card flat">
          {block.title && <Bi text={block.title} as="div" className="block-title" />}
          <div className="phrases">
            {block.items.map((p, i) => (
              <div className="phrase" key={i}>
                <SpeakButton text={p.say ?? p.cs} />
                <div>
                  <div className="phrase-cs">{p.cs}</div>
                  {p.uk && <Bi text={{ cs: '', uk: p.uk }} as="div" className="small" />}
                </div>
              </div>
            ))}
          </div>
        </section>
      );
    case 'dialogue':
      return (
        <section className="card flat">
          {block.title && <Bi text={block.title} as="div" className="block-title" />}
          <div className="dialogue">
            {block.lines.map((l, i) => (
              <div className="dline" key={i}>
                <div className="dline-speaker">{l.speaker}</div>
                <div className="row" style={{ gap: 6, alignItems: 'flex-start', flexWrap: 'nowrap' }}>
                  <Bi text={{ cs: l.cs, uk: l.uk }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      );
    case 'grammar':
      return (
        <section className="card flat">
          <Bi text={block.title} as="div" className="block-title" />
          <div className="table-wrap">
            <table className="gtable">
              <thead>
                <tr>
                  {block.columns.map((c, i) => (
                    <th key={i}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((r, i) => (
                  <tr key={i}>
                    {r.map((c, k) => (
                      <td key={k}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {block.note && <Bi text={block.note} as="p" className="small muted" />}
        </section>
      );
    case 'exercise':
      return (
        <ExerciseCard
          ex={block.exercise}
          lessonId={ctx.lessonId}
          stepId={ctx.stepId}
          history={ctx.attempts.filter((a) => a.exerciseId === block.exercise.id)}
          onSaved={ctx.onSaved}
        />
      );
  }
}
