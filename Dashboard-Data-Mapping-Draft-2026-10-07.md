# Dashboard Data-Mapping Draft

**Prepared:** 7 October 2026  
**State:** User approved the documented mapping and caveats on 7 October 2026. No dashboard widgets or imported records have been changed. Approval does not confirm auxiliary-file provenance, resolve unmatched employee IDs, define unverified business semantics, or make future-dated records actuals.  
**Privacy:** This report contains schema names, counts, and aggregate validation results only. It does not reproduce employee names, IDs, national IDs, salaries, or transaction-level values.

## 1. Inventory

Received 27 files with 4,140 nonblank data rows in total. Despite the `.csv` extensions, the files are tab-delimited. The current import/mapping layer must treat them as TSV content rather than assume commas.

| File group | Files | Rows / notable structure |
|---|---|---|
| Workforce | Employees | 550 data rows; 85 blank rows skipped; two `ID` columns match for all 550 rows; each data row has one additional unlabelled field, not mapped |
| Attendance | Attendance | 600 rows; dates range 2026-10-01 through 2026-10-31 |
| Organization | Departments, Locations, Workday Schedule | 120 rows in each; Departments has 20 unique English department names repeated across 120 rows |
| Employee operations | Employee Requests, Employee Transfers, Leave Balances, Documents, Company Assets & Assignments, Performance Reviews | 120 rows in each |
| Finance / commercial | Chart of Accounts, Clients, customer invoice headers/lines, customer purchase orders/lines, expense claims, finance transactions, financial workflows, payroll history, sales pipeline, supplier invoices/payments, vendors | Most have 120 rows; Vendors has 110 |
| Work Hub | Work Tasks, Work Hub Reminders | 120 rows in each |

All files have nonblank primary keys with no duplicate primary-key values in this check. Employee Requests has 36 rows missing the trailing optional `notes` field; Work Tasks has 46 rows missing trailing `notes`. These rows otherwise have the expected fields. No other row-width issues were found, aside from the Employees extra unlabelled field.

## 2. Workforce facts supported by Employees.csv

- **550** employee data rows; **430 ACTIVE**, **65 ON_LEAVE**, **55 INACTIVE**.
- Under the current convention, **495 current workforce** = ACTIVE + ON_LEAVE. INACTIVE remains separate and excluded.
- **5 companies** and **20 department names** are present.
- `Employees.departmentCode` matches `Departments.department_name_en` for all 550 rows, although the field is a department name rather than a code.
- The employee file contains company, nationality, job title, basic salary, and status. It does **not** contain date hired, date of birth, a termination date, an absconded/AWOL status, a staff worksite/project assignment, or a skills/certifications field.

Therefore, current headcount, employment-status mix, nationality share, company mix, and department mix can be calculated. Do not map INACTIVE to terminated, or infer runaway/AWOL status, without your explicit rule and source data.

## 3. Validation blockers and cross-file joins

### Employee-level records do not currently join

The employee IDs in the auxiliary files use a different identifier namespace from Employees.csv. Exact and normalized ID comparisons found **zero matches** in each of these files:

- Attendance: 0/600
- Employee Requests, Employee Transfers, Expense Claims, Leave Balances, Payroll History, Performance Reviews, Company Assets & Assignments, Work Tasks, and Work Hub Reminders: 0/120 each

The attendance file has the same five company values as the employee roster, so company-level attendance aggregates can be grouped by company. However, without an employee-key match, attendance coverage against the 495-person workforce, employee-level absence, per-department attendance, payroll-by-employee, renewals by employee, direct-report queues, and employee deployment counts cannot be joined reliably.

### Other joins

- Employees department names → Departments English names: **550/550 matched**.
- Customer invoice headers → Clients: **120/120 matched**.
- Customer invoice lines → invoice headers: **120/120 matched**.
- Customer purchase orders → Clients: **120/120 matched**.
- Customer PO lines → PO headers: **120/120 matched**.
- Supplier invoices → Vendors: **120/120 matched**.
- Supplier payments → supplier invoices: **120/120 matched**.
- Department and asset location values match `Locations.city` at the distinct-value level, not the Locations ID/name fields.
- Finance Transactions `account_code` does not match Chart of Accounts `account_code` or `id`. Its 20 distinct values match `parent_account`; confirm whether this is intentional before using it as an account grouping.

## 4. Metric arithmetic and date checks

| Check | Result | Mapping implication |
|---|---:|---|
| Customer invoice header subtotal + VAT = total | 120/120 match | Candidate for billed/paid/overdue invoice summaries, with status and date rules confirmed |
| Customer invoice line quantity × unit price = line total | 120/120 match | Line-level sales analysis is structurally usable |
| Customer PO line quantity × unit price = line total | 120/120 match | PO line arithmetic is internally consistent |
| Sum of PO lines vs PO header `total_sar` | 120/120 differ | Do not present PO header totals as reconciled to lines until currency/discount/charge rules are clarified |
| Supplier invoice subtotal + VAT = total | 120/120 match | Candidate for AP summaries; status/date definitions still needed |
| Payroll net = gross + housing + transport − deductions | 120/120 match | Arithmetic is internally consistent; employee links and future periods still block workforce-level payroll metrics |
| Attendance status mix | 315 PRESENT, 116 LATE, 169 REMOTE; no ABSENT status supplied | A recorded-status mix is possible; absence cannot be inferred from missing rows |
| Attendance dates after 7 Oct 2026 | 454/600 | Exclude future-dated records from an as-of-today metric unless these are explicitly forecasts or schedule data |
| Payroll payment dates after 7 Oct 2026 | 37/120 | Separate actual paid history from future/scheduled records before reporting YTD payroll |

The auxiliary sheets contain many full-year 2026 dates, including dates after the current date. Several sheets also have exactly 120 records. Treat them as **unverified and potentially prototype/sample data** until you confirm which rows are actual records and which are examples/forecasts.

## 5. Proposed dashboard mapping (for approval)

| Dashboard area | Candidate source and calculation | Current readiness |
|---|---|---|
| Current workforce | Employees: count ACTIVE + ON_LEAVE; show INACTIVE separately | Ready; 495 current, 55 inactive |
| Status / company / department / nationality mix | Employees: group by source status, company, department name, nationality | Ready from Employees.csv; preserve source status labels |
| Attendance latest day and status mix | Attendance: group by date, status, company | Provisional only; no employee join, no ABSENT records, and 454 future-dated rows |
| Leave balances | Leave Balances: remaining days by leave type | Aggregate-only until employee IDs are remapped; avoid per-person or department drill-down |
| Requests and transfers | Employee Requests / Employee Transfers: count by type and status | Aggregate-only until employee IDs are remapped |
| Document renewals | Documents: count by status/type and expiry window | Document-level counts possible; no employee link, so no employee renewal list |
| Deployment / location | Company Assets & Assignments plus Locations | Asset/location mix possible; not a reliable employee-deployed count until `assigned_to` is matched and deployment is defined |
| Skills / new vs long-serving | No explicit skill/certification or hire-date fields | Not available; do not infer skills from job title or tenure from payroll periods |
| Expense claims | Expense Claims: count/amount by category/status/date | Aggregate-only until employee IDs are remapped; confirm whether Submitted and Pending are separate queue states |
| Payroll | Payroll History: gross, allowances, deductions, net by pay period | Formula checks out; employee IDs are unlinked and 37 payment dates are future-dated |
| Accounts and transactions | Finance Transactions plus Chart of Accounts | Account key mismatch; confirm parent-account mapping before account-category KPIs |
| Customer invoices and sales | Customer invoice headers/lines, Clients, Sales Pipeline | Invoice/client/line joins and invoice arithmetic pass; confirm which statuses count as recognized, paid, outstanding, or forecast |
| Supplier AP | Supplier invoices/payments/Vendors | Joins and supplier-invoice arithmetic pass; confirm issued/overdue/paid semantics and date window |
| Purchase orders | Customer POs and lines | Joins and line arithmetic pass; header totals do not reconcile to lines |
| Work tasks and reminders | Work Tasks / Work Hub Reminders | Queue counts by status/priority/date possible; assignee IDs do not match Employees |

### Candidate filter dimensions

- **Employee-based:** company, department, employment status, nationality.
- **Dated event modules:** date range plus each module’s own status/type (attendance, requests, expenses, invoices, payroll, tasks, reminders).
- **Location:** city/location for departments and assets; not an employee filter until employee deployment/location is supplied and linked.
- Filters should only cross modules when their join key is verified. For example, a company filter can group Attendance using its own `company` field, but it should not imply employee-level attendance coverage until the IDs match.

## 6. Items to resolve before wiring metrics

1. Confirm whether the 120-row auxiliary sheets are real, mock, or a mixture, and which future-dated records are forecasts/scheduled examples.
2. Provide a crosswalk or corrected employee key so attendance, requests, leave, expenses, payroll, performance, assets, tasks, and reminders can join to Employees.csv.
3. Confirm the Finance Transactions → Chart of Accounts relationship (`account_code` vs `parent_account`).
4. Explain why Customer PO header totals differ from their linked line totals.
5. Later, specify your card/KPI names, formulas, date windows, status meanings, and filter behavior. Until then, retain INACTIVE as its own status and leave AWOL/runaway, termination, deployed, tenure, and skills counts unmapped.

**Mapping approval is recorded, but no dashboard changes or imports have been made from these files yet.** The approval authorizes only the documented mappings and caveats; it does not establish that the auxiliary sheets are actual business records. Before wiring those sources as live metrics, confirm their provenance, identify future-dated rows as actuals or forecasts, resolve the employee-key crosswalk where employee-level joins are needed, and settle the finance account/PO total semantics. Until then, only supported roster aggregates may be used as current workforce facts; unmatched module data must remain separate and clearly sourced.
