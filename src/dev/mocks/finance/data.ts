// Made-up figures in the shapes the real emails carry (plans/finance-app-2026-11-19/research/email-shapes.md).

export type StateName = "day1" | "month3" | "stale";
export const STATE_NAMES: StateName[] = ["day1", "month3", "stale"];

export type AccountId = "brk" | "roth" | "chk" | "wf" | "dis" | "c1" | "loan";
export type AccountGroup = "cash" | "inv" | "card" | "loan";
export type SnapshotSource =
  | "Screenshot"
  | "Statement email"
  | "Due reminder email"
  | "Weekly balance email"
  | "Your edit"
  | "Your entry";

/** The figure an account shows now: where it came from and how old it is. */
export interface Figure {
  value: number;
  source: SnapshotSource;
  when: string;
  ageDays: number;
}

/** One entry in an account's source trail, oldest first; the last one is the current figure. */
export interface BalanceSnapshot {
  source: SnapshotSource;
  asOf: string;
  value: number;
  note: string;
}

export interface SeriesPoint {
  date: string;
  value: number;
}

export interface CardDue {
  inDays: number;
  statement: number;
  minimum: number;
  scheduled?: string;
  autopay?: boolean;
}

export interface Account {
  id: AccountId;
  name: string;
  ending?: string;
  group: AccountGroup;
  owed: boolean;
  figure: Figure | null;
  /** Shown instead of a figure when there is none yet. */
  empty?: string;
  history: SeriesPoint[];
  trail: BalanceSnapshot[];
  due?: CardDue;
  cycle?: string;
  feed: string;
  feedNote?: string;
  reviewId?: ReviewId;
  /** Set when the figure is older than its feed promises. */
  stale?: string;
}

export type DueId =
  | "stream"
  | "wfdue"
  | "soft"
  | "ai"
  | "cloud"
  | "aist"
  | "c1due"
  | "phone"
  | "disdue"
  | "store"
  | "loanpay";

/** Statements and the loan are drawn tall on the timeline; other charges short. */
export type DueKind = "statement" | "loan" | "charge";

export type DueFlag = { kind: "price"; was: number } | { kind: "new" };

export interface Due {
  id: DueId;
  name: string;
  kind: DueKind;
  inDays: number;
  /** Null when the amount is only in an attachment. */
  amount: number | null;
  approx?: boolean;
  cadence: string;
  via?: string;
  source: string;
  /** A payment state worth seeing on the row, such as "No payment scheduled". */
  note?: string;
  autopay?: boolean;
  card?: AccountId;
  flag?: DueFlag;
  reviewId?: ReviewId;
  history?: { date: string; amount: number; label: string }[];
}

export type ReviewId = "r1" | "r2" | "r3";
export type ReviewKind = "Read from a screenshot" | "Price change" | "New recurring charge" | "Same charge twice";

export interface ReviewItem {
  id: ReviewId;
  kind: ReviewKind;
  about: AccountId | DueId;
  title: string;
  /** One short line for the page; `detail` is the full explanation for the review sheet. */
  fact: string;
  detail: string;
  actions: [string, string];
}

export interface Purchase {
  date: string;
  merchant: string;
  card: string;
  amount: number;
  note?: string;
}

export interface CardSpend {
  card: string;
  last: number;
  now: number;
}

export interface Spending {
  range: string;
  now: number;
  last: number;
  /** Running total per day from the 1st; the last entry is today. */
  nowDaily: number[];
  lastDaily: number[];
  cards: CardSpend[];
}

export interface NetWorthPoint {
  date: string;
  value: number;
  accounts: number;
  /** Marks the point where an account first had a figure, so the jump does not read as a gain or loss. */
  joined?: string;
}

export type AlertStatus = "on" | "off" | "part";

export interface AlertItem {
  service: string;
  name: string;
  why: string;
  status: AlertStatus;
}

export interface InactiveCharge {
  name: string;
  note: string;
}

export interface CaptureRead {
  label: string;
  value: number | null;
  confidence: string;
  alternatives?: [number, number];
}

export interface Capture {
  sharedAt: string;
  asOf: string;
  reads: CaptureRead[];
}

export interface ManualEntry {
  account: AccountId;
  value: number;
  asOf: string;
  note: string;
  title: string;
  subtitle: string;
}

export interface FinanceState {
  name: StateName;
  /** ISO date of "today" in this state. */
  today: string;
  label: string;
  switched: string;
  accounts: Account[];
  dues: Due[];
  review: ReviewItem[];
  /** Weekly net worth before today; today's point is the sum of the accounts. */
  netWorth: NetWorthPoint[];
  purchases: Purchase[] | null;
  spending: Spending | null;
  statements: CardSpend[] | null;
  alerts: AlertItem[];
  inactive: InactiveCharge[];
  notByEmail: string[];
  capture: Capture;
  manual: ManualEntry;
  sortedThisWeek: string;
  staleNote: { lead: string; body: string } | null;
}

const ALERTS: [string, string, string, AlertStatus, AlertStatus][] = [
  ["Discover", "Balance alert", "Emails the balance owed once it passes the lowest amount allowed.", "off", "on"],
  ["Wells Fargo", "Approaching Credit Limit", "Warns when available credit drops below an amount you set.", "off", "off"],
  ["Capital One", "Instant Purchase Notification", "Every Venture X purchase with amount and merchant, at a $0 minimum.", "off", "on"],
  ["Wells Fargo", "Single Purchase Amount", "Already on above a threshold. Lower it so every purchase is counted.", "part", "on"],
  ["Discover", "Spending alert", "Each purchase above the lowest per-transaction amount allowed.", "off", "on"],
  ["Schwab Bank", "Debit Card Alerts", "Checking purchases as events. The balance still needs a screenshot.", "off", "on"],
  ["Schwab", "Deposits & Transfers", "Money in and out of brokerage, Roth IRA and checking.", "off", "off"],
  ["Schwab", "Paperless for the Roth IRA", "Statement notices and trade confirmations for the Roth IRA.", "off", "off"],
  ["Capital One", "Upcoming payment due date", "A due reminder for Venture X.", "off", "on"],
  ["Discover", "Payment reminder", "A due reminder for Discover.", "off", "on"],
  ["Loan servicer", "Paperless E-Delivery", "Notices by email. They carry a login link, not the principal.", "off", "off"],
  ["Capital One", "Approaching your credit limit", "Warns when Venture X nears its limit.", "off", "off"],
];

const alertsFor = (column: 3 | 4): AlertItem[] =>
  ALERTS.map((a) => ({ service: a[0], name: a[1], why: a[2], status: a[column] }));

const INACTIVE: InactiveCharge[] = [
  { name: "Utilities", note: "Monthly until the lease ended, Jul 2026" },
  { name: "Smart-home camera", note: "Ended" },
  { name: "Web hosting", note: "One receipt, Mar 2026" },
  { name: "Auto insurance", note: "Yearly renewal, next expected Apr 2027" },
];

const NOT_BY_EMAIL = [
  "The brokerage and Roth IRA value",
  "The checking balance",
  "A card's balance between statements (except Capital One's Thursday email)",
  "Available credit",
  "The loan principal",
];

const pts = (rows: [string, number][]): SeriesPoint[] => rows.map(([date, value]) => ({ date, value }));
const trail = (rows: [SnapshotSource, string, number, string][]): BalanceSnapshot[] =>
  rows.map(([source, asOf, value, note]) => ({ source, asOf, value, note }));

const day1: FinanceState = {
  name: "day1",
  today: "2026-11-19",
  label: "Thu 19 Nov",
  switched: "Switched on today",
  accounts: [
    {
      id: "brk",
      name: "Schwab brokerage",
      ending: "382",
      group: "inv",
      owed: false,
      figure: { value: 48316.27, source: "Screenshot", when: "today 9:02", ageDays: 0 },
      history: pts([["19 Nov", 48316.27]]),
      feed: "Schwab documents no balance email for this account. The value comes from your screenshots or your own entry.",
      trail: trail([["Screenshot", "19 Nov, 9:02", 48316.27, "Read with high confidence"]]),
    },
    {
      id: "roth",
      name: "Schwab Roth IRA",
      ending: "917",
      group: "inv",
      owed: false,
      figure: null,
      empty: "No figure yet. Share a screenshot or type it in.",
      history: [],
      trail: [],
      feed: "Schwab documents no balance email for this account. Paperless notices are not turned on yet.",
    },
    {
      id: "chk",
      name: "Schwab checking",
      ending: "604",
      group: "cash",
      owed: false,
      figure: { value: 6204.58, source: "Screenshot", when: "today 9:02", ageDays: 0 },
      history: pts([["19 Nov", 6204.58]]),
      reviewId: "r1",
      feedNote: "Debit card alerts not turned on yet. Balance by screenshot",
      feed: "Schwab documents no balance email for checking, so the figure comes from your screenshot. Debit card alerts, not turned on yet, would add purchases as events.",
      trail: trail([["Screenshot", "19 Nov, 9:02", 6204.58, "One digit unclear. Waiting for you to check."]]),
    },
    {
      id: "wf",
      name: "Wells Fargo card",
      ending: "4471",
      group: "card",
      owed: true,
      figure: { value: 1182.64, source: "Statement email", when: "31 Oct", ageDays: 19 },
      history: pts([["31 Oct", 1182.64]]),
      due: { inDays: 8, statement: 1182.64, minimum: 41.0, scheduled: "Payment of 1,182.64 scheduled for 24 Nov" },
      cycle: "Closes on the last day of the month. Due about the 27th.",
      feed: "Statement email monthly. Purchase alerts only above your threshold; every-purchase alerts not turned on yet. The balance between statements needs a screenshot.",
      trail: trail([
        ["Statement email", "31 Oct", 1182.64, "Statement balance, minimum 41.00, due 27 Nov"],
        ["Due reminder email", "19 Nov", 1182.64, "Same statement balance"],
      ]),
    },
    {
      id: "dis",
      name: "Discover it",
      ending: "2290",
      group: "card",
      owed: true,
      figure: { value: 612.09, source: "Statement email", when: "14 Nov", ageDays: 5 },
      history: pts([["14 Nov", 612.09]]),
      due: { inDays: 22, statement: 612.09, minimum: 35.0 },
      cycle: "Closes on the 14th. Due on the 11th.",
      feed: "Statement email monthly. Purchase alerts not turned on yet. The balance between statements needs a screenshot.",
      trail: trail([["Statement email", "14 Nov", 612.09, "Statement balance, minimum 35.00, due 11 Dec"]]),
    },
    {
      id: "c1",
      name: "Capital One Venture X",
      ending: "8815",
      group: "card",
      owed: true,
      figure: { value: 1947.33, source: "Weekly balance email", when: "today 6:10", ageDays: 0 },
      history: pts([["19 Nov", 1947.33]]),
      due: { inDays: 19, statement: 1402.18, minimum: 40.0, autopay: true },
      cycle: "Closes on the 11th. Due on the 8th. AutoPay pays the statement balance.",
      feed: "Statement email monthly and a balance email every Thursday. Purchase alerts not turned on yet.",
      trail: trail([
        ["Statement email", "11 Nov", 1402.18, "Statement balance, minimum 40.00, due 8 Dec"],
        ["Weekly balance email", "19 Nov, 6:10", 1947.33, "Current balance, excludes pending"],
      ]),
    },
    {
      id: "loan",
      name: "Federal student loan",
      group: "loan",
      owed: true,
      figure: null,
      empty: "No figure yet. The loan emails carry the payment, not the balance. Type it from the loan site.",
      history: [],
      trail: [],
      feed: "Payment amount and due date by email. The balance only by hand.",
    },
  ],
  dues: [
    {
      id: "stream",
      name: "Streaming video",
      kind: "charge",
      inDays: 3,
      amount: 17.99,
      cadence: "Monthly",
      via: "Wells Fargo card",
      source: "App store receipt",
      flag: { kind: "price", was: 15.49 },
      reviewId: "r2",
      history: [
        { date: "22 Oct", amount: 15.49, label: "Receipt" },
        { date: "22 Sep", amount: 15.49, label: "Receipt" },
        { date: "22 Aug", amount: 15.49, label: "Receipt" },
      ],
    },
    { id: "wfdue", name: "Wells Fargo card", kind: "statement", inDays: 8, amount: 1182.64, card: "wf", cadence: "Statement", source: "Statement email", note: "Payment scheduled for 24 Nov" },
    { id: "soft", name: "Software and cloud invoice", kind: "charge", inDays: 12, amount: null, cadence: "Monthly", via: "Capital One", source: "Invoice email, amount in the PDF" },
    { id: "ai", name: "AI assistant", kind: "charge", inDays: 13, amount: 21.24, cadence: "Monthly", via: "Wells Fargo card", source: "App store receipt" },
    { id: "cloud", name: "Cloud computing usage", kind: "charge", inDays: 14, amount: 11.84, approx: true, cadence: "Monthly, varies", via: "Discover", source: "Discover recurring-charge alert" },
    { id: "aist", name: "AI and storage plan", kind: "charge", inDays: 15, amount: 21.39, cadence: "Monthly, trial ends", via: "Capital One", source: "Second app store receipt", flag: { kind: "new" }, reviewId: "r3" },
    { id: "c1due", name: "Capital One Venture X", kind: "statement", inDays: 19, amount: 1402.18, card: "c1", cadence: "Statement", source: "Statement email", autopay: true },
    { id: "phone", name: "Phone plan", kind: "charge", inDays: 21, amount: 68.42, cadence: "Monthly", via: "Discover", source: "Bill-ready email", autopay: true },
    { id: "disdue", name: "Discover it", kind: "statement", inDays: 22, amount: 612.09, card: "dis", cadence: "Statement", source: "Statement email" },
    { id: "store", name: "Cloud storage", kind: "charge", inDays: 24, amount: 9.99, cadence: "Monthly", via: "Wells Fargo card", source: "App store receipt" },
    { id: "loanpay", name: "Student loan payment", kind: "loan", inDays: 26, amount: 287.16, cadence: "Monthly", via: "Schwab checking", source: "Payment due email", autopay: true },
  ],
  review: [
    { id: "r1", kind: "Read from a screenshot", about: "chk", title: "Schwab checking read as 6,204.58", fact: "Blurred digit: 6,204.58 or 6,284.58", detail: "From your screenshot at 9:02. One digit was blurred: it could be 6,204.58 or 6,284.58.", actions: ["It's right", "Fix it"] },
    { id: "r2", kind: "Price change", about: "stream", title: "Streaming video goes up to 17.99", fact: "Was 15.49. First new charge 22 Nov", detail: "Price-change email, 3 Nov. Was 15.49. First new charge 22 Nov.", actions: ["Confirm", "Dismiss"] },
    { id: "r3", kind: "New recurring charge", about: "aist", title: "AI and storage plan: track it?", fact: "Trial ends 4 Dec, then 21.39 a month", detail: "Trial ends 4 Dec, then 21.39 a month on Capital One. Seen in a second app store's receipt.", actions: ["Track it", "Not a subscription"] },
  ],
  netWorth: [],
  purchases: null,
  spending: null,
  statements: null,
  alerts: alertsFor(3),
  inactive: INACTIVE,
  notByEmail: NOT_BY_EMAIL,
  capture: {
    sharedAt: "today, 9:02",
    asOf: "19 Nov 9:01",
    reads: [
      { label: "Individual brokerage …382", value: 48316.27, confidence: "Sure" },
      { label: "Checking …604", value: 6204.58, confidence: "Not sure: one digit blurred, 6,204.58 or 6,284.58", alternatives: [6204.58, 6284.58] },
      { label: "Roth IRA …917", value: null, confidence: "Not on this screenshot" },
    ],
  },
  manual: { account: "loan", value: 24112.4, asOf: "Today, 19 Nov", note: "Typed from the loan site", title: "Type a figure", subtitle: "No figure yet for this account" },
  sortedThisWeek: "6 statement and balance emails, 11 recurring charges",
  staleNote: null,
};

const month3: FinanceState = {
  name: "month3",
  today: "2027-02-18",
  label: "Thu 18 Feb",
  switched: "Switched on 19 Nov",
  accounts: [
    {
      id: "brk",
      name: "Schwab brokerage",
      ending: "382",
      group: "inv",
      owed: false,
      figure: { value: 52488.1, source: "Screenshot", when: "9 Feb", ageDays: 9 },
      history: pts([["19 Nov", 48316.27], ["8 Dec", 49102.55], ["29 Dec", 50233.8], ["12 Jan", 51377.85], ["9 Feb", 52488.1]]),
      feed: "No balance email for this account. The value comes from your screenshots or your own entry.",
      trail: trail([["Screenshot", "12 Jan", 51377.85, ""], ["Screenshot", "9 Feb, 10:14", 52488.1, "Read with high confidence"]]),
    },
    {
      id: "roth",
      name: "Schwab Roth IRA",
      ending: "917",
      group: "inv",
      owed: false,
      figure: { value: 18733.56, source: "Screenshot", when: "9 Feb", ageDays: 9 },
      history: pts([["8 Dec", 17621.4], ["29 Dec", 17990.12], ["12 Jan", 18402.11], ["9 Feb", 18733.56]]),
      reviewId: "r1",
      feed: "No email for this account. The value comes from your screenshots or your own entry.",
      trail: trail([["Screenshot", "12 Jan", 18402.11, ""], ["Screenshot", "9 Feb, 10:14", 18733.56, "One digit unclear. Waiting for you to check."]]),
    },
    {
      id: "chk",
      name: "Schwab checking",
      ending: "604",
      group: "cash",
      owed: false,
      figure: { value: 4871.92, source: "Screenshot", when: "9 Feb", ageDays: 9 },
      history: pts([["19 Nov", 6204.58], ["8 Dec", 5512.3], ["29 Dec", 3988.17], ["12 Jan", 5316.4], ["9 Feb", 4871.92]]),
      feedNote: "Debit card alerts on. Balance by screenshot",
      feed: "Schwab documents no balance email for checking, so the figure comes from your screenshots. Debit card alerts add purchases as events.",
      trail: trail([["Screenshot", "12 Jan", 5316.4, ""], ["Screenshot", "9 Feb, 10:14", 4871.92, "Read with high confidence"]]),
    },
    {
      id: "wf",
      name: "Wells Fargo card",
      ending: "4471",
      group: "card",
      owed: true,
      figure: { value: 1436.71, source: "Statement email", when: "31 Jan", ageDays: 18 },
      history: pts([["31 Oct", 1182.64], ["30 Nov", 1251.09], ["31 Dec", 1318.2], ["31 Jan", 1436.71]]),
      reviewId: "r2",
      due: { inDays: 7, statement: 1436.71, minimum: 41.0, scheduled: "No payment scheduled yet" },
      cycle: "Closes on the last day of the month. Due about the 25th.",
      feed: "Statement email monthly, due reminder, payment emails, and every-purchase alerts. The figure is the statement balance; today's balance needs a screenshot.",
      trail: trail([["Statement email", "31 Dec", 1318.2, ""], ["Statement email", "31 Jan", 1436.71, "Statement balance, minimum 41.00, due 25 Feb"]]),
    },
    {
      id: "dis",
      name: "Discover it",
      ending: "2290",
      group: "card",
      owed: true,
      figure: { value: 488.3, source: "Statement email", when: "14 Feb", ageDays: 4 },
      history: pts([["14 Nov", 612.09], ["14 Dec", 703.55], ["14 Jan", 551.76], ["14 Feb", 488.3]]),
      due: { inDays: 21, statement: 488.3, minimum: 35.0 },
      cycle: "Closes on the 14th. Due on the 11th.",
      feed: "Statement email monthly, payment emails, and every-purchase alerts. The figure is the statement balance; today's balance needs a screenshot.",
      trail: trail([["Statement email", "14 Jan", 551.76, ""], ["Statement email", "14 Feb", 488.3, "Statement balance, minimum 35.00, due 11 Mar"]]),
    },
    {
      id: "c1",
      name: "Capital One Venture X",
      ending: "8815",
      group: "card",
      owed: true,
      figure: { value: 2190.4, source: "Your edit", when: "today 8:40", ageDays: 0 },
      history: pts([
        ["19 Nov", 1947.33], ["26 Nov", 2088.1], ["3 Dec", 1622.47], ["10 Dec", 1803.92], ["17 Dec", 2240.15],
        ["24 Dec", 2411.06], ["31 Dec", 1987.4], ["7 Jan", 2104.92], ["14 Jan", 2265.31], ["21 Jan", 1712.88],
        ["28 Jan", 1876.44], ["4 Feb", 1988.62], ["11 Feb", 2051.17], ["18 Feb", 2190.4],
      ]),
      due: { inDays: 18, statement: 1876.44, minimum: 40.0, autopay: true },
      cycle: "Closes on the 11th. Due on the 8th. AutoPay pays the statement balance.",
      feed: "Statement email monthly, a balance email every Thursday, and all-purchase alerts.",
      trail: trail([
        ["Statement email", "11 Feb", 1876.44, "Statement balance, minimum 40.00, due 8 Mar"],
        ["Weekly balance email", "18 Feb, 6:10", 2316.85, "Current balance, excludes pending"],
        ["Your edit", "18 Feb, 8:40", 2190.4, "“Refund of 126.45 posted, not in the email yet”"],
      ]),
    },
    {
      id: "loan",
      name: "Federal student loan",
      group: "loan",
      owed: true,
      figure: { value: 23914.62, source: "Your edit", when: "14 Jan", ageDays: 35 },
      history: pts([["21 Nov", 24112.4], ["14 Jan", 23914.62]]),
      feed: "Payment amount and due date by email. The balance only by hand.",
      trail: trail([["Your entry", "21 Nov", 24112.4, "Typed from the loan site"], ["Your edit", "14 Jan", 23914.62, "Typed from the loan site"]]),
    },
  ],
  dues: [
    {
      id: "stream",
      name: "Streaming video",
      kind: "charge",
      inDays: 4,
      amount: 17.99,
      cadence: "Monthly",
      via: "Wells Fargo card",
      source: "App store receipt",
      history: [
        { date: "22 Jan", amount: 17.99, label: "Receipt" },
        { date: "22 Dec", amount: 17.99, label: "Receipt" },
        { date: "22 Nov", amount: 17.99, label: "Receipt" },
        { date: "22 Oct", amount: 15.49, label: "Old price" },
      ],
    },
    { id: "wfdue", name: "Wells Fargo card", kind: "statement", inDays: 7, amount: 1436.71, card: "wf", cadence: "Statement", source: "Statement email", note: "No payment scheduled" },
    { id: "soft", name: "Software and cloud invoice", kind: "charge", inDays: 11, amount: null, cadence: "Monthly", via: "Capital One", source: "Invoice email, amount in the PDF" },
    { id: "ai", name: "AI assistant", kind: "charge", inDays: 12, amount: 21.24, cadence: "Monthly", via: "Wells Fargo card", source: "App store receipt" },
    { id: "cloud", name: "Cloud computing usage", kind: "charge", inDays: 13, amount: 12.31, approx: true, cadence: "Monthly, varies", via: "Discover", source: "Purchase alert" },
    { id: "aist", name: "AI and storage plan", kind: "charge", inDays: 14, amount: 21.39, cadence: "Monthly", via: "Capital One", source: "Second app store receipt" },
    { id: "c1due", name: "Capital One Venture X", kind: "statement", inDays: 18, amount: 1876.44, card: "c1", cadence: "Statement", source: "Statement email", autopay: true },
    { id: "phone", name: "Phone plan", kind: "charge", inDays: 20, amount: 73.42, cadence: "Monthly", via: "Discover", source: "Bill-ready email", flag: { kind: "price", was: 68.42 }, reviewId: "r3", autopay: true },
    { id: "disdue", name: "Discover it", kind: "statement", inDays: 21, amount: 488.3, card: "dis", cadence: "Statement", source: "Statement email" },
    { id: "store", name: "Cloud storage", kind: "charge", inDays: 23, amount: 9.99, cadence: "Monthly", via: "Wells Fargo card", source: "App store receipt" },
    { id: "loanpay", name: "Student loan payment", kind: "loan", inDays: 25, amount: 287.16, cadence: "Monthly", via: "Schwab checking", source: "AutoPay scheduled email", autopay: true },
  ],
  review: [
    { id: "r1", kind: "Read from a screenshot", about: "roth", title: "Roth IRA read as 18,733.56", fact: "Blurred digit: 18,733.56 or 18,783.56", detail: "From your screenshot, 9 Feb. The third digit was blurred: 18,733.56 or 18,783.56.", actions: ["It's right", "Fix it"] },
    { id: "r2", kind: "Same charge twice", about: "wf", title: "214.37 at a hardware store, seen twice", fact: "Two alerts for one purchase on 6 Feb", detail: "Wells Fargo sent an all-purchase alert and an over-threshold alert for it on 6 Feb. Merge so it counts once.", actions: ["Merge", "Keep both"] },
    { id: "r3", kind: "Price change", about: "phone", title: "Phone plan goes up to 73.42", fact: "Was 68.42. Next charge 10 Mar", detail: "Bill-ready email, 24 Jan. Was 68.42. Next charge 10 Mar.", actions: ["Confirm", "Dismiss"] },
  ],
  netWorth: [
    { date: "19 Nov", value: 50778.79, accounts: 5 },
    { date: "26 Nov", value: 26412.18, accounts: 6, joined: "Loan added" },
    { date: "3 Dec", value: 27105.33, accounts: 6 },
    { date: "10 Dec", value: 44980.07, accounts: 7, joined: "Roth IRA added" },
    { date: "17 Dec", value: 45322.6, accounts: 7 },
    { date: "24 Dec", value: 44871.15, accounts: 7 },
    { date: "31 Dec", value: 45640.42, accounts: 7 },
    { date: "7 Jan", value: 46118.9, accounts: 7 },
    { date: "14 Jan", value: 46507.24, accounts: 7 },
    { date: "21 Jan", value: 46233.81, accounts: 7 },
    { date: "28 Jan", value: 47016.5, accounts: 7 },
    { date: "4 Feb", value: 47488.06, accounts: 7 },
    { date: "11 Feb", value: 47705.12, accounts: 7 },
  ],
  purchases: [
    { date: "17 Feb", merchant: "Grocery store", card: "Discover", amount: 84.16 },
    { date: "16 Feb", merchant: "Fuel", card: "Capital One", amount: 41.27 },
    { date: "15 Feb", merchant: "Restaurant", card: "Wells Fargo", amount: 63.9 },
    { date: "14 Feb", merchant: "Pharmacy", card: "Discover", amount: 18.44 },
    { date: "12 Feb", merchant: "Online store", card: "Capital One", amount: 129.99 },
    { date: "6 Feb", merchant: "Hardware store", card: "Wells Fargo", amount: 214.37, note: "Seen twice, waiting for you" },
  ],
  spending: {
    range: "1 to 18 Feb against 1 to 18 Jan",
    now: 1642.38,
    last: 1811.07,
    nowDaily: [0, 84, 140, 310, 362, 455, 590, 640, 702, 818, 905, 1010, 1140, 1199, 1262, 1326, 1468, 1552, 1642.38],
    lastDaily: [
      0, 120, 188, 205, 330, 402, 515, 611, 690, 744, 902, 1015, 1088, 1232, 1340, 1455, 1600, 1720, 1811.07, 1890,
      1960, 2088, 2150, 2230, 2302, 2390, 2455, 2512, 2588, 2640, 2701.55,
    ],
    cards: [
      { card: "Wells Fargo", now: 702.15, last: 655.4 },
      { card: "Discover", now: 391.62, last: 487.19 },
      { card: "Capital One", now: 548.61, last: 668.48 },
    ],
  },
  statements: [
    { card: "Wells Fargo", last: 1318.2, now: 1436.71 },
    { card: "Discover", last: 551.76, now: 488.3 },
    { card: "Capital One", last: 2104.92, now: 1876.44 },
  ],
  alerts: alertsFor(4),
  inactive: INACTIVE,
  notByEmail: NOT_BY_EMAIL,
  capture: {
    sharedAt: "9 Feb, 10:14",
    asOf: "9 Feb 10:13",
    reads: [
      { label: "Individual brokerage …382", value: 52488.1, confidence: "Sure" },
      { label: "Roth IRA …917", value: 18733.56, confidence: "Not sure: third digit blurred, 18,733.56 or 18,783.56", alternatives: [18733.56, 18783.56] },
      { label: "Checking …604", value: 4871.92, confidence: "Sure" },
    ],
  },
  manual: { account: "loan", value: 23914.62, asOf: "Today, 18 Feb", note: "Typed from the loan site", title: "Edit by hand", subtitle: "Last: your edit, 14 Jan" },
  sortedThisWeek: "4 statement emails, 1 weekly balance, 23 purchase alerts, 2 payments",
  staleNote: null,
};

const OLD_SCREENSHOT: Partial<Record<AccountId, number>> = { brk: 51377.85, roth: 18402.11, chk: 5316.4 };

const stale: FinanceState = {
  ...month3,
  name: "stale",
  accounts: month3.accounts.map((a): Account => {
    const old = OLD_SCREENSHOT[a.id];
    if (old !== undefined) {
      return {
        ...a,
        figure: { value: old, source: "Screenshot", when: "12 Jan", ageDays: 37 },
        stale: "Last screenshot 37 days ago",
        history: a.history.slice(0, -1),
        reviewId: undefined,
      };
    }
    if (a.id === "c1") {
      return {
        ...a,
        figure: { value: 1988.62, source: "Weekly balance email", when: "4 Feb", ageDays: 14 },
        stale: "No weekly email on 11 or 18 Feb",
        history: a.history.slice(0, 12),
      };
    }
    return a;
  }),
  review: month3.review.filter((r) => r.id !== "r1"),
  staleNote: {
    lead: "4 figures are older than usual.",
    body: "Capital One from 4 Feb, Schwab 37 days ago.",
  },
};

export const STATES: Record<StateName, FinanceState> = { day1, month3, stale };

export const ALL_ACCOUNTS = 7;

export function netWorth(accounts: Account[]): number {
  return accounts.reduce((sum, a) => (a.figure ? sum + (a.owed ? -a.figure.value : a.figure.value) : sum), 0);
}

/** The full series: the weekly history plus today's sum. */
export function netWorthSeries(state: FinanceState): NetWorthPoint[] {
  const counted = state.accounts.filter((a) => a.figure).length;
  return [...state.netWorth, { date: shortDate(state.today, 0), value: netWorth(state.accounts), accounts: counted }];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function shortDate(isoToday: string, plusDays: number): string {
  const d = new Date(`${isoToday}T12:00:00`);
  d.setDate(d.getDate() + plusDays);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
