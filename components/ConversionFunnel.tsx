const STAGE_LABELS: Record<number, string> = {
  1: 'Opener',
  2: 'DOB Confirmed / Needs Analysis',
  3: 'Health Screening',
  4: 'Coverage Discussion',
  5: 'Quote Delivered',
  6: 'Application (SSN/Banking)',
  7: 'Vital Info Collected',
  8: 'Close / Sale',
};

type FunnelProps = {
  stageData: { stage_reached: number | null }[];
  dark?: boolean;
};

export default function ConversionFunnel({ stageData, dark }: FunnelProps) {
  const stageCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };
  let funnelTotal = 0;

  for (const row of stageData) {
    const stage = row.stage_reached;
    if (stage == null || stage < 1) continue;
    funnelTotal += 1;
    for (let s = 1; s <= Math.min(stage, 8); s++) {
      stageCounts[s] += 1;
    }
  }

  const maxCount = Math.max(...Object.values(stageCounts), 1);

  if (funnelTotal === 0) {
    return (
      <p className={`text-sm text-center py-6 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
        No calls with stage data yet
      </p>
    );
  }

  return (
    <div>
      <div className={`text-xs mb-3 ${dark ? 'text-gray-500' : 'text-gray-500'}`}>
        {funnelTotal} {funnelTotal === 1 ? 'call' : 'calls'} reached at least Stage 1
      </div>
      <div className="space-y-1.5">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((stage) => {
          const count = stageCounts[stage];
          const pctOfTotal = funnelTotal > 0 ? (count / funnelTotal) * 100 : 0;
          const pctBar = (count / maxCount) * 100;
          const prevCount = stage > 1 ? stageCounts[stage - 1] : count;
          const stepConv = prevCount > 0 ? (count / prevCount) * 100 : 0;

          return (
            <div key={stage} className="flex items-center gap-2">
              <div className={`w-6 text-[10px] font-mono text-right ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
                S{stage}
              </div>
              <div className={`w-36 text-[10px] ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                {STAGE_LABELS[stage]}
              </div>
              <div className={`flex-1 relative h-5 rounded overflow-hidden ${dark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <div
                  className={`h-full transition-all ${
                    stage <= 2
                      ? (dark ? 'bg-gray-600' : 'bg-gray-400')
                      : stage <= 5
                      ? 'bg-emerald-500'
                      : 'bg-emerald-600'
                  }`}
                  style={{ width: `${pctBar}%` }}
                />
                <div className={`absolute inset-0 flex items-center px-2 text-[10px] font-mono ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {count}
                </div>
              </div>
              <div className={`w-10 text-right text-[10px] font-mono ${dark ? 'text-gray-500' : 'text-gray-500'}`}>
                {pctOfTotal.toFixed(0)}%
              </div>
              <div className={`w-14 text-right text-[10px] font-mono ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
                {stage > 1 && prevCount > 0 ? `${stepConv.toFixed(0)}% step` : ''}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
