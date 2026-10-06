import { GapInput } from './GapFill';
import type { ExProps } from './types';

export function Table({ ex, value, onChange, result, reveal }: ExProps<'table'>) {
  const given = new Set(ex.given.map(([r, c]) => `${r}:${c}`));
  // grade() lists blank cells row-major; map each to its result index.
  const indexOf = new Map<string, number>();
  let n = 0;
  ex.rows.forEach((row, r) =>
    row.cells.forEach((_, c) => {
      if (!given.has(`${r}:${c}`)) indexOf.set(`${r}:${c}`, n++);
    }),
  );

  return (
    <div className="table-wrap">
      <table className="gtable ctable">
        <thead>
          <tr>
            <th />
            {ex.columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ex.rows.map((row, r) => (
            <tr key={r}>
              <td>{row.label}</td>
              {row.cells.map((cell, c) => {
                const k = `${r}:${c}`;
                return (
                  <td key={c}>
                    {given.has(k) ? (
                      <b>{cell.split('|').join(' / ')}</b>
                    ) : (
                      <GapInput
                        value={value[k] ?? ''}
                        onChange={(v) => onChange({ ...value, [k]: v })}
                        result={result?.items[indexOf.get(k)!]}
                        reveal={reveal}
                        expected={cell}
                        width={9}
                      />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
