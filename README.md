# spenDANG

A budgeting app for students that turns "$50 left" into "**4 coffees or 1 movie night** left".

Everything runs in the browser. There's no backend and no AI: categorization is keyword rules, and data is saved to `localStorage`.

```sh
npm install
npm run dev     # http://localhost:5173
npm test        # parser / categorizer / tracker unit tests
npm run build
```

## How it works

- **Import** (`src/lib/csv.ts`): drop or paste a bank/card CSV. Header rows, columns (Date, Description, Amount *or* Debit/Credit, Category), purchase sign convention and date format are auto-detected and can be overridden. Re-importing an overlapping statement skips duplicates.
- **Categories** (`src/lib/categorize.ts`): ordered keyword rules on the description (first match wins), falling back to the bank's own category column, then "Other". Any transaction can be re-categorized in Activity.
- **Trackers** (`src/lib/trackers.ts`): each has a monthly budget, a cost per "time", and match rules (description keywords and/or categories). Keyword matches across all trackers are checked before category matches, so Starbucks lands in *Coffee & Boba* rather than *Eating Out*. A transaction can also be pinned to a tracker or excluded.
- **Billing cycles** (`src/lib/cycles.ts`): calendar months by default; set the statement day in ⚙️ Settings for mid-month cycles.
