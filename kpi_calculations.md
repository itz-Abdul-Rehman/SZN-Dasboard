# How Each KPI Card Is Calculated

A reference for every KPI card on every dashboard, with worked examples drawn from your real **April 1–30, 2026** data.

---

## How to use this document

Every dashboard card in the system has three things you should be able to ask of it:

1. **What does this number mean?** (in plain English)
2. **How was it calculated?** (the rule applied to your raw data)
3. **Can I verify it from my own activity?** (yes — the example below each card shows the arithmetic step-by-step)

Each card entry in this document follows the same shape:

> **The card** — what you see on your dashboard
> **What it means** — one or two sentences
> **How we calculate it** — the formula in everyday language
> **Worked example from April 2026** — your actual rows and the math

---

## A few things to know before you start

### The four call-outcome buckets

Almost every sales-side KPI depends on how a call's outcome is categorised. Outcomes fall into four buckets:

| Bucket | Outcomes that count | What it means |
|---|---|---|
| **Closed** | Paid in Full, Split Pay | A won deal — money committed |
| **Showed but didn't close** | Offer Declined, Not a Fit, Deposit Only | Prospect attended but didn't buy |
| **No-show** | No-Show, Cancelled | Prospect didn't attend |
| **Rescheduled** | Rescheduled | Excluded from every percentage so a rebooked call doesn't penalise the closer twice |

Why "Deposit" sits in *Showed but didn't close*: a deposit is a partial commitment, not a full purchase, so it's counted toward the showed-up totals but not the won totals. The actual cash collected is captured separately on the deposit follow-up call when the prospect either pays in full or backs out.

### Currency

Every client has a base currency on the dashboard (for example, DKK for Julie Bundgaard, USD for saad). All deals and ad spend are stored in whatever currency they were entered in, and we convert to your dashboard's display currency at view time using the daily exchange rate from a market data feed.

When a worked example below shows a Danish krone value next to a US dollar value, that's the conversion in action — the underlying row is unchanged.

### Cents

All money is stored internally in cents (or øre, the equivalent fractional unit). A deal of `1,170,000` cents in DKK is `11,700.00 DKK`. The dashboard always displays the formatted value with the currency symbol — you should never see "cents" on the screen.

---

## Your April 2026 data at a glance

Every example in this document uses these numbers. They were pulled directly from the live database on `2026-05-02`.

| Across all 12 clients (USD) | Value |
|---|---|
| Calls logged in April | 13 |
| Calls where the prospect showed up | 10 |
| No-shows | 3 |
| Deals closed | 5 |
| Total revenue (closed deals) | **$9,859.94** |
| Total cash collected | $5,164.90 |
| Total ad spend | **$11,062.99** |
| Total leads (Meta-attributed) | 59,695 |
| Calls booked by setters | 38 |
| New conversations started | 1,486 |

**The example client** for most worked examples is **Julie Bundgaard** (currency: DKK). She had the most complete activity across calls, ads, and setter work. Where a card needs a different client to make the example meaningful (e.g. Daniel and Matti for ad spend volume), that's called out.

Julie's full April call log:

| Date  | Outcome         | Revenue (DKK) | Cash (DKK) | Objection |
|-------|-----------------|--------------:|-----------:|-----------|
| Apr 15 | Split Pay       | 11,700        | 1,500      | —         |
| Apr 21 | Paid in Full    | 10,200        | 10,200     | —         |
| Apr 24 | Offer Declined  | 0             | 0          | Money     |
| Apr 24 | Cancelled       | 0             | 0          | —         |
| Apr 27 | No-Show         | 0             | 0          | —         |
| Apr 27 | Offer Declined  | 0             | 0          | Money     |
| Apr 27 | Split Pay       | 11,700        | 1,500      | —         |
| Apr 28 | No-Show         | 0             | 0          | —         |
| Apr 28 | Not a Fit       | 0             | 0          | —         |
| Apr 29 | Paid in Full    | 10,200        | 10,200     | —         |
| Apr 29 | Offer Declined  | 0             | 0          | Think About It |
| Apr 30 | Offer Declined  | 0             | 0          | —         |

Sorted into buckets:

- **Closed (won deals):** 4 — Apr 15, Apr 21, Apr 27, Apr 29
- **Showed but didn't close:** 5 — Apr 24, Apr 27, Apr 28, Apr 29, Apr 30
- **No-shows:** 3 — Apr 24 (cancelled), Apr 27, Apr 28
- **Rescheduled:** 0

That gives **9 calls where the prospect showed up** (4 closed + 5 showed-but-didn't-close) and **12 calls taken** in total (the 9 shown + 3 no-shows). Keep these numbers in mind — they show up in nearly every Sales/Master example below.

---

# Master Dashboard

The master dashboard is the high-altitude view: agency totals first, then per-team breakdowns. Every card here is also available in more detail on its specialised dashboard (Sales, Ads, or Setter).

## Total Revenue

> **What you see:** The total dollar value of every deal closed in the period, big and bold.

**What it means.** The sum of every contract you've sold this month. Counts both deals paid in full upfront and deals paid via a split-pay arrangement.

**How we calculate it.** Take every call where the outcome is *Paid in Full* or *Split Pay*. Add up the deal value (revenue) on each. Convert any non-USD values to the dashboard's display currency using the day's exchange rate.

**Worked example (April 2026, all clients in USD).**

| Date | Client | Outcome | Revenue (raw) | Revenue (USD) |
|---|---|---|---:|---:|
| Apr 12 | saad | Split Pay | $3,000 USD | $3,000.00 |
| Apr 15 | Julie Bundgaard | Split Pay | 11,700 DKK | $1,832.45 |
| Apr 21 | Julie Bundgaard | Paid in Full | 10,200 DKK | $1,597.52 |
| Apr 27 | Julie Bundgaard | Split Pay | 11,700 DKK | $1,832.45 |
| Apr 29 | Julie Bundgaard | Paid in Full | 10,200 DKK | $1,597.52 |

Conversion: 1 USD = 6.3849 DKK on the snapshot date, so each DKK amount is divided by 6.3849.

Adding the USD column: `3,000.00 + 1,832.45 + 1,597.52 + 1,832.45 + 1,597.52` = **$9,859.94**.

That matches the headline number on the master dashboard for April.

## Total Cash Collected

> **What you see:** The total cash actually received against this period's deals.

**What it means.** Of the revenue you booked, how much money has actually moved into your account. For a paid-in-full deal, cash equals revenue. For a split-pay deal, cash is just the upfront portion — the remaining instalments will be booked as cash when they're collected.

**How we calculate it.** Same set of calls as Total Revenue (closed deals only), but we sum the *cash collected* field instead of the revenue field.

**Worked example (April 2026, all clients in USD).**

| Date | Client | Outcome | Cash collected (raw) | Cash (USD) |
|---|---|---|---:|---:|
| Apr 12 | saad | Split Pay | $1,500 USD | $1,500.00 |
| Apr 15 | Julie Bundgaard | Split Pay | 1,500 DKK | $234.93 |
| Apr 21 | Julie Bundgaard | Paid in Full | 10,200 DKK | $1,597.52 |
| Apr 27 | Julie Bundgaard | Split Pay | 1,500 DKK | $234.93 |
| Apr 29 | Julie Bundgaard | Paid in Full | 10,200 DKK | $1,597.52 |

Total: **$5,164.90**.

Notice the two split-pay deals collected only 1,500 DKK upfront against 11,700 DKK booked — that gap is the future instalments. It's also why Total Cash is roughly half of Total Revenue this month.

## Total Deals Won

> **What you see:** The headline count of closed deals.

**What it means.** How many sales calls ended with the prospect paying — either in full or via a split-pay plan.

**How we calculate it.** Count every call where the outcome is *Paid in Full* or *Split Pay*.

**Worked example (April 2026, all clients).** From the table above, 5 calls qualify:
- saad: 1 (Apr 12)
- Julie Bundgaard: 4 (Apr 15, Apr 21, Apr 27, Apr 29)

**Total Deals Won = 5.**

## Calls Taken

> **What you see:** Total calls that actually happened in the period.

**What it means.** Every call that occurred — whether the prospect bought, didn't buy, or didn't show up. The only thing excluded is rescheduled calls, because a rescheduled call gets a fresh entry on its new date and we don't want to double-count it.

**How we calculate it.** Count every call in the period whose outcome is anything other than *Rescheduled*.

**Worked example (April 2026, all clients).** 13 calls were logged, none of them were rescheduled. **Calls Taken = 13.**

For Julie Bundgaard alone: she had 12 calls, all non-rescheduled. **Calls Taken (Julie) = 12.**

## Booked Calls

> **What you see:** How many sales calls the setting team booked into the calendar.

**What it means.** A count of appointments setters secured. Reported by the setters themselves on their daily activity log, not by the calendar.

**How we calculate it.** Add up the *Calls Booked* column from every setter's daily log in the period.

**Worked example (April 2026, all clients).**

| Setter team | Calls booked in April |
|---|---:|
| Julie Bundgaard's setter | 21 |
| Thee Bridal Coach's setter | 17 |
| Stine Miszczuk's setter | 0 |
| **Total** | **38** |

**Booked Calls = 38.**

## Pacing

> **What you see:** A projected end-of-month figure, calculated from your current daily rate.

**What it means.** "If you keep going at the rate you've gone so far this month, this is what you'll finish at." It's a forecast, not a measurement.

**How we calculate it.** Take whatever the current value is (e.g. revenue), divide by the number of days that have already passed in the month, then multiply by the total days in the month.

**Worked example (revenue pacing on Apr 21, all clients in USD).** By Apr 21, three deals had landed:

- saad's Split Pay on Apr 12: $3,000.00
- Julie's Split Pay on Apr 15: $1,832.45
- Julie's Paid in Full on Apr 21: $1,597.52
- **Revenue-to-date by Apr 21: $6,429.97**

Pacing math:
- Days elapsed (1st through 21st): 21
- Days in April: 30
- Daily rate: 6,429.97 ÷ 21 = $306.19/day
- Projected month total: 306.19 × 30 = **$9,185.67**

The actual end-of-month figure was $9,859.94 — slightly above the Apr-21 projection, since the back half of April included Julie's last two closed deals (Apr 27 split pay + Apr 29 paid in full).

## ROAS (Master)

> **What you see:** Return on Ad Spend, expressed as a multiple (e.g. 2.5×).

**What it means.** For every dollar you spent on ads, how many dollars of revenue you booked. ROAS of 2.0 means the ads earned back twice what they cost.

**How we calculate it.** Total revenue from closed deals ÷ total ad spend, both in the same currency.

**Worked example (April 2026, all clients in USD).**
- Total revenue: $9,859.94
- Total ad spend: $11,062.99
- ROAS = 9,859.94 ÷ 11,062.99 = **0.89**

A ROAS below 1 means the ads cost more than they returned in booked revenue this month. The master dashboard exposes this as one number; the Ads dashboard splits ROAS into a "cash-only" and "revenue" version (see those cards below).

For Julie alone (her dashboard, in DKK):
- Revenue: 43,800 DKK
- Ad spend: 24,055 DKK
- ROAS = 43,800 ÷ 24,055 = **1.82**

So Julie's individual ads outperformed the agency average — every krone spent returned 1.82 kroner of booked revenue. The agency-wide drag comes from the other two advertising clients (Daniel and Matti) whose April revenue was zero against $7,295 of combined spend.

## Closer block: Calls / Deals / Close Rate / Revenue / Upfront %

A condensed strip showing the same closer's stats five different ways. Each card uses the same dataset (closed-deal calls attributed to the closer) but a different formula. We cover Close Rate and Upfront % below in their own sections; the rest mirror the master totals already covered.

## Appointment block: New Convos / Responses / Offers Sent / Calls Booked / Show-Up %

These five cards summarise the setter team's funnel. They're covered in detail under the Setter Dashboard section below.

## Ad block: Spend / Cost-per-Follower / Cost-per-Call / Cost-per-Customer / ROAS Cash

These five mirror the Ads Dashboard headline strip. April 2026 values (all clients, USD): Spend **$11,062.99** ($11.1K), Cost per Follower **—** (no follower data this month), Cost per Call **$851.00**, Cost per Customer **$2,212.60** ($2.2K), ROAS Cash **0.47×**. Full definitions and worked examples are in the Ads Dashboard section below.

## Monthly Goals

> **What you see:** A progress bar for each goal you set for the month, with the current value next to the target.

**What it means.** Tracks how close you are to hitting the revenue, cash, calls-booked, and deals-won targets you set at the start of the month.

**How we calculate it.** For each goal type, the current month-to-date actual is divided by the target, and that fraction drives the bar fill. If you set an agency-wide goal, the dashboard uses that; otherwise it sums each client's individual goal.

**Worked example (April 2026).** No monthly goals were set for April 2026 across any client (the `monthly_goals` table is empty for that month). On the dashboard this appears as either zero-progress bars or a "Set goals" prompt.

## Closer Leaderboard

> **What you see:** A ranked list of closers with their calls, deals, close rate, show-up rate, and revenue.

**What it means.** Ranks each closer by revenue contribution. Helps spot top performers and underperformers at a glance.

**How we calculate it.** For each closer, we compute the same metrics as the headline cards (calls taken, deals closed, close rate, revenue, etc.) using only the calls attributed to that closer. The list is sorted by revenue, descending.

**Worked example (April 2026).** Only one closer had activity in April:

| Closer | Calls | Deals | Close Rate | Show-Up Rate | Revenue (DKK) |
|---|---:|---:|---:|---:|---:|
| Anna (Julie Bundgaard's closer) | 12 | 4 | 44.4% | 75.0% | 43,800 |

The other 15 closers in the system had zero April activity, so they don't appear on the leaderboard.

---

# Sales Dashboard

The Sales Dashboard is built for the closer team. It zooms into call quality, conversion rates, deal economics, and the reasons deals were lost.

## Revenue

Same formula and number as Total Revenue on the Master Dashboard above.

## Cash Collected

Same formula and number as Total Cash Collected on the Master Dashboard above.

## Deals Won / Lost

> **What you see:** Two numbers side by side, e.g. "4 / 5" — won deals on the left, lost deals on the right.

**What it means.** Won = closed deals. Lost = calls where the prospect showed up but did not buy. No-shows are not counted on either side because the prospect never engaged with the offer.

**How we calculate it.**
- Won = count of *Paid in Full* + *Split Pay*
- Lost = (Calls Taken) − (Won) − (No-shows). This is equivalent to counting *Offer Declined* + *Not a Fit* + *Deposit Only*.

**Worked example (Julie Bundgaard, April).** From her call log:
- Calls taken (excluding rescheduled): 12
- Won: 4
- No-shows: 3 (Apr 24 cancelled, Apr 27 no-show, Apr 28 no-show)
- Lost = 12 − 4 − 3 = **5**

So the card shows **4 / 5**.

## Close Rate

> **What you see:** A percentage — what proportion of calls where the prospect showed up turned into a sale.

**What it means.** The conversion rate of *opportunities*, not of all calls. We exclude no-shows from the denominator because a closer can't close a call that didn't happen.

**How we calculate it.** Won deals ÷ calls where the prospect showed up.

> Equivalent way to think about it: Won ÷ (Won + Lost). Both formulas give the same answer.

**Worked example (Julie Bundgaard, April).**
- Won: 4
- Calls shown: 9 (4 closed + 5 showed-but-didn't-close)
- Close Rate = 4 ÷ 9 = **44.4%**

If we'd used the wrong denominator (all 12 calls including no-shows), the rate would falsely come out at 33.3% — penalising the closer for prospects who never showed up. That's why no-shows are excluded.

## Show-Up Rate

> **What you see:** A percentage — what proportion of booked calls actually happened.

**What it means.** A measure of appointment quality. If show-up is low, the setting team is booking calls with prospects who don't follow through.

**How we calculate it.** Calls where the prospect showed up ÷ (calls shown + no-shows).

**Worked example (Julie Bundgaard, April).**
- Calls shown: 9
- No-shows: 3
- Show-Up Rate = 9 ÷ (9 + 3) = 9 ÷ 12 = **75.0%**

## Deposits

> **What you see:** A count of deposit-only calls, plus an estimated dollar value.

**What it means.** A deposit-only outcome means the prospect committed to part of the deal but hasn't paid in full yet. The estimated value gives you a sense of the pipeline these deposits represent.

**How we calculate it.**
- Count = number of calls with outcome *Deposit Only*
- Estimated value = average deal size × deposit count

**Worked example (April 2026, all clients).** Zero deposit-only calls in April. **Card shows: 0 deposits, $0 estimated value.**

## Revenue per Call

> **What you see:** Average revenue produced per opportunity (call where the prospect showed up).

**What it means.** Combines close rate and average deal size into one number — how much money the average qualified opportunity is worth to you.

**How we calculate it.** Total revenue ÷ calls shown.

**Worked example (Julie Bundgaard, April, in DKK).**
- Revenue: 43,800 DKK
- Calls shown: 9
- Revenue per Call = 43,800 ÷ 9 = **4,866.67 DKK**

## Cash per Call

> **What you see:** Average cash collected per opportunity.

**How we calculate it.** Total cash collected ÷ calls shown.

**Worked example (Julie Bundgaard, April, in DKK).**
- Cash: 23,400 DKK
- Calls shown: 9
- Cash per Call = 23,400 ÷ 9 = **2,600.00 DKK**

## Cash Upfront %

> **What you see:** A percentage — what fraction of booked revenue has actually been collected.

**What it means.** A health metric for split-pay deals. If revenue is $10,000 and cash is $4,000, you've collected 40% upfront and the remaining $6,000 is sitting in instalments.

**How we calculate it.** Cash ÷ Revenue.

**Worked example (Julie Bundgaard, April, in DKK).**
- Cash: 23,400 DKK
- Revenue: 43,800 DKK
- Cash Upfront % = 23,400 ÷ 43,800 = **53.4%**

(Across all clients in April it was 52.4%, very close — most clients run a similar split-pay structure.)

## PIF % (Paid In Full Percentage)

> **What you see:** A percentage — what fraction of closed deals were paid in full upfront, vs. split into instalments.

**How we calculate it.** Count of *Paid in Full* outcomes ÷ Total deals closed.

**Worked example (Julie Bundgaard, April).**
- Paid in Full deals: 2 (Apr 21, Apr 29)
- Split Pay deals: 2 (Apr 15, Apr 27)
- Total closed: 4
- PIF % = 2 ÷ 4 = **50.0%**

## Average Deal

> **What you see:** Average closed-deal value.

**How we calculate it.** Total revenue ÷ Deals closed.

**Worked example (Julie Bundgaard, April, in DKK).**
- Revenue: 43,800 DKK
- Deals closed: 4
- Average Deal = 43,800 ÷ 4 = **10,950 DKK**

## Average Cash

> **What you see:** Average cash collected per closed deal.

**How we calculate it.** Total cash ÷ Deals closed.

**Worked example (Julie Bundgaard, April, in DKK).**
- Cash: 23,400 DKK
- Deals: 4
- Average Cash = 23,400 ÷ 4 = **5,850 DKK**

## Objection Counters (Think About It / Money / Time / Partner / Fear / Value)

> **What you see:** Six small counters showing how often each objection type appeared on lost deals.

**What it means.** When a closer marks a call as *Offer Declined* or *Not a Fit*, they tag the primary objection. These counters tell you which objection is killing the most deals so you can address it in your script.

**How we calculate it.** For each objection type, count the lost calls (Offer Declined + Not a Fit) tagged with it.

**Worked example (Julie Bundgaard, April).** Of her 5 lost-but-shown calls:

| Objection | Count |
|---|---:|
| Money | 2 (Apr 24, Apr 27) |
| Think About It | 1 (Apr 29) |
| Untagged | 2 (Apr 28 Not a Fit, Apr 30 Offer Declined) |
| Time, Partner, Fear, Value | 0 |

The pie chart on the dashboard renders only the non-zero objections.

## Daily Revenue Trend Chart

A line chart of daily closed-deal revenue. Each point is the sum of revenue for calls with a closed outcome on that date.

For Julie in April: dots on Apr 15, 21, 27, 29 (the four days with closed deals); flat zero on every other day.

---

# Ads Dashboard

The Ads Dashboard surfaces your Meta (Facebook/Instagram) ad performance and ties it back to revenue.

## Total Spend

> **What you see:** Total dollars spent on Meta ads in the period. (Dashboard rounds to "$11.1K"; the exact value is shown when you hover.)

**How we calculate it.** For every active or paused ad in the period, take the daily spend Meta reported, convert it from the ad account's billing currency to your dashboard's display currency using the day's exchange rate, then sum. Removed/archived ads are excluded.

The conversion step matters: all three of your advertising clients in April (Julie, Daniel, Matti) had their Meta accounts billed in DKK. The dashboard converts those DKK amounts to USD before summing.

**Worked example (April 2026, all clients).**

| Client | Spend (DKK, billed) | Spend (USD, after FX) |
|---|---:|---:|
| Daniel Steffensen | 23,510.89 DKK | $3,682.26 |
| Julie Bundgaard | 24,054.51 DKK | $3,767.41 |
| Matti Isho | 23,070.20 DKK | $3,613.24 |
| **Total** | — | **$11,062.91** |

Conversion rate used: 1 USD = 6.3849 DKK (snapshot from `2026-05-02`). The dashboard shows this rounded as **$11.1K**.

## Total Leads

> **What you see:** Total lead-form submissions, link clicks, or profile visits attributed to the ads. April reads **59.7K**.

**What it means.** Whatever Meta is configured to count as a "result" for each campaign. For a lead-generation campaign that's a form fill; for a traffic campaign it's a click; for an awareness campaign it's a view.

**How we calculate it.** For each ad on each day, we use whichever number Meta gave us:

1. **First choice:** the raw `results` count Meta reports.
2. **Fallback:** if `results` is zero but Meta reported a `cost per result`, we recover the count by dividing that day's spend by the cost per result. This handles a known sync quirk where Meta sometimes returns the per-unit cost without the unit count.

**Worked example (April 2026, all clients).** All three advertising clients hit the fallback path in April — Meta returned a cost-per-result for each ad-day but a zero result count, so the dashboard derived the lead counts from spend ÷ cost-per-result:

| Client | Derived leads |
|---|---:|
| Daniel Steffensen | 22,549 |
| Julie Bundgaard | 19,298 |
| Matti Isho | 17,848 |
| **Total** | **59,695** |

These represent Meta-attributed conversions (form fills / link clicks / etc., depending on each campaign's optimisation goal), not your sales team's qualified-lead count. Cross-reference against *new conversations* on the Setter dashboard to see which of those 59,695 actually entered a real conversation.

## Cost per Follower

> **What you see:** Average ad dollars spent per new follower gained.

**How we calculate it.** Ad spend ÷ followers gained over the period. Followers gained is calculated as: follower count at the end of the period − follower count at the start of the period (we use a 90-day pre-window buffer to make sure we have a starting count even for accounts that started tracking mid-month).

**Worked example (April 2026, all clients).** No follower snapshots were recorded for any account in April (manual follower counts weren't entered, and the Meta API doesn't currently return them either). The card shows an em-dash (—) — a divide-by-zero is treated as "no data" rather than a number.

## Cost per Conversation

> **What you see:** Average ad dollars spent per new conversation your setters opened.

**How we calculate it.** Ad spend ÷ new conversations (from the Setter logs).

**Worked example (April 2026, all clients).**
- Ad spend: $11,062.99
- New conversations: 1,486
- Cost per Conversation = 11,062.99 ÷ 1,486 = **$7.44**

## ROAS Cash

> **What you see:** A more conservative version of ROAS that uses cash collected instead of booked revenue.

**What it means.** For every dollar spent on ads, how many dollars of cash actually moved into your account this month. Lower than ROAS Rev because split-pay instalments aren't yet reflected in cash.

**How we calculate it.** Total cash collected ÷ total ad spend.

**Worked example (April 2026, all clients in USD).**
- Cash: $5,164.90
- Spend: $11,062.99
- ROAS Cash = 5,164.90 ÷ 11,062.99 = **0.47**

## ROAS Rev

> **What you see:** Total contracted revenue per dollar of ad spend.

**How we calculate it.** Total revenue ÷ total ad spend. (Same formula as the master dashboard's ROAS card.)

**Worked example (April 2026, all clients in USD).**
- Revenue: $9,859.94
- Spend: $11,062.99
- ROAS Rev = 9,859.94 ÷ 11,062.99 = **0.89**

## Cost per Call

> **What you see:** Average ad dollars spent per sales call that took place.

**How we calculate it.** Ad spend ÷ calls taken (calls that happened, excluding rescheduled).

**Worked example (April 2026, all clients in USD).**
- Spend: $11,062.99
- Calls taken: 13
- Cost per Call = 11,062.99 ÷ 13 = **$851.00**

## Cost per Customer

> **What you see:** Average ad dollars spent per closed deal.

**How we calculate it.** Ad spend ÷ deals closed.

**Worked example (April 2026, all clients in USD).**
- Spend: $11,062.99
- Deals closed: 5
- Cost per Customer = 11,062.99 ÷ 5 = **$2,212.60**

## CTR (Click-Through Rate)

> **What you see:** A percentage — what proportion of ad impressions resulted in someone clicking the ad.

**How we calculate it.** Each day's CTR comes from Meta directly. To roll up multiple days into one number we use an *impression-weighted average*: a day with 100,000 impressions counts ten times more than a day with 10,000 impressions.

Mathematically: `Σ(daily CTR × daily impressions) ÷ Σ(daily impressions)`.

**Worked example (April 2026, all clients).** With ad-level impressions of 962,077 across the month, the impression-weighted CTR comes out to **2.84%**.

## CPM (Cost per 1,000 Impressions)

> **What you see:** What it costs to put your ad in front of 1,000 people.

**How we calculate it.** Impression-weighted average of Meta's daily CPM, same logic as CTR.

**Worked example (April 2026, all clients in USD).** Headline CPM = **$62.80**.

## CPC (Cost per Click)

> **What you see:** Average cost of each click.

**How we calculate it.** Impression-weighted average of Meta's daily CPC.

**Worked example (April 2026, all clients in USD).** Headline CPC = **$2.49**.

## Per-Ad Table Columns

The table below the headline cards lists every individual ad with the same metrics applied at the per-ad level. Status, Daily Budget, Spend, Reach, Frequency (impressions ÷ reach), CPM, CTR, CPC, Results, Cost/Result, Followers, and Cost/Follower all use the same formulas as their headline equivalents — just filtered to the rows for that one ad.

---

# Setter Dashboard

The Setter Dashboard tracks the team that books calls into the closers' calendars. It's built around the conversation funnel: new conversations → responses → call proposals → calls booked.

## Leads (New Conversations)

> **What you see:** Total new conversations the setters started in the period.

**How we calculate it.** Sum the *new_convos* column from every setter's daily log in the period.

**Worked example (April 2026, all clients).**

| Setter team | New conversations |
|---|---:|
| Stine Miszczuk's setter | 617 |
| Julie Bundgaard's setter | 479 |
| Thee Bridal Coach's setter | 390 |
| **Total** | **1,486** |

## Responses

> **What you see:** Total responses received across all those conversations.

**How we calculate it.** Sum the *responses* column from every setter's daily log.

**Worked example (April 2026, all clients).**
- Stine: 69
- Julie: 198
- Bridal Coach: 32
- **Total: 299**

## Call Proposals

> **What you see:** Total times a setter pitched a call to a prospect.

**How we calculate it.** Sum the *proposals* column from every setter's daily log.

**Worked example (April 2026, all clients).**
- Stine: 2
- Julie: 58
- Bridal Coach: 36
- **Total: 96**

## Calls Booked

Same formula as the master dashboard's Booked Calls card. **April total: 38.**

## Follow-ups

> **What you see:** Total follow-up messages sent in the period.

**How we calculate it.** Sum the *follow_ups* column from every setter's daily log.

**Worked example (April 2026, all clients).**
- Stine: 33
- Julie: 359
- Bridal Coach: 474
- **Total: 866**

## Pacing (Setter)

Same logic as Master Pacing but applied to *Calls Booked* instead of revenue. If by Apr 21 the team has booked 25 calls, pacing projects: `(25 ÷ 21) × 30 ≈ 36 calls` for the full month.

## Lead/Response %

> **What you see:** Of every new conversation started, what proportion got a response.

**How we calculate it.** Responses ÷ new conversations.

**Worked example (April 2026, all clients).**
- Responses: 299
- New conversations: 1,486
- Lead/Response = 299 ÷ 1,486 = **20.1%**

For Julie's setter alone: 198 ÷ 479 = **41.3%** (much higher engagement than the average — likely a more qualified lead source or more skilled outreach copy).

## Proposal/Response %

> **What you see:** Of those who responded, what proportion were pitched a call.

**How we calculate it.** Proposals ÷ responses.

**Worked example (April 2026, all clients).**
- Proposals: 96
- Responses: 299
- Proposal/Response = 96 ÷ 299 = **32.1%**

Julie's setter: 58 ÷ 198 = **29.3%**.

## Call/Proposal %

> **What you see:** Of the prospects who were pitched a call, how many actually booked.

**How we calculate it.** Calls booked ÷ proposals.

**Worked example (April 2026, all clients).**
- Calls booked: 38
- Proposals: 96
- Call/Proposal = 38 ÷ 96 = **39.6%**

Julie's setter: 21 ÷ 58 = **36.2%**.

## Call/Lead %

> **What you see:** End-to-end conversion: of every conversation started, what proportion ended in a booked call.

**How we calculate it.** Calls booked ÷ new conversations.

**Worked example (April 2026, all clients).**
- Calls booked: 38
- New conversations: 1,486
- Call/Lead = 38 ÷ 1,486 = **2.6%**

Julie's setter: 21 ÷ 479 = **4.4%**.

This is the headline funnel-efficiency number — a 2.6% overall booking rate from cold conversations is the agency baseline against which individual setters are measured.

## Setter Streaks

> **What you see:** "Current Streak", "Best Streak", and "Total Days" for each setter, plus a tier label like "ON FIRE" or "LEGENDARY".

**How we calculate it.** A streak is consecutive days where the setter logged any activity. Current streak counts back from today (or yesterday) until it hits a missing day; Best streak finds the longest such run anywhere in the date range. Total days is just the count of distinct days with at least one log.

Tier labels: 10+ days = LEGENDARY, 7+ = ON FIRE, 4+ = Hot, 2+ = Warm.

## Calls Booked Leaderboard

> **What you see:** Setters ranked by who booked the most calls in the period.

**How we calculate it.** For each setter, sum their *calls_booked* across the period. Sort descending.

**Worked example (April 2026).**

| Setter | Calls Booked |
|---|---:|
| Julie Bundgaard's setter | 21 |
| Thee Bridal Coach's setter | 17 |
| Stine Miszczuk's setter | 0 |

## Lead/Call Rate Leaderboard

> **What you see:** Setters ranked by efficiency — Calls Booked ÷ New Conversations.

**Worked example (April 2026).**

| Setter | Booking Rate |
|---|---:|
| Julie Bundgaard's setter | 21 ÷ 479 = **4.38%** |
| Thee Bridal Coach's setter | 17 ÷ 390 = **4.36%** |
| Stine Miszczuk's setter | 0 ÷ 617 = **0.00%** |

The volume leader (Stine, with 617 conversations) is bottom of the efficiency table — a useful signal that the volume isn't translating to bookings, and worth a coaching conversation.

## Setter Attribution Panel

> **What you see:** Per-setter, the number of calls they set, deals closed from those calls, revenue generated, and a Set→Close rate.

**What it means.** Closes the loop between setting and closing. If a setter is booking lots of calls but closers are losing them, the appointments may be low-quality.

**How we calculate it.** For each setter:
- **Calls Set** = calls where the setter is the "booked by" or appears in the multi-setter attribution table
- **Deals Closed** = of those, how many ended in *Paid in Full* or *Split Pay*
- **Revenue from Sets** = sum of revenue on the closed deals
- **Set → Close Rate** = Deals Closed ÷ (Calls Set excluding rescheduled)

**Worked example (April 2026).** No call_logs in April had a setter attribution recorded (the *call_log_setters* junction table is empty for the window, and *booked_by_setter_id* on the call_logs is also empty for these rows). The panel shows zeros for every setter this month — the attribution wiring exists but wasn't populated for April's calls.

---

# Glossary

One-line definitions of every term used in this document.

| Term | Meaning |
|---|---|
| **Booking rate** | Calls booked ÷ new conversations. The setter funnel's headline conversion. |
| **Calls shown** | Calls where the prospect actually attended (closed + showed-but-didn't-close). |
| **Calls taken** | All calls that occurred, excluding rescheduled. |
| **Cash collected** | Money actually received against a deal. Equals revenue for paid-in-full; equals deposit/upfront portion for split-pay. |
| **Cash Upfront %** | Cash ÷ Revenue. How much of the booked revenue is already in your account. |
| **Close rate** | Deals won ÷ calls shown. Excludes no-shows. |
| **Closed deal** | A call ending in *Paid in Full* or *Split Pay*. |
| **Cost per Call** | Ad spend ÷ calls taken. |
| **Cost per Conversation** | Ad spend ÷ new conversations. |
| **Cost per Customer** | Ad spend ÷ deals closed. |
| **Cost per Follower** | Ad spend ÷ followers gained. |
| **CPM** | Cost per 1,000 ad impressions. |
| **CPC** | Cost per ad click. |
| **CTR** | Click-through rate — clicks ÷ impressions, expressed as a percentage. |
| **Deals Lost** | Calls where the prospect showed up but didn't buy (Offer Declined + Not a Fit + Deposit Only). |
| **Deals Won** | Closed deals (Paid in Full + Split Pay). |
| **Deposit Only** | The prospect committed a deposit but did not pay in full. Counted as a showed-but-didn't-close outcome. |
| **No-show** | Prospect didn't attend (No-Show or Cancelled). |
| **PIF %** | Paid-in-Full deals ÷ total deals closed. |
| **Revenue** | Contracted deal value. Includes both paid-in-full and split-pay totals. |
| **Rescheduled** | A call moved to a new date. The original entry is excluded from every percentage. |
| **ROAS** | Return on Ad Spend. Revenue (or cash) ÷ ad spend. |
| **Show-Up Rate** | Calls shown ÷ (calls shown + no-shows). |
