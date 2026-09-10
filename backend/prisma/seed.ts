import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding...')

  // Users
  const adminPassword = await bcrypt.hash('admin123', 10)
  const userPassword = await bcrypt.hash('user123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@mercado.com' },
    update: {},
    create: {
      email: 'admin@mercado.com',
      passwordHash: adminPassword,
      name: 'Administrador',
      role: 'ADMIN',
    },
  })

  const julio = await prisma.user.upsert({
    where: { email: 'julio@mercado.com' },
    update: {},
    create: {
      email: 'julio@mercado.com',
      passwordHash: userPassword,
      name: 'Julio',
      role: 'RETENTION',
    },
  })

  console.log('Users:', admin.email, julio.email)

  // Sectors
  const tech = await prisma.sector.upsert({
    where: { name: 'Technology' },
    update: {},
    create: { name: 'Technology' },
  })

  const subsectors = ['AI', 'Semiconductors', 'Software', 'Cloud', 'Cybersecurity', 'Hardware', 'Fintech']
  for (const name of subsectors) {
    await prisma.sector.upsert({
      where: { name },
      update: {},
      create: { name, parentId: tech.id },
    })
  }

  const health = await prisma.sector.upsert({
    where: { name: 'Healthcare' },
    update: {},
    create: { name: 'Healthcare' },
  })
  for (const name of ['Pharma', 'Biotech', 'MedTech', 'Insurance', 'Healthcare Services']) {
    await prisma.sector.upsert({
      where: { name },
      update: {},
      create: { name, parentId: health.id },
    })
  }

  // Stocks
  const stocks = [
    { ticker: 'NVDA', name: 'NVIDIA', sector: 'Technology', industry: 'Semiconductors' },
    { ticker: 'AAPL', name: 'Apple', sector: 'Technology', industry: 'Hardware' },
    { ticker: 'MSFT', name: 'Microsoft', sector: 'Technology', industry: 'Software' },
    { ticker: 'AMD', name: 'Advanced Micro Devices', sector: 'Technology', industry: 'Semiconductors' },
    { ticker: 'AVGO', name: 'Broadcom', sector: 'Technology', industry: 'Semiconductors' },
    { ticker: 'INTC', name: 'Intel', sector: 'Technology', industry: 'Semiconductors' },
    { ticker: 'GOOGL', name: 'Alphabet', sector: 'Technology', industry: 'Software' },
    { ticker: 'META', name: 'Meta Platforms', sector: 'Technology', industry: 'Software' },
    { ticker: 'TSLA', name: 'Tesla', sector: 'Technology', industry: 'Automotive' },
    { ticker: 'JPM', name: 'JPMorgan Chase', sector: 'Financial', industry: 'Banking' },
    { ticker: 'XOM', name: 'Exxon Mobil', sector: 'Energy', industry: 'Oil & Gas' },
    { ticker: 'PFE', name: 'Pfizer', sector: 'Healthcare', industry: 'Pharma' },
  ]

  const stockAssets: any[] = []
  for (const s of stocks) {
    const asset = await prisma.asset.upsert({
      where: { ticker_type: { ticker: s.ticker, type: 'STOCK' } },
      update: {},
      create: {
        ticker: s.ticker,
        name: s.name,
        type: 'STOCK',
        market: 'US',
        country: 'US',
        exchange: 'NASDAQ',
        sector: s.sector,
        industry: s.industry,
        currency: 'USD',
      },
    })
    stockAssets.push(asset)
  }

  // Crypto
  const cryptos = [
    { ticker: 'BTC', name: 'Bitcoin', category: 'Layer 1' },
    { ticker: 'ETH', name: 'Ethereum', category: 'Layer 1' },
    { ticker: 'SOL', name: 'Solana', category: 'Layer 1' },
    { ticker: 'XRP', name: 'XRP', category: 'Payments' },
    { ticker: 'BNB', name: 'BNB', category: 'Exchange' },
    { ticker: 'ADA', name: 'Cardano', category: 'Layer 1' },
  ]

  const cryptoAssets: any[] = []
  for (const c of cryptos) {
    const asset = await prisma.asset.upsert({
      where: { ticker_type: { ticker: c.ticker, type: 'CRYPTO' } },
      update: {},
      create: {
        ticker: c.ticker,
        name: c.name,
        type: 'CRYPTO',
        market: 'Crypto',
        sector: c.category,
        currency: 'USD',
      },
    })
    cryptoAssets.push(asset)
  }

  // Forex pairs
  const forex = [
    { ticker: 'EURUSD', name: 'Euro / US Dollar' },
    { ticker: 'GBPUSD', name: 'British Pound / US Dollar' },
    { ticker: 'USDJPY', name: 'US Dollar / Japanese Yen' },
    { ticker: 'USDCHF', name: 'US Dollar / Swiss Franc' },
    { ticker: 'EURGBP', name: 'Euro / British Pound' },
    { ticker: 'EURJPY', name: 'Euro / Japanese Yen' },
  ]

  const forexAssets: any[] = []
  for (const f of forex) {
    const asset = await prisma.asset.upsert({
      where: { ticker_type: { ticker: f.ticker, type: 'FOREX' } },
      update: {},
      create: {
        ticker: f.ticker,
        name: f.name,
        type: 'FOREX',
        market: 'Forex',
        currency: 'USD',
      },
    })
    forexAssets.push(asset)
  }

  // Indices
  const indices = [
    { ticker: 'SPX', name: 'S&P 500' },
    { ticker: 'NDX', name: 'NASDAQ 100' },
    { ticker: 'DJI', name: 'Dow Jones Industrial Average' },
    { ticker: 'DAX', name: 'DAX' },
    { ticker: 'STOXX', name: 'Euro Stoxx 50' },
    { ticker: 'PSI20', name: 'PSI 20' },
  ]

  const indexAssets: any[] = []
  for (const i of indices) {
    const asset = await prisma.asset.upsert({
      where: { ticker_type: { ticker: i.ticker, type: 'INDEX' } },
      update: {},
      create: {
        ticker: i.ticker,
        name: i.name,
        type: 'INDEX',
        market: 'Indices' as any,
        exchange: i.ticker === 'PSI20' || i.ticker === 'DAX' || i.ticker === 'STOXX' ? 'EU' : 'US',
        currency: 'USD',
      },
    })
    indexAssets.push(asset)
  }

  // ETFs
  const etfs = [
    { ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust', sector: 'Indices' },
    { ticker: 'QQQ', name: 'Invesco QQQ Trust', sector: 'Technology' },
    { ticker: 'IVV', name: 'iShares Core S&P 500 ETF', sector: 'Indices' },
    { ticker: 'VTI', name: 'Vanguard Total Stock Market ETF', sector: 'Broad Market' },
    { ticker: 'GLD', name: 'SPDR Gold Shares', sector: 'Precious Metals' },
    { ticker: 'EEM', name: 'iShares MSCI Emerging Markets ETF', sector: 'Emerging Markets' },
  ]

  const etfAssets: any[] = []
  for (const e of etfs) {
    const asset = await prisma.asset.upsert({
      where: { ticker_type: { ticker: e.ticker, type: 'ETF' } },
      update: {},
      create: {
        ticker: e.ticker,
        name: e.name,
        type: 'ETF',
        market: 'ETF',
        exchange: 'US',
        sector: e.sector,
        currency: 'USD',
      },
    })
    etfAssets.push(asset)
  }

  // ETF quotes
  const etfQuotes = [
    { price: 562.4, change1D: 0.42, change5D: 1.4, change30D: 3.1, marketCap: 560000000000, volume: 52000000, expenseRatio: 0.09 },
    { price: 485.7, change1D: 0.85, change5D: 2.2, change30D: 5.6, marketCap: 290000000000, volume: 44000000, expenseRatio: 0.2 },
    { price: 566.2, change1D: 0.4, change5D: 1.3, change30D: 3.0, marketCap: 420000000000, volume: 38000000, expenseRatio: 0.03 },
    { price: 294.7, change1D: 0.5, change5D: 1.6, change30D: 3.8, marketCap: 410000000000, volume: 22000000, expenseRatio: 0.03 },
    { price: 242.8, change1D: -0.7, change5D: -1.1, change30D: 4.2, marketCap: 68000000000, volume: 8500000, expenseRatio: 0.4 },
    { price: 44.9, change1D: 0.3, change5D: 1.9, change30D: 2.7, marketCap: 61000000000, volume: 32000000, expenseRatio: 0.7 },
  ]

  etfAssets.forEach(async (asset, i) => {
    const q = etfQuotes[i]
    if (!q) return
    await prisma.quote.upsert({
      where: { id: `quote-${asset.id}` },
      update: {},
      create: {
        id: `quote-${asset.id}`,
        assetId: asset.id,
        price: q.price,
        open: q.price * 0.996,
        high: q.price * 1.008,
        low: q.price * 0.992,
        prevClose: q.price / (1 + q.change1D / 100),
        volume: BigInt(q.volume),
        marketCap: BigInt(q.marketCap),
        changePct1D: q.change1D,
        changePct5D: q.change5D,
        changePct30D: q.change30D,
      },
    })
    await prisma.fundamental.upsert({
      where: { id: `f-${asset.id}` },
      update: {},
      create: {
        id: `f-${asset.id}`,
        assetId: asset.id,
        marketCap: BigInt(q.marketCap),
        aum: BigInt(q.marketCap),
        expenseRatio: q.expenseRatio,
      },
    })
  })

  // Quotes for stocks
  const stockQuotes = [
    { price: 128.5, change1D: 3.25, change5D: 8.1, change30D: 25.4, marketCap: 3150000000000, volume: 45000000, pe: 55.2 },
    { price: 242.3, change1D: 0.8, change5D: 1.2, change30D: 4.5, marketCap: 3650000000000, volume: 62000000, pe: 34.1 },
    { price: 485.2, change1D: 0.5, change5D: 1.8, change30D: 6.2, marketCap: 3600000000000, volume: 28000000, pe: 38.7 },
    { price: 165.4, change1D: -2.1, change5D: -3.5, change30D: 12.8, marketCap: 268000000000, volume: 75000000, pe: 88.3 },
    { price: 178.2, change1D: 1.2, change5D: 2.5, change30D: 15.2, marketCap: 880000000000, volume: 18000000, pe: 42.1 },
    { price: 22.8, change1D: -3.4, change5D: -5.2, change30D: -8.4, marketCap: 97000000000, volume: 88000000, pe: 15.3 },
    { price: 168.1, change1D: 0.7, change5D: 1.5, change30D: 3.2, marketCap: 2050000000000, volume: 32000000, pe: 27.4 },
    { price: 512.3, change1D: 1.8, change5D: 3.1, change30D: 8.6, marketCap: 1300000000000, volume: 20000000, pe: 29.8 },
    { price: 245.6, change1D: -0.9, change5D: -2.4, change30D: 5.1, marketCap: 780000000000, volume: 98000000, pe: 68.5 },
    { price: 210.4, change1D: 0.4, change5D: 1.1, change30D: 2.8, marketCap: 590000000000, volume: 12000000, pe: 12.6 },
    { price: 108.2, change1D: 0.6, change5D: 0.9, change30D: -1.5, marketCap: 480000000000, volume: 18000000, pe: 11.2 },
    { price: 28.4, change1D: -0.3, change5D: -1.2, change30D: -3.8, marketCap: 160000000000, volume: 45000000, pe: 13.9 },
  ]

  stockAssets.forEach(async (asset, i) => {
    const q = stockQuotes[i]
    if (!q) return
    await prisma.quote.upsert({
      where: { id: `quote-${asset.id}` },
      update: {},
      create: {
        id: `quote-${asset.id}`,
        assetId: asset.id,
        price: q.price,
        open: q.price * 0.995,
        high: q.price * 1.01,
        low: q.price * 0.99,
        prevClose: q.price / (1 + q.change1D / 100),
        volume: BigInt(q.volume),
        marketCap: BigInt(q.marketCap),
        changePct1D: q.change1D,
        changePct5D: q.change5D,
        changePct30D: q.change30D,
      },
    })
    await prisma.fundamental.upsert({
      where: { id: `f-${asset.id}` },
      update: {},
      create: {
        id: `f-${asset.id}`,
        assetId: asset.id,
        marketCap: BigInt(q.marketCap),
        peRatio: q.pe,
        revenue: BigInt(Math.round(q.marketCap / (q.pe || 20))),
        eps: parseFloat((q.price / q.pe).toFixed(2)),
        roe: 25.4,
        roa: 12.8,
        dividendYield: q.pe > 40 ? 0.5 : 1.8,
      },
    })
  })

  // Crypto quotes
  const cryptoQuotes = [
    { price: 67500.5, change1D: 2.1, change5D: 5.4, change30D: 12.3, marketCap: 1330000000000, volume: 28000000000 },
    { price: 3450.2, change1D: 1.8, change5D: 4.2, change30D: 8.7, marketCap: 415000000000, volume: 15500000000 },
    { price: 152.4, change1D: -1.2, change5D: 2.8, change30D: 15.6, marketCap: 68000000000, volume: 3800000000 },
    { price: 0.62, change1D: 0.9, change5D: -1.5, change30D: 4.2, marketCap: 34000000000, volume: 1500000000 },
    { price: 585.1, change1D: 0.3, change5D: 1.2, change30D: 3.1, marketCap: 88000000000, volume: 2200000000 },
    { price: 0.44, change1D: -0.5, change5D: 0.8, change30D: -2.5, marketCap: 15500000000, volume: 800000000 },
  ]

  cryptoAssets.forEach(async (asset, i) => {
    const q = cryptoQuotes[i]
    if (!q) return
    await prisma.quote.upsert({
      where: { id: `quote-${asset.id}` },
      update: {},
      create: {
        id: `quote-${asset.id}`,
        assetId: asset.id,
        price: q.price,
        open: q.price * 0.998,
        high: q.price * 1.015,
        low: q.price * 0.985,
        prevClose: q.price / (1 + q.change1D / 100),
        volume: BigInt(q.volume),
        marketCap: BigInt(q.marketCap),
        changePct1D: q.change1D,
        changePct5D: q.change5D,
        changePct30D: q.change30D,
      },
    })
  })

  // Forex quotes
  const forexQuotes = [
    { price: 1.1742, change1D: 0.12 },
    { price: 1.2684, change1D: -0.24 },
    { price: 151.32, change1D: 0.35 },
    { price: 0.8856, change1D: -0.08 },
    { price: 0.8549, change1D: 0.18 },
    { price: 163.41, change1D: 0.45 },
  ]

  forexAssets.forEach(async (asset, i) => {
    const q = forexQuotes[i]
    if (!q) return
    await prisma.quote.upsert({
      where: { id: `quote-${asset.id}` },
      update: {},
      create: {
        id: `quote-${asset.id}`,
        assetId: asset.id,
        price: q.price,
        bid: q.price - 0.0001,
        ask: q.price + 0.0001,
        open: q.price * 0.9995,
        high: q.price * 1.003,
        low: q.price * 0.997,
        prevClose: q.price / (1 + q.change1D / 100),
        volume: BigInt(12500000),
        changePct1D: q.change1D,
        changePct5D: q.change1D * 3,
        changePct30D: q.change1D * 8,
      },
    })
  })

  // Index quotes
  indexAssets.forEach(async (asset, i) => {
    const prices = [5800.2, 18750.4, 41200.6, 19250.3, 5100.8, 6450.2]
    const changes = [0.35, 0.52, 0.21, -0.15, 0.28, -0.42]
    const q = { price: prices[i % prices.length], change1D: changes[i % changes.length] }
    await prisma.quote.upsert({
      where: { id: `quote-${asset.id}` },
      update: {},
      create: {
        id: `quote-${asset.id}`,
        assetId: asset.id,
        price: q.price,
        open: q.price * 0.995,
        high: q.price * 1.004,
        low: q.price * 0.996,
        prevClose: q.price / (1 + q.change1D / 100),
        volume: BigInt(500000000),
        marketCap: q.price > 10000 ? BigInt(58000000000000) : BigInt(25000000000000),
        changePct1D: q.change1D,
      },
    })
  })

  // Clients
  const clients = [
    { name: 'João Silva', country: 'Portugal', status: 'ACTIVE' as any, stage: 'RECOVERED' as any, interests: ['Crypto', 'Technology', 'EUR/USD'] },
    { name: 'Maria Santos', country: 'Portugal', status: 'AT_RISK' as any, stage: 'RECOVERY' as any, interests: ['Technology', 'ETF'] },
    { name: 'Pedro Costa', country: 'Portugal', status: 'ACTIVE' as any, stage: 'RECOVERED' as any, interests: ['S&P 500', 'Real Estate'] },
    { name: 'Ana Oliveira', country: 'Brasil', status: 'ACTIVE' as any, stage: 'CONTACTED' as any, interests: ['BTC', 'Stocks'] },
    { name: 'Carlos Pereira', country: 'Portugal', status: 'INACTIVE' as any, stage: 'CONTACTED' as any, interests: ['Forex'] },
    { name: 'Sofia Almeida', country: 'Portugal', status: 'ACTIVE' as any, stage: 'RECOVERED' as any, interests: ['Crypto', 'AI'] },
    { name: 'Ricardo Fernandes', country: 'Brasil', status: 'AT_RISK' as any, stage: 'RECOVERY' as any, interests: ['NVDA', 'Tech'] },
    { name: 'Beatriz Rodrigues', country: 'Portugal', status: 'ACTIVE' as any, stage: 'RECOVERED' as any, interests: ['ETF', 'Index'] },
  ]

  const clientRecords = []
  for (const c of clients) {
    const client = await prisma.client.upsert({
      where: { id: c.name === 'João Silva' ? 'client-joao' : c.name === 'Maria Santos' ? 'client-maria' : `client-${c.name.toLowerCase().replace(/\s/g, '-')}` },
      update: { retentionStage: c.stage },
      create: {
        id: c.name === 'João Silva' ? 'client-joao' : c.name === 'Maria Santos' ? 'client-maria' : `client-${c.name.toLowerCase().replace(/\s/g, '-')}`,
        name: c.name,
        country: c.country,
        status: c.status,
        retentionStage: c.stage,
        ownerId: julio.id,
        lastContactAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000),
        lastLoginAt: new Date(Date.now() - Math.floor(Math.random() * 60) * 86400000),
        interests: {
          create: c.interests.map((i: string) => ({ interest: i, weight: 5 })),
        },
      },
    })
    clientRecords.push(client)
  }

  // Contas demo por papel + vinculo cliente <-> usuario do portal
  const demoUsers: Array<{ email: string; name: string; role: any; clientName: string }> = [
    { email: 'cliente@mercado.com', name: 'Cliente Demo', role: 'CLIENT', clientName: 'João Silva' },
    { email: 'assessor@mercado.com', name: 'Assessor Demo', role: 'SALES', clientName: 'João Silva' },
    { email: 'retencao@mercado.com', name: 'Retencao Demo', role: 'RETENTION', clientName: 'Maria Santos' },
  ]

  for (const du of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email: du.email },
      update: { role: du.role },
      create: { email: du.email, name: du.name, passwordHash: userPassword, role: du.role },
    })
    if (du.role === 'CLIENT') {
      const targetClient = clientRecords.find((c) => c.name === du.clientName)
      if (targetClient) {
        await prisma.client.update({ where: { id: targetClient.id }, data: { userId: user.id } })
      }
    }
  }

  // Documento de exemplo vinculado ao Joao
  const joao = clientRecords.find((c) => c.name === 'João Silva')
  if (joao) {
    const samplePdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF')
    await prisma.clientDocument.upsert({
      where: { id: 'doc-joao-exemplo' },
      update: {},
      create: {
        id: 'doc-joao-exemplo',
        clientId: joao.id,
        uploadedById: julio.id,
        name: 'contrato-adesao.pdf',
        category: 'CONTRATO',
        mimeType: 'application/pdf',
        size: samplePdf.length,
        data: samplePdf,
      },
    })
  }

  // Tasks
  const taskTemplates = [
    { title: 'Follow-up João - interesse em NVDA', type: 'FOLLOW_UP', priority: 'HIGH', status: 'OPEN' as any, clientIdx: 0 },
    { title: 'Ligar para Maria - risco de churn', type: 'CALL', priority: 'HIGH', status: 'OPEN' as any, clientIdx: 1 },
    { title: 'Reactivar Carlos', type: 'REACTIVATION', priority: 'MEDIUM', status: 'OPEN' as any, clientIdx: 4 },
    { title: 'Research - setor de AI', type: 'RESEARCH', priority: 'MEDIUM', status: 'IN_PROGRESS' as any, clientIdx: null },
    { title: 'Revisar portfolio Ana', type: 'REVIEW', priority: 'MEDIUM', status: 'OPEN' as any, clientIdx: 3 },
    { title: 'Compliance - check KYC', type: 'COMPLIANCE', priority: 'LOW', status: 'DONE' as any, clientIdx: 0 },
  ]

  for (const t of taskTemplates) {
    await prisma.task.create({
      data: {
        title: t.title,
        type: t.type,
        priority: t.priority,
        status: t.status,
        ownerId: julio.id,
        clientId: t.clientIdx !== null ? clientRecords[t.clientIdx]?.id : undefined,
        dueAt: new Date(Date.now() + 24 * 3600000),
      },
    })
  }

  // News
  const newsItems = [
    { title: 'NVIDIA earnings beat expectations again, stock surges', source: 'Reuters', impact: 'HIGH', sentiment: 0.85, sector: 'Technology' },
    { title: 'Bitcoin breaks $68k as ETF flows continue', source: 'CoinDesk', impact: 'HIGH', sentiment: 0.7, sector: 'Crypto' },
    { title: 'ECB signals potential rate cut in Q4', source: 'Bloomberg', impact: 'MEDIUM', sentiment: 0.4, sector: 'Macro' },
    { title: 'S&P 500 hits new all-time high', source: 'CNBC', impact: 'HIGH', sentiment: 0.9, sector: 'Indices' },
    { title: 'Oil prices drop as OPEC+ considers output increase', source: 'Reuters', impact: 'MEDIUM', sentiment: -0.3, sector: 'Energy' },
    { title: 'Fed officials split on next rate decision', source: 'FT', impact: 'HIGH', sentiment: -0.1, sector: 'Macro' },
    { title: 'EUR/USD stabilizes after ECB speech', source: 'Bloomberg', impact: 'LOW', sentiment: 0.2, sector: 'Forex' },
    { title: 'AMD launches new AI chip to compete with NVIDIA', source: 'CNBC', impact: 'MEDIUM', sentiment: 0.55, sector: 'Technology' },
  ]

  for (const n of newsItems) {
    await prisma.newsArticle.create({
      data: {
        title: n.title,
        source: n.source,
        impact: n.impact,
        sentiment: n.sentiment,
        sector: n.sector,
        publishedAt: new Date(Date.now() - Math.floor(Math.random() * 48) * 3600000),
      },
    })
  }

  // Watchlist global
  const globalWatchlist = await prisma.watchlist.upsert({
    where: { id: 'wl-global' },
    update: {},
    create: {
      id: 'wl-global',
      name: 'Global',
      isGlobal: true,
    },
  })

  const wlAssets = [stockAssets[0], cryptoAssets[0], cryptoAssets[1], forexAssets[0], indexAssets[0]]
  for (let i = 0; i < wlAssets.length; i++) {
    await prisma.watchlistAsset.upsert({
      where: { watchlistId_assetId: { watchlistId: globalWatchlist.id, assetId: wlAssets[i].id } },
      update: {},
      create: { watchlistId: globalWatchlist.id, assetId: wlAssets[i].id, order: i },
    })
  }

  // Alerts
  const alertTemplates = [
    { type: 'MARKET' as any, condition: '<', threshold: -5, description: 'BTC caiu' },
    { type: 'PRICE' as any, condition: '<', threshold: 100, description: 'NVDA price alert' },
    { type: 'CLIENT' as any, condition: 'inactive', description: 'Cliente inativo' },
  ]

  for (const a of alertTemplates) {
    await prisma.alert.create({
      data: {
        type: a.type,
        condition: a.condition,
        threshold: a.threshold,
        userId: julio.id,
        ...(a.type === 'PRICE' ? { assetId: stockAssets[0].id } : {}),
        ...(a.type === 'MARKET' ? { assetId: cryptoAssets[0].id } : {}),
        ...(a.type === 'CLIENT' ? { clientId: clientRecords[1].id } : {}),
      },
    })
  }

  // MACRO (M11)
  const macroIndicators = [
    { code: 'FED_RATE', name: 'Fed Funds Rate', country: 'EUA', region: 'Americas', frequency: 'Monthly', unit: '%', description: 'Taxa básica de juros dos EUA' },
    { code: 'ECB_RATE', name: 'ECB Main Rate', country: 'Zona Euro', region: 'Europe', frequency: 'Monthly', unit: '%', description: 'Taxa principal do BCE' },
    { code: 'US_CPI', name: 'Consumer Price Index (US)', country: 'EUA', region: 'Americas', frequency: 'Monthly', unit: 'YoY %', description: 'Inflação ao consumidor dos EUA' },
    { code: 'US_UNEMP', name: 'Unemployment Rate (US)', country: 'EUA', region: 'Americas', frequency: 'Monthly', unit: '%', description: 'Taxa de desemprego dos EUA' },
    { code: 'BR_SELIC', name: 'Taxa Selic', country: 'Brasil', region: 'Americas', frequency: 'Monthly', unit: '% a.a.', description: 'Taxa básica de juros do Brasil' },
    { code: 'PT_CPI', name: 'IPC Portugal', country: 'Portugal', region: 'Europe', frequency: 'Monthly', unit: 'YoY %', description: 'Inflação ao consumidor de Portugal' },
  ]

  for (const ind of macroIndicators) {
    const indicator = await prisma.economicIndicator.upsert({
      where: { code: ind.code },
      update: {},
      create: ind,
    })

    await prisma.economicObservation.upsert({
      where: { indicatorId_period: { indicatorId: indicator.id, period: new Date('2026-01-01') } },
      update: {},
      create: { indicatorId: indicator.id, value: 3.5 + Math.random() * 2, period: new Date('2026-01-01'), previous: 3.4 + Math.random() * 2 },
    })
    await prisma.economicObservation.upsert({
      where: { indicatorId_period: { indicatorId: indicator.id, period: new Date('2026-02-01') } },
      update: {},
      create: { indicatorId: indicator.id, value: 3.4 + Math.random() * 2, period: new Date('2026-02-01'), previous: 3.5 + Math.random() * 2 },
    })
    await prisma.economicObservation.upsert({
      where: { indicatorId_period: { indicatorId: indicator.id, period: new Date('2026-03-01') } },
      update: {},
      create: { indicatorId: indicator.id, value: 3.3 + Math.random() * 2, period: new Date('2026-03-01'), previous: 3.4 + Math.random() * 2 },
    })
  }

  // CALENDÁRIO ECONÔMICO (M12)
  const calStart = new Date()
  const calendarEvents = [
    { days: 1, country: 'EUA', indicator: 'FOMC Rate Decision', impact: 'HIGH', forecast: 3.5, previous: 3.5 },
    { days: 2, country: 'EUA', indicator: 'Initial Jobless Claims', impact: 'MEDIUM', forecast: 215, previous: 212 },
    { days: 3, country: 'Zona Euro', indicator: 'CPI Flash Estimate', impact: 'HIGH', forecast: 2.6, previous: 2.7 },
    { days: 4, country: 'EUA', indicator: 'NFIB Small Business Optimism', impact: 'LOW', forecast: 102, previous: 101.9 },
    { days: 5, country: 'Brasil', indicator: 'IPCA Monthly', impact: 'HIGH', forecast: 0.3, previous: 0.32 },
    { days: 6, country: 'Portugal', indicator: 'Unemployment Rate', impact: 'MEDIUM', forecast: 6.1, previous: 6.2 },
    { days: 7, country: 'EUA', indicator: 'Consumer Sentiment (UoM)', impact: 'MEDIUM', forecast: 68, previous: 67.9 },
  ]

  for (const e of calendarEvents) {
    const date = new Date(calStart)
    date.setDate(date.getDate() + e.days)
    await prisma.economicEvent.upsert({
      where: { id: `cal-${e.country}-${e.indicator.split(' ')[0]}-${e.days}` },
      update: {},
      create: {
        id: `cal-${e.country}-${e.indicator.split(' ')[0]}-${e.days}`,
        date,
        time: '09:00',
        country: e.country,
        indicator: e.indicator,
        impact: e.impact,
        forecast: e.forecast,
        previous: e.previous,
        source: 'Bloomberg',
      },
    })
  }

  // FINANCEIRO / DEPÓSITOS (M19 - view-only)
  const depositTemplates = [
    { idx: 0, type: 'INITIAL_DEPOSIT', amount: 10000, dateOffset: 120 },
    { idx: 0, type: 'REPEAT_DEPOSIT', amount: 2500, dateOffset: 30 },
    { idx: 1, type: 'INITIAL_DEPOSIT', amount: 15000, dateOffset: 90 },
    { idx: 1, type: 'REPEAT_DEPOSIT', amount: 3000, dateOffset: 15 },
    { idx: 2, type: 'INITIAL_DEPOSIT', amount: 8000, dateOffset: 200 },
    { idx: 3, type: 'INITIAL_DEPOSIT', amount: 5000, dateOffset: 60 },
    { idx: 3, type: 'REPEAT_DEPOSIT', amount: 1000, dateOffset: 7 },
    { idx: 4, type: 'INITIAL_DEPOSIT', amount: 20000, dateOffset: 150 },
    { idx: 4, type: 'FTD', amount: 20000, dateOffset: 149 },
    { idx: 2, type: 'WITHDRAWAL', amount: -1000, dateOffset: 10 },
  ]

  for (const d of depositTemplates) {
    const client = clientRecords[d.idx]
    if (!client) continue
    await prisma.financialEvent.create({
      data: {
        clientId: client.id,
        type: d.type,
        amount: d.amount,
        currency: 'USD',
        date: new Date(Date.now() - d.dateOffset * 86400000),
        meta: { source: 'seed' },
      },
    })
  }

  // NOTIFICAÇÕES (M22)
  const notifTemplates = [
    { type: 'TASK', title: 'Tarefa vence hoje: ' + taskTemplates[0].title, body: 'Não esqueça do follow-up de hoje.' },
    { type: 'ALERT', title: 'Alerta disparado: BTC', body: 'Bitcoin caiu abaixo do limite configurado.' },
    { type: 'CLIENT', title: 'Cliente em risco: Ricardo Fernandes', body: 'Score de churn elevado. Priorizar contato.' },
    { type: 'NEWS', title: 'Notícia relevante no setor de AI', body: 'AMD lançou novo chip para competir com NVIDIA.' },
  ]

  for (const n of notifTemplates) {
    const notifId = `notif-${admin.id}-${n.type.toLowerCase()}`
    await prisma.notification.upsert({
      where: { id: notifId },
      update: {},
      create: {
        id: notifId,
        userId: admin.id,
        type: n.type,
        title: n.title,
        body: n.body,
        readAt: n.type === 'TASK' ? null : null,
      },
    })
  }

  // INTEGRAÇÕES (M23)
  const integrationTemplates = [
    { provider: 'Bloomberg', type: 'MARKET_DATA', status: 'ACTIVE', plan: 'Enterprise' },
    { provider: 'Refinitiv', type: 'FUNDAMENTALS', status: 'ACTIVE', plan: 'Standard' },
    { provider: 'Coindesk', type: 'CRYPTO', status: 'ACTIVE', plan: 'Free' },
    { provider: 'ForexFactory', type: 'CALENDAR', status: 'ACTIVE', plan: 'Free' },
    { provider: 'MetaTrader', type: 'TRADING', status: 'PENDING', plan: '' },
  ]

  for (const i of integrationTemplates) {
    await prisma.integrationConfig.upsert({
      where: { provider_type: { provider: i.provider, type: i.type } },
      update: {},
      create: {
        provider: i.provider,
        type: i.type,
        status: i.status,
        plan: i.plan || undefined,
        config: { seededAt: new Date().toISOString() },
        lastSyncAt: new Date(),
      },
    })
    await prisma.integrationHealth.upsert({
      where: { id: `health-${i.provider.toLowerCase()}` },
      update: {},
      create: {
        id: `health-${i.provider.toLowerCase()}`,
        provider: i.provider,
        type: i.type,
        status: i.status === 'ACTIVE' ? 'UP' : 'UNKNOWN',
        latencyMs: Math.floor(50 + Math.random() * 200),
      },
    })
  }

  // AI (M20) - histórico de exemplo
  await prisma.aiRequest.upsert({
    where: { id: 'ai-sample' },
    update: {},
    create: {
      id: 'ai-sample',
      userId: julio.id,
      type: 'briefing:platform',
      question: 'Gerar briefing diário da plataforma',
      input: { features: ['market', 'retention'] },
      output: { sections: ['## Visão Geral\nExemplo de briefing diário.', '## Destaques\nDados do MVP.'] },
      model: 'template',
    },
  })

  console.log('Seed completo!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })