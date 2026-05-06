import { useState, useEffect } from 'react';
import type { Character, CharacterTemplate } from '@shared/types.js';
import { AVATAR_LIST } from '@shared/constants.js';
import { PixelAvatar } from '../theme/PixelAvatar.js';
import { useWS } from '../../App.js';

interface CharacterEditorProps {
  template: CharacterTemplate | null;
  currentCharacter: Character | null;
  label?: string;
  sendFn?: (type: string, payload: unknown) => void;
}

export function CharacterEditor({ template, currentCharacter, label, sendFn }: CharacterEditorProps) {
  const { send: defaultSend } = useWS();
  const send = sendFn ?? defaultSend;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [traits, setTraits] = useState('');
  const [backstory, setBackstory] = useState('');
  const [appearance, setAppearance] = useState('');
  const [avatarId, setAvatarId] = useState('warrior');

  useEffect(() => {
    if (currentCharacter) {
      setName(currentCharacter.name);
      setDescription(currentCharacter.description);
      setTraits(currentCharacter.traits.join(', '));
      setBackstory(currentCharacter.backstory);
      setAppearance(currentCharacter.appearance);
      setAvatarId(currentCharacter.avatarId);
    } else if (template) {
      setName(template.name);
      setDescription(template.description);
      setTraits(template.suggestedTraits.join(', '));
      setBackstory(template.suggestedBackstory);
      setAppearance(template.suggestedAppearance);
      setAvatarId(template.suggestedAvatarId);
    }
  }, [template, currentCharacter]);

  function save() {
    const character: Character = {
      name: name.trim() || '无名冒险者',
      description,
      traits: traits.split(/[,，]/).map(t => t.trim()).filter(Boolean),
      backstory,
      appearance,
      avatarId,
    };
    send('update_character', { character });
  }

  return (
    <div
      className="pixel-border p-5 w-full"
      style={{ background: 'var(--theme-bg-secondary)' }}
    >
      <h3
        className="pixel-text text-xs mb-4"
        style={{ color: 'var(--theme-accent)' }}
      >
        {label ?? '角色编辑'}
      </h3>

      {/* Avatar picker */}
      <div className="mb-4">
        <label className="text-xs block mb-2" style={{ color: 'var(--theme-text-secondary)' }}>
          头像
        </label>
        <div className="flex flex-wrap gap-2">
          {AVATAR_LIST.map(a => (
            <button
              key={a.id}
              onClick={() => setAvatarId(a.id)}
              className="p-1 rounded transition-all"
              style={{
                border: avatarId === a.id ? '2px solid var(--theme-accent)' : '2px solid transparent',
                background: avatarId === a.id ? 'var(--theme-surface)' : 'transparent',
              }}
              title={a.name}
            >
              <PixelAvatar avatarId={a.id} size={28} />
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div className="mb-3">
        <label className="text-xs block mb-1" style={{ color: 'var(--theme-text-secondary)' }}>
          角色名
        </label>
        <input
          className="pixel-input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="输入角色名..."
        />
      </div>

      {/* Description */}
      <div className="mb-3">
        <label className="text-xs block mb-1" style={{ color: 'var(--theme-text-secondary)' }}>
          简介
        </label>
        <input
          className="pixel-input"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="一句话描述角色..."
        />
      </div>

      {/* Traits */}
      <div className="mb-3">
        <label className="text-xs block mb-1" style={{ color: 'var(--theme-text-secondary)' }}>
          性格特征（逗号分隔）
        </label>
        <input
          className="pixel-input"
          value={traits}
          onChange={e => setTraits(e.target.value)}
          placeholder="勇敢, 善良, 冲动..."
        />
      </div>

      {/* Backstory */}
      <div className="mb-3">
        <label className="text-xs block mb-1" style={{ color: 'var(--theme-text-secondary)' }}>
          背景故事
        </label>
        <textarea
          className="pixel-input min-h-[60px] resize-y"
          value={backstory}
          onChange={e => setBackstory(e.target.value)}
          placeholder="角色的背景故事..."
        />
      </div>

      {/* Appearance */}
      <div className="mb-4">
        <label className="text-xs block mb-1" style={{ color: 'var(--theme-text-secondary)' }}>
          外貌描述
        </label>
        <textarea
          className="pixel-input min-h-[40px] resize-y"
          value={appearance}
          onChange={e => setAppearance(e.target.value)}
          placeholder="角色的外貌..."
        />
      </div>

      <button className="pixel-btn pixel-btn-primary w-full" onClick={save}>
        保存角色
      </button>
    </div>
  );
}
