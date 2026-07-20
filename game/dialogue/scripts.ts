export type DialogueLine = {
  speaker: string;
  portrait?: string;
  text: string;
};

export type DialogueScript = {
  id: string;
  lines: DialogueLine[];
  /** EventBus event after last line (optional). */
  onCompleteEvent?: 'npc:open-vote' | 'npc:open-cards' | 'quest:talk';
  questNpcId?: string;
};

export const DIALOGUE_SCRIPTS: Record<string, DialogueScript> = {
  'herald-intro': {
    id: 'herald-intro',
    questNpcId: 'herald',
    onCompleteEvent: 'npc:open-vote',
    lines: [
      {
        speaker: 'Guia da Liberdade',
        portrait: 'portrait-herald',
        text: 'Bem-vindo a Magnolia, coração da LiberEther.',
      },
      {
        speaker: 'Guia da Liberdade',
        portrait: 'portrait-herald',
        text: 'SLETH é poder de voto e staking — quanto mais você participa, mais peso carrega na assembleia.',
      },
      {
        speaker: 'Guia da Liberdade',
        portrait: 'portrait-herald',
        text: 'LETH move o ecossistema; stake em SLETH e vote nas propostas. Quer ver a assembleia agora?',
      },
    ],
  },
  'altar-intro': {
    id: 'altar-intro',
    questNpcId: 'altar',
    onCompleteEvent: 'npc:open-cards',
    lines: [
      {
        speaker: 'Card Altar',
        portrait: 'portrait-altar',
        text: 'O Altar transforma educação em cartas — lore da LiberEther cunhada com 1 SLETH.',
      },
      {
        speaker: 'Card Altar',
        portrait: 'portrait-altar',
        text: 'Bronze, prata ou ouro. Parte vai ao tesouro; o resto fica travado até o unmint.',
      },
      {
        speaker: 'Card Altar',
        portrait: 'portrait-altar',
        text: 'Aprenda o ciclo: stake, vote, mint — depois compartilhe o conhecimento.',
      },
    ],
  },
  'scout-forest': {
    id: 'scout-forest',
    questNpcId: 'scout',
    onCompleteEvent: 'quest:talk',
    lines: [
      {
        speaker: 'Scout',
        portrait: 'portrait-scout',
        text: 'As bordas de Magnolia levam ao LiberDEX — onde LETH e stablecoins encontram liquidez.',
      },
      {
        speaker: 'Scout',
        portrait: 'portrait-scout',
        text: 'Explore, depois volte à praça circular. Magnolia espera o Libertador que entende o ecossistema.',
      },
    ],
  },
};
