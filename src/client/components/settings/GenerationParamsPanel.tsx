import { useState, useEffect } from 'react';
import type { GenerationParams } from '@shared/types.js';
import { PARAM_RANGES, PARAM_LABELS, DEFAULT_GEN_PARAMS } from '@shared/constants.js';
import { ParamSlider } from './ParamSlider.js';
import { useGameStore } from '../../stores/gameStore.js';
import { useWS } from '../../App.js';

export function GenerationParamsPanel() {
  const gameParams = useGameStore(s => s.gameState?.generationParams);
  const { send } = useWS();
  const [params, setParams] = useState<GenerationParams>(gameParams ?? DEFAULT_GEN_PARAMS);

  useEffect(() => {
    if (gameParams) setParams(gameParams);
  }, [gameParams]);

  function updateParam(key: keyof GenerationParams, value: number) {
    const updated = { ...params, [key]: value };
    setParams(updated);
    send('update_gen_params', { params: updated });
  }

  const sliderKeys = Object.keys(PARAM_RANGES) as (keyof typeof PARAM_RANGES)[];

  return (
    <div>
      <h4
        className="pixel-text text-xs mb-3"
        style={{ color: 'var(--theme-accent)' }}
      >
        生成参数
      </h4>
      {sliderKeys.map(key => (
        <ParamSlider
          key={key}
          label={PARAM_LABELS[key] ?? key}
          value={(params as any)[key]}
          min={PARAM_RANGES[key].min}
          max={PARAM_RANGES[key].max}
          step={PARAM_RANGES[key].step}
          onChange={v => updateParam(key as keyof GenerationParams, v)}
        />
      ))}
    </div>
  );
}
