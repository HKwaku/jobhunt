// Top ~100 financial-services firms with a meaningful UK / London presence,
// spanning sell side and buy side. Used as a target list (e.g. to probe ATS
// boards via /api/ats/resolve, and as a reference for search preferences).
//
// `category` is the firm's primary business; many are diversified (e.g. Man
// Group runs hedge funds and long-only). This is a curated reference list, not
// a ranking — "top" here means scale/prominence in the UK market.

export type TargetFirm = {
  name: string;
  category:
    | "Investment Bank"
    | "Advisory Boutique"
    | "Asset Manager"
    | "Hedge Fund"
    | "Private Equity"
    | "Private Credit"
    | "Venture Capital"
    | "Insurance"
    | "Bank"
    | "Fintech";
};

export const TARGET_FIRMS: TargetFirm[] = [
  // ---- Investment banks (sell side) ----
  { name: "Goldman Sachs", category: "Investment Bank" },
  { name: "Morgan Stanley", category: "Investment Bank" },
  { name: "J.P. Morgan", category: "Investment Bank" },
  { name: "Bank of America", category: "Investment Bank" },
  { name: "Citi", category: "Investment Bank" },
  { name: "Barclays", category: "Investment Bank" },
  { name: "HSBC", category: "Investment Bank" },
  { name: "Deutsche Bank", category: "Investment Bank" },
  { name: "UBS", category: "Investment Bank" },
  { name: "BNP Paribas", category: "Investment Bank" },
  { name: "Société Générale", category: "Investment Bank" },
  { name: "Nomura", category: "Investment Bank" },
  { name: "MUFG", category: "Investment Bank" },
  { name: "Mizuho", category: "Investment Bank" },
  { name: "RBC Capital Markets", category: "Investment Bank" },
  { name: "Jefferies", category: "Investment Bank" },
  { name: "Macquarie", category: "Investment Bank" },

  // ---- Advisory boutiques (sell side) ----
  { name: "Lazard", category: "Advisory Boutique" },
  { name: "Rothschild & Co", category: "Advisory Boutique" },
  { name: "Evercore", category: "Advisory Boutique" },
  { name: "Houlihan Lokey", category: "Advisory Boutique" },
  { name: "Moelis & Company", category: "Advisory Boutique" },
  { name: "PJT Partners", category: "Advisory Boutique" },
  { name: "Perella Weinberg Partners", category: "Advisory Boutique" },
  { name: "Centerview Partners", category: "Advisory Boutique" },
  { name: "Robey Warshaw", category: "Advisory Boutique" },

  // ---- Asset managers (buy side, long-only / diversified) ----
  { name: "BlackRock", category: "Asset Manager" },
  { name: "Vanguard", category: "Asset Manager" },
  { name: "Fidelity International", category: "Asset Manager" },
  { name: "State Street Global Advisors", category: "Asset Manager" },
  { name: "Legal & General Investment Management", category: "Asset Manager" },
  { name: "Schroders", category: "Asset Manager" },
  { name: "abrdn", category: "Asset Manager" },
  { name: "Janus Henderson", category: "Asset Manager" },
  { name: "M&G Investments", category: "Asset Manager" },
  { name: "Aviva Investors", category: "Asset Manager" },
  { name: "Baillie Gifford", category: "Asset Manager" },
  { name: "Invesco", category: "Asset Manager" },
  { name: "Columbia Threadneedle", category: "Asset Manager" },
  { name: "Jupiter Asset Management", category: "Asset Manager" },
  { name: "PIMCO", category: "Asset Manager" },
  { name: "Amundi", category: "Asset Manager" },
  { name: "AXA Investment Managers", category: "Asset Manager" },
  { name: "Insight Investment", category: "Asset Manager" },
  { name: "Newton Investment Management", category: "Asset Manager" },
  { name: "Fundsmith", category: "Asset Manager" },
  { name: "T. Rowe Price", category: "Asset Manager" },
  { name: "Wellington Management", category: "Asset Manager" },
  { name: "Franklin Templeton", category: "Asset Manager" },

  // ---- Hedge funds ----
  { name: "Man Group", category: "Hedge Fund" },
  { name: "Brevan Howard", category: "Hedge Fund" },
  { name: "Marshall Wace", category: "Hedge Fund" },
  { name: "Citadel", category: "Hedge Fund" },
  { name: "Millennium Management", category: "Hedge Fund" },
  { name: "Point72", category: "Hedge Fund" },
  { name: "Balyasny Asset Management", category: "Hedge Fund" },
  { name: "ExodusPoint Capital", category: "Hedge Fund" },
  { name: "Capula Investment Management", category: "Hedge Fund" },
  { name: "Winton", category: "Hedge Fund" },
  { name: "Aspect Capital", category: "Hedge Fund" },
  { name: "Lansdowne Partners", category: "Hedge Fund" },
  { name: "Egerton Capital", category: "Hedge Fund" },
  { name: "TCI Fund Management", category: "Hedge Fund" },
  { name: "Davidson Kempner", category: "Hedge Fund" },
  { name: "Eisler Capital", category: "Hedge Fund" },
  { name: "Qube Research & Technologies", category: "Hedge Fund" },
  { name: "Squarepoint Capital", category: "Hedge Fund" },
  { name: "Two Sigma", category: "Hedge Fund" },
  { name: "AQR Capital Management", category: "Hedge Fund" },

  // ---- Private equity / buyout ----
  { name: "Blackstone", category: "Private Equity" },
  { name: "KKR", category: "Private Equity" },
  { name: "Carlyle Group", category: "Private Equity" },
  { name: "Apollo Global Management", category: "Private Equity" },
  { name: "CVC Capital Partners", category: "Private Equity" },
  { name: "EQT", category: "Private Equity" },
  { name: "Advent International", category: "Private Equity" },
  { name: "Bain Capital", category: "Private Equity" },
  { name: "TPG", category: "Private Equity" },
  { name: "Warburg Pincus", category: "Private Equity" },
  { name: "Permira", category: "Private Equity" },
  { name: "Cinven", category: "Private Equity" },
  { name: "BC Partners", category: "Private Equity" },
  { name: "Apax Partners", category: "Private Equity" },
  { name: "Bridgepoint", category: "Private Equity" },
  { name: "Hg", category: "Private Equity" },
  { name: "Inflexion", category: "Private Equity" },
  { name: "General Atlantic", category: "Private Equity" },
  { name: "Ardian", category: "Private Equity" },
  { name: "Coller Capital", category: "Private Equity" },

  // ---- Private credit / direct lending ----
  { name: "Ares Management", category: "Private Credit" },
  { name: "Oaktree Capital Management", category: "Private Credit" },
  { name: "HPS Investment Partners", category: "Private Credit" },
  { name: "Intermediate Capital Group", category: "Private Credit" },
  { name: "Arcmont Asset Management", category: "Private Credit" },

  // ---- Venture capital / growth ----
  { name: "Index Ventures", category: "Venture Capital" },
  { name: "Balderton Capital", category: "Venture Capital" },
  { name: "Atomico", category: "Venture Capital" },
  { name: "Accel", category: "Venture Capital" },
  { name: "Molten Ventures", category: "Venture Capital" },

  // ---- Insurance ----
  { name: "Lloyd's of London", category: "Insurance" },
  { name: "Prudential", category: "Insurance" },
  { name: "Beazley", category: "Insurance" },

  // ---- Fintech (most likely to use Greenhouse/Lever/Ashby) ----
  { name: "Revolut", category: "Fintech" },
  { name: "Monzo", category: "Fintech" },
];

// A much larger pool of finance-adjacent companies (fintech, crypto, quant/
// trading, payments, finance-data, insurtech, wealthtech) that are far more
// likely to run Greenhouse / Lever / Ashby than traditional FS firms. Used only
// to probe for live ATS boards via /api/ats/resolve. Names only — the resolver
// derives slugs and de-duplicates against TARGET_FIRMS.
export const ATS_CANDIDATES: string[] = [
  // Neobanks / banking infra
  "Starling Bank", "Wise", "Tide", "Atom Bank", "Griffin", "ClearBank",
  "Thought Machine", "10x Banking", "Form3", "Railsr", "Mettle", "Zopa",
  "OakNorth", "Allica Bank", "Recognise Bank", "Kroo", "Monese", "Lanistar",
  // Payments
  "Checkout.com", "GoCardless", "Rapyd", "SumUp", "Dojo", "Paysafe", "PPRO",
  "Ecommpay", "Modulr", "Banked", "Volt", "Token.io", "Vitesse", "Payhawk",
  "Pleo", "Soldo", "Spendesk", "Mollie", "Adyen", "Klarna", "Stripe", "Brex",
  "Ramp", "Mercury", "Modern Treasury", "Unit", "Marqeta", "Lithic", "Column",
  "Increase", "Highnote", "Galileo", "Currencycloud", "Ebury", "Equals Money",
  "Mews", "Tink", "Nium", "Airwallex", "Melio", "Bill.com", "Pennylane",
  // Investing / wealthtech / trading apps
  "Freetrade", "Nutmeg", "Moneybox", "PrimaryBid", "Wealthify", "Chip", "Plum",
  "Cleo", "PensionBee", "Smart Pension", "Penfold", "Cushon", "Lightyear",
  "Shares", "Stake", "eToro", "Trading 212", "IG Group", "CMC Markets",
  "Plus500", "Saxo Bank", "Hargreaves Lansdown", "AJ Bell", "Interactive Investor",
  "Addepar", "iCapital", "Moonfare", "Titanbay", "Carta", "AngelList", "Seedrs",
  "Crowdcube", "Republic", "Yieldstreet", "Altruist",
  // Lending / BNPL / SME finance
  "Funding Circle", "iwoca", "Capital on Tap", "Liberis", "YouLend", "Kriya",
  "Wagestream", "Salary Finance", "Updraft", "Affirm", "Afterpay", "Zip",
  "SoFi", "Upstart", "LendingClub", "Better", "Habito", "Molo", "Generation Home",
  // Crypto / digital assets
  "Coinbase", "Kraken", "Gemini", "Circle", "Ripple", "Chainalysis", "Elliptic",
  "Fireblocks", "Copper.co", "Zodia Custody", "Bitpanda", "Blockchain.com",
  "Luno", "Wintermute", "GSR", "Kaiko", "Ledger", "ConsenSys", "Gauntlet",
  "Chaos Labs", "OpenSea", "Bitstamp", "B2C2", "Talos", "Matter Labs",
  "Aztec", "Improbable",
  // Quant / trading / market-making
  "Citadel", "Citadel Securities", "Jane Street", "Jump Trading",
  "Hudson River Trading", "DRW", "IMC Trading", "Optiver", "Flow Traders",
  "Tower Research Capital", "Five Rings", "Maven Securities", "Mako",
  "XTX Markets", "G-Research", "Quadrature Capital", "PDT Partners",
  "Akuna Capital", "Susquehanna", "Old Mission", "Radix Trading",
  "Aquatic Capital Management", "Millennium", "Balyasny", "ExodusPoint",
  "Two Sigma", "AQR Capital", "Schonfeld", "Verition", "Walleye Capital",
  // Finance data / risk / regtech / SaaS-finance
  "FactSet", "S&P Global", "Moody's", "MSCI", "Morningstar", "LSEG",
  "ComplyAdvantage", "Onfido", "Sumsub", "Fenergo", "Quantexa", "Featurespace",
  "Ravelin", "Forter", "Riskified", "Signifyd", "Socure", "Middesk", "Alloy",
  "Persona", "Sardine", "Sift", "Codat", "Sequence", "FairMoney",
  // Insurtech
  "Marshmallow", "Zego", "ManyPets", "Superscript", "YuLife", "Cytora",
  "Concirrus", "Akur8", "Tractable", "Flock", "Lemonade", "At-Bay", "Coalition",
  "Next Insurance", "Hippo",
  // Broader tech with strong London presence (stretch, ATS-friendly)
  "Snowflake", "Databricks", "Palantir", "Datadog", "Confluent", "MongoDB",
  "Elastic", "HashiCorp", "GitLab", "Twilio", "Cloudflare", "Snyk", "Darktrace",
  "Tessian", "Deliveroo", "Spotify", "Bumble", "Trustpilot", "Synthesia",
  "Wayve", "Builder.ai", "Personio", "Contentful", "Algolia", "Intercom",
];

// Real estate investment managers (and real-estate arms of PE / asset managers)
// with UK presence. These rarely use Greenhouse/Lever/Ashby, so the firm
// watchlist search queries them BY NAME across keyword sources (Adzuna / Reed /
// JSearch) and keeps only technology / transformation / data / operations roles
// — i.e. in-house seats within the investment firm, not proptech vendors.
export const REAL_ESTATE_IM_FIRMS: string[] = [
  // Dedicated real estate investment managers
  "PGIM Real Estate",
  "Nuveen Real Estate",
  "LaSalle Investment Management",
  "CBRE Investment Management",
  "M&G Real Estate",
  "abrdn",
  "AEW",
  "Patrizia",
  "Round Hill Capital",
  "Tristan Capital Partners",
  "Savills Investment Management",
  "Knight Frank Investment Management",
  "BNP Paribas REIM",
  "Invesco Real Estate",
  "DWS Real Estate",
  "UBS Asset Management Real Estate",
  "Aviva Investors Real Assets",
  "Schroders Capital Real Estate",
  "Legal & General Real Assets",
  "Columbia Threadneedle Real Estate",
  "Federated Hermes Real Estate",
  "Catella",
  // Real estate arms of PE / alternatives
  "Blackstone Real Estate",
  "Brookfield",
  "Starwood Capital",
  "KKR Real Estate",
  "Apollo Real Estate",
  "Carlyle Real Estate",
  "Ares Real Estate",
  "TPG Real Estate",
  "Angelo Gordon",
  "Cheyne Capital",
  "ICG Real Estate",
  "AXA IM Alts",
  "Macquarie Asset Management",
  // Operators / landlords with large IM platforms
  "Greystar",
  "Hines",
  "Grosvenor",
  "British Land",
  "Landsec",
  "Segro",
  "Oxford Properties",
  "Henderson Park",
  "Cain International",
  "Long Harbour",
  "Kennedy Wilson",
  "Tishman Speyer",
];
