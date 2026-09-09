export interface QuestionOption {
  value: number
  label: string
  hint?: string
}

export interface OnboardingQuestion {
  id: string
  title: string
  hint: string
  options: QuestionOption[]
}

export interface OnboardingAnswer {
  questionId: string
  value: number
}

// M21 - Onboarding / Perfil do investidor
// Perguntas padrao para identificar o tipo de cliente e o perfil de risco.
// Cada opcao tem peso 0..3; o perfil final e calculado em calculateProfile().

export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  {
    id: 'horizon',
    title: 'Qual o seu horizonte de investimento?',
    hint: 'Prazo ate precisar usar o dinheiro',
    options: [
      { value: 0, label: 'Menos de 1 ano', hint: 'Objetivo de curto prazo / liquidez' },
      { value: 1, label: '1 a 3 anos', hint: 'Medio prazo' },
      { value: 2, label: '3 a 5 anos', hint: 'Medio-longo prazo' },
      { value: 3, label: 'Mais de 5 anos', hint: 'Longo prazo / aposentadoria' },
    ],
  },
  {
    id: 'loss_tolerance',
    title: 'Como voce reagiria se sua carteira caísse 10% em um mes?',
    hint: 'Tolerancia a perdas temporarias',
    options: [
      { value: 0, label: 'Venderia tudo imediatamente', hint: 'Baixa tolerancia a oscilacao' },
      { value: 1, label: 'Ficaria incomodado, venderia parte', hint: 'Tolerancia moderada-baixa' },
      { value: 2, label: 'Manteria, sabendo que pode oscilar', hint: 'Boa tolerancia' },
      { value: 3, label: 'Aproveitaria para comprar mais', hint: 'Alta tolerancia' },
    ],
  },
  {
    id: 'objective',
    title: 'Qual o principal objetivo com seus investimentos?',
    hint: 'Motivacao principal',
    options: [
      { value: 0, label: 'Preservar o patrimonio', hint: 'Seguranca acima de tudo' },
      { value: 1, label: 'Gerar renda (dividendos, juros)', hint: 'Renda recorrente' },
      { value: 2, label: 'Fazer o patrimonio crescer', hint: 'Valorizacao' },
      { value: 3, label: 'Retornos altos, mesmo com risco', hint: 'Maximizar retorno' },
    ],
  },
  {
    id: 'knowledge',
    title: 'Qual o seu conhecimento em produtos de investimento?',
    hint: 'Nivel de experiencia',
    options: [
      { value: 0, label: 'Nunca investi', hint: 'Iniciante' },
      { value: 1, label: 'Renda fixa (CDB, Tesouro, fundos)', hint: 'Basico' },
      { value: 2, label: 'Acoes, ETFs e fundos imobiliarios', hint: 'Intermediario' },
      { value: 3, label: 'Derivativos, opcoes, alavancagem', hint: 'Avancado' },
    ],
  },
  {
    id: 'capital',
    title: 'Qual o valor total que pretende investir (patrimonio investido)?',
    hint: 'Faixa de aporte',
    options: [
      { value: 0, label: 'Ate US$ 10 mil' },
      { value: 1, label: 'US$ 10 mil a US$ 50 mil' },
      { value: 2, label: 'US$ 50 mil a US$ 200 mil' },
      { value: 3, label: 'Acima de US$ 200 mil' },
    ],
  },
  {
    id: 'frequency',
    title: 'Com qual frequencia voce costuma tomar decisoes de investimento?',
    hint: 'Atividade na carteira',
    options: [
      { value: 0, label: 'Raramente', hint: 'Compro e mantenho' },
      { value: 1, label: 'Ocasionalmente', hint: 'Reviso a cada alguns meses' },
      { value: 2, label: 'Frequentemente', hint: 'Acompanho semanalmente' },
      { value: 3, label: 'Diariamente', hint: 'Opero ativamente' },
    ],
  },
  {
    id: 'variable_income',
    title: 'Que percentual da sua carteira estaria confortavel em renda variavel?',
    hint: 'Acoes, ETFs, cripto etc.',
    options: [
      { value: 0, label: 'Nao quero renda variavel', hint: 'Predominio de renda fixa' },
      { value: 1, label: 'Ate 30%' },
      { value: 2, label: 'Ate 60%' },
      { value: 3, label: 'Acima de 60%' },
    ],
  },
  {
    id: 'platform_use',
    title: 'Como voce pretende usar esta plataforma?',
    hint: 'Identifica o tipo de usuario',
    options: [
      { value: 0, label: 'Apenas acompanhar meus investimentos' },
      { value: 1, label: 'Investir ocasionalmente, com ajuda' },
      { value: 2, label: 'Operar ativamente o mercado' },
      { value: 3, label: 'Gerenciar carteira propria ou de terceiros (profissional)' },
    ],
  },
]

export const RISK_PROFILE_LABELS: Record<string, string> = {
  CONSERVATIVE: 'Conservador',
  MODERATE: 'Moderado',
  AGGRESSIVE: 'Arrojado',
}

export const CLIENT_TYPE_LABELS: Record<string, string> = {
  BEGINNER: 'Iniciante',
  ENTHUSIAST: 'Entusiasta',
  INTERMEDIATE: 'Intermediario',
  ADVANCED: 'Avancado',
  PROFESSIONAL: 'Profissional / Gestor',
}