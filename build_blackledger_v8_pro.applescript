set q to quote

set deepNavy to {2800, 5200, 12500}
set navy2 to {4200, 7600, 15500}
set panel to {6800, 9200, 12500}
set panel2 to {9400, 11800, 15800}
set accentBlue to {4200, 17000, 34000}
set accentGreen to {6500, 28500, 13500}
set accentRed to {36000, 7000, 6000}
set accentGold to {43000, 31500, 8500}
set whiteText to {62000, 63000, 65000}
set mutedText to {43000, 45500, 49000}

tell application "Numbers"
	set theDoc to front document
	set dash to sheet "Dashboard" of theDoc
	set active sheet of theDoc to dash
	
	try
		delete every chart of dash
	end try
	try
		delete every table of dash
	end try
	
	tell dash
		set hero to make new table with properties {name:"HeroPanel", row count:3, column count:8, header row count:0, header column count:0}
		set cIncome to make new table with properties {name:"CardIncome", row count:3, column count:2, header row count:0, header column count:0}
		set cExpenses to make new table with properties {name:"CardExpenses", row count:3, column count:2, header row count:0, header column count:0}
		set cDebt to make new table with properties {name:"CardDebt", row count:3, column count:2, header row count:0, header column count:0}
		set cCash to make new table with properties {name:"CardFreeCash", row count:3, column count:2, header row count:0, header column count:0}
		
		set titleCash to make new table with properties {name:"TitleCashflow", row count:2, column count:2, header row count:0, header column count:0}
		set titleExpense to make new table with properties {name:"TitleExpenseMix", row count:2, column count:2, header row count:0, header column count:0}
		set titleIncome to make new table with properties {name:"TitleIncomePipeline", row count:2, column count:2, header row count:0, header column count:0}
		set titleDebt to make new table with properties {name:"TitleDebtPayoff", row count:2, column count:2, header row count:0, header column count:0}
		
		set coach to make new table with properties {name:"CoachPanel", row count:6, column count:4, header row count:0, header column count:0}
		set priority to make new table with properties {name:"PriorityPanel", row count:6, column count:2, header row count:0, header column count:0}
		set alerts to make new table with properties {name:"AlertPanel", row count:5, column count:2, header row count:0, header column count:0}
		set signals to make new table with properties {name:"SignalPanel", row count:5, column count:2, header row count:0, header column count:0}
		
		set probeCash to make new table with properties {name:"CashflowProbe", row count:6, column count:2, header row count:0, header column count:0}
		set probeExpense to make new table with properties {name:"ExpenseProbe", row count:6, column count:2, header row count:0, header column count:0}
		set probeIncome to make new table with properties {name:"IncomeProbe", row count:4, column count:2, header row count:0, header column count:0}
		set probeDebt to make new table with properties {name:"DebtProbe", row count:4, column count:2, header row count:0, header column count:0}
	end tell
	
	set position of hero to {30, 30}
	set position of cIncome to {30, 180}
	set position of cExpenses to {420, 180}
	set position of cDebt to {810, 180}
	set position of cCash to {1200, 180}
	
	set position of titleCash to {30, 315}
	set position of titleExpense to {810, 315}
	set position of titleIncome to {30, 650}
	set position of titleDebt to {810, 650}
	
	set position of coach to {30, 1000}
	set position of priority to {1030, 1000}
	set position of alerts to {1030, 1245}
	set position of signals to {1030, 1460}
	
	set position of probeCash to {30, 1760}
	set position of probeExpense to {350, 1760}
	set position of probeIncome to {670, 1760}
	set position of probeDebt to {990, 1760}
	
	repeat with c from 1 to 8
		set width of column c of hero to 190
	end repeat
	set height of row 1 of hero to 44
	set height of row 2 of hero to 46
	set height of row 3 of hero to 32
	merge range "A1:D1" of hero
	merge range "A2:D2" of hero
	merge range "E1:H1" of hero
	merge range "E2:H2" of hero
	merge range "A3:B3" of hero
	merge range "C3:D3" of hero
	merge range "E3:F3" of hero
	merge range "G3:H3" of hero
	
	repeat with cardTable in {cIncome, cExpenses, cDebt, cCash}
		set width of column 1 of cardTable to 175
		set width of column 2 of cardTable to 175
		set height of row 1 of cardTable to 28
		set height of row 2 of cardTable to 42
		set height of row 3 of cardTable to 28
		merge range "A1:B1" of cardTable
		merge range "A2:B2" of cardTable
		merge range "A3:B3" of cardTable
	end repeat
	
	repeat with titleTable in {titleCash, titleExpense, titleIncome, titleDebt}
		set width of column 1 of titleTable to 360
		set width of column 2 of titleTable to 360
		set height of row 1 of titleTable to 30
		set height of row 2 of titleTable to 24
		merge range "A1:B1" of titleTable
		merge range "A2:B2" of titleTable
	end repeat
	
	set width of column 1 of coach to 170
	set width of column 2 of coach to 120
	set width of column 3 of coach to 300
	set width of column 4 of coach to 360
	repeat with r from 1 to 6
		set height of row r of coach to 34
	end repeat
	
	set width of column 1 of priority to 180
	set width of column 2 of priority to 340
	set width of column 1 of alerts to 150
	set width of column 2 of alerts to 370
	set width of column 1 of signals to 150
	set width of column 2 of signals to 370
	
	set value of cell "A1" of hero to "BLACKLEDGER ELITE V8"
	set value of cell "A2" of hero to "Premium money dashboard for freelancers, creators, and business owners."
	set value of cell "E1" of hero to "=AICoach::B2"
	set value of cell "E2" of hero to "=AICoach::C2"
	set value of cell "A3" of hero to "=" & q & "HEALTH SCORE  " & q & "&ROUND(AICoach::B6,0)&" & q & "/100" & q
	set value of cell "C3" of hero to "=" & q & "COLLECTION RATE  " & q & "&ROUND(IncomeSummary::B3/MAX(1,IncomeSummary::B2)*100,0)&" & q & "%" & q
	set value of cell "E3" of hero to "=" & q & "MONTHS SAVED  " & q & "&MAX(0,DebtSummary::B9)" 
	set value of cell "G3" of hero to "=" & q & "FREE CASH  $" & q & "&ROUND(MAX(0,IncomeSummary::B6-ExpenseSummary::B10-DebtSummary::B4),0)"
	
	set value of cell "A1" of cIncome to "INCOME COLLECTED"
	set value of cell "A2" of cIncome to "=IncomeSummary::B3"
	set value of cell "A3" of cIncome to "=" & q & "TARGET  " & q & "&ROUND(IncomeSummary::B3/MAX(1,IncomeSettings::B2)*100,0)&" & q & "%" & q
	
	set value of cell "A1" of cExpenses to "EXPENSE LOAD"
	set value of cell "A2" of cExpenses to "=ExpenseSummary::B10"
	set value of cell "A3" of cExpenses to "=" & q & "OF INCOME  " & q & "&ROUND(ExpenseSummary::B10/MAX(1,IncomeSummary::B3)*100,0)&" & q & "%" & q
	
	set value of cell "A1" of cDebt to "TOTAL DEBT"
	set value of cell "A2" of cDebt to "=DebtSummary::B2"
	set value of cell "A3" of cDebt to "=INDEX(Debts::A2:A9,MATCH(" & q & "Pay extra here" & q & ",Debts::K2:K9,0))&" & q & " is top priority" & q
	
	set value of cell "A1" of cCash to "SAFE FREE CASH"
	set value of cell "A2" of cCash to "=MAX(0,IncomeSummary::B6-ExpenseSummary::B10-DebtSummary::B4)"
	set value of cell "A3" of cCash to "=IF(MAX(0,IncomeSummary::B6-ExpenseSummary::B10-DebtSummary::B4)=0," & q & "Tight cushion" & q & "," & q & "Cash is available after debt" & q & ")"
	
	set value of cell "A1" of titleCash to "Cashflow Breakdown"
	set value of cell "A2" of titleCash to "How collected money gets divided."
	set value of cell "A1" of titleExpense to "Expense Mix"
	set value of cell "A2" of titleExpense to "Biggest spending categories this month."
	set value of cell "A1" of titleIncome to "Income Pipeline"
	set value of cell "A2" of titleIncome to "Received, outstanding, and target gap."
	set value of cell "A1" of titleDebt to "Debt Payoff Speed"
	set value of cell "A2" of titleDebt to "Base timeline versus accelerated plan."
	
	set value of cell "A1" of coach to "AI COACH"
	set value of cell "B1" of coach to "STATUS"
	set value of cell "C1" of coach to "WHY"
	set value of cell "D1" of coach to "NEXT MOVE"
	repeat with r from 2 to 6
		set value of cell ("A" & r) of coach to "=AICoach::A" & r
		set value of cell ("B" & r) of coach to "=AICoach::B" & r
		set value of cell ("C" & r) of coach to "=AICoach::C" & r
		set value of cell ("D" & r) of coach to "=AICoach::D" & r
	end repeat
	
	set value of cell "A1" of priority to "SMART FOCUS"
	set value of cell "B1" of priority to "Where attention should go now"
	set value of cell "A2" of priority to "Top APR Debt"
	set value of cell "B2" of priority to "=INDEX(Debts::A2:A9,MATCH(" & q & "Pay extra here" & q & ",Debts::K2:K9,0))"
	set value of cell "A3" of priority to "Focus Balance"
	set value of cell "B3" of priority to "=INDEX(Debts::B2:B9,MATCH(" & q & "Pay extra here" & q & ",Debts::K2:K9,0))"
	set value of cell "A4" of priority to "Outstanding"
	set value of cell "B4" of priority to "=IncomeSummary::B4"
	set value of cell "A5" of priority to "Collection Rate"
	set value of cell "B5" of priority to "=IncomeSummary::B3/MAX(1,IncomeSummary::B2)"
	set value of cell "A6" of priority to "Suggested Extra"
	set value of cell "B6" of priority to "=MAX(0,IncomeSummary::B7)"
	
	set value of cell "A1" of alerts to "RED ALERTS"
	set value of cell "B1" of alerts to "What needs attention"
	repeat with r from 2 to 5
		set value of cell ("A" & r) of alerts to "=RedAlerts::A" & r
		set value of cell ("B" & r) of alerts to "=RedAlerts::B" & r
	end repeat
	
	set value of cell "A1" of signals to "GREEN SIGNALS"
	set value of cell "B1" of signals to "What is working"
	repeat with r from 2 to 5
		set value of cell ("A" & r) of signals to "=GreenSignals::A" & r
		set value of cell ("B" & r) of signals to "=GreenSignals::B" & r
	end repeat
	
	set format of cell "A2" of cIncome to currency
	set format of cell "A2" of cExpenses to currency
	set format of cell "A2" of cDebt to currency
	set format of cell "A2" of cCash to currency
	set format of cell "B3" of priority to currency
	set format of cell "B4" of priority to currency
	set format of cell "B5" of priority to percent
	set format of cell "B6" of priority to currency
	
	set background color of range "A1:D1" of hero to deepNavy
	set background color of range "A2:D2" of hero to navy2
	set background color of range "E1:H1" of hero to accentBlue
	set background color of range "E2:H2" of hero to panel2
	set background color of range "A3:B3" of hero to panel
	set background color of range "C3:D3" of hero to panel
	set background color of range "E3:F3" of hero to panel
	set background color of range "G3:H3" of hero to panel
	set text color of range "A1:H3" of hero to whiteText
	set font size of cell "A1" of hero to 24
	set font size of cell "A2" of hero to 13
	set font size of cell "E1" of hero to 22
	set font size of cell "E2" of hero to 12
	set font size of range "A3:H3" of hero to 12
	set alignment of range "A1:H3" of hero to left
	set text wrap of range "A1:H3" of hero to true
	
	set background color of range "A1:B1" of cIncome to accentGreen
	set background color of range "A1:B1" of cExpenses to accentRed
	set background color of range "A1:B1" of cDebt to accentBlue
	set background color of range "A1:B1" of cCash to accentGold
	repeat with cardTable in {cIncome, cExpenses, cDebt, cCash}
		set background color of range "A2:B2" of cardTable to panel
		set background color of range "A3:B3" of cardTable to panel2
		set text color of range "A1:B3" of cardTable to whiteText
		set font size of cell "A1" of cardTable to 12
		set font size of cell "A2" of cardTable to 18
		set font size of cell "A3" of cardTable to 11
		set alignment of range "A1:B3" of cardTable to left
		set text wrap of range "A1:B3" of cardTable to true
	end repeat
	
	repeat with titleTable in {titleCash, titleExpense, titleIncome, titleDebt}
		set background color of range "A1:B1" of titleTable to deepNavy
		set background color of range "A2:B2" of titleTable to panel2
		set text color of range "A1:B2" of titleTable to whiteText
		set font size of cell "A1" of titleTable to 13
		set font size of cell "A2" of titleTable to 11
		set text wrap of range "A1:B2" of titleTable to true
	end repeat
	
	set background color of range "A1:D1" of coach to deepNavy
	set background color of range "A2:D6" of coach to panel
	set text color of range "A1:D6" of coach to whiteText
	set font size of range "A1:D1" of coach to 12
	set font size of range "A2:D6" of coach to 11
	set text wrap of range "A1:D6" of coach to true
	
	set background color of range "A1:B1" of priority to accentGold
	set background color of range "A2:B6" of priority to panel
	set text color of range "A1:B6" of priority to whiteText
	set font size of range "A1:B6" of priority to 11
	set text wrap of range "A1:B6" of priority to true
	
	set background color of range "A1:B1" of alerts to accentRed
	set background color of range "A2:B5" of alerts to panel
	set text color of range "A1:B5" of alerts to whiteText
	set font size of range "A1:B5" of alerts to 11
	set text wrap of range "A1:B5" of alerts to true
	
	set background color of range "A1:B1" of signals to accentGreen
	set background color of range "A2:B5" of signals to panel
	set text color of range "A1:B5" of signals to whiteText
	set font size of range "A1:B5" of signals to 11
	set text wrap of range "A1:B5" of signals to true
	
	set value of cell "A1" of probeCash to "Metric"
	set value of cell "B1" of probeCash to "Value"
	set value of cell "A2" of probeCash to "Income"
	set value of cell "B2" of probeCash to 5650
	set value of cell "A3" of probeCash to "Taxes"
	set value of cell "B3" of probeCash to 1412.5
	set value of cell "A4" of probeCash to "Expenses"
	set value of cell "B4" of probeCash to 3170
	set value of cell "A5" of probeCash to "Debt"
	set value of cell "B5" of probeCash to 687
	set value of cell "A6" of probeCash to "Free Cash"
	set value of cell "B6" of probeCash to 380.5
	set selection range of probeCash to range "A1:B6" of probeCash
	delay 1
	make new chart at end of dash with properties {position:{30, 360}, width:740, height:250}
	delay 1
	set value of cell "B2" of probeCash to "=IncomeSummary::B3"
	set value of cell "B3" of probeCash to "=MAX(0,IncomeSummary::B5)"
	set value of cell "B4" of probeCash to "=MAX(0,ExpenseSummary::B10)"
	set value of cell "B5" of probeCash to "=MAX(0,DebtSummary::B4)"
	set value of cell "B6" of probeCash to "=MAX(0,IncomeSummary::B6-ExpenseSummary::B10-DebtSummary::B4)"
	
	set value of cell "A1" of probeExpense to "Category"
	set value of cell "B1" of probeExpense to "Spend"
	set value of cell "A2" of probeExpense to "Housing"
	set value of cell "B2" of probeExpense to 1300
	set value of cell "A3" of probeExpense to "Food"
	set value of cell "B3" of probeExpense to 650
	set value of cell "A4" of probeExpense to "Transport"
	set value of cell "B4" of probeExpense to 850
	set value of cell "A5" of probeExpense to "Shopping"
	set value of cell "B5" of probeExpense to 250
	set value of cell "A6" of probeExpense to "Subscriptions"
	set value of cell "B6" of probeExpense to 120
	set selection range of probeExpense to range "A1:B6" of probeExpense
	delay 1
	make new chart at end of dash with properties {position:{810, 360}, width:740, height:250}
	delay 1
	set value of cell "B2" of probeExpense to "=ExpenseSummary::B2"
	set value of cell "B3" of probeExpense to "=ExpenseSummary::B3"
	set value of cell "B4" of probeExpense to "=ExpenseSummary::B4"
	set value of cell "B5" of probeExpense to "=ExpenseSummary::B6"
	set value of cell "B6" of probeExpense to "=ExpenseSummary::B8"
	
	set value of cell "A1" of probeIncome to "Income Metric"
	set value of cell "B1" of probeIncome to "Value"
	set value of cell "A2" of probeIncome to "Received"
	set value of cell "B2" of probeIncome to 5650
	set value of cell "A3" of probeIncome to "Outstanding"
	set value of cell "B3" of probeIncome to 4730
	set value of cell "A4" of probeIncome to "Target Gap"
	set value of cell "B4" of probeIncome to 4350
	set selection range of probeIncome to range "A1:B4" of probeIncome
	delay 1
	make new chart at end of dash with properties {position:{30, 695}, width:740, height:250}
	delay 1
	set value of cell "B2" of probeIncome to "=IncomeSummary::B3"
	set value of cell "B3" of probeIncome to "=IncomeSummary::B4"
	set value of cell "B4" of probeIncome to "=MAX(0,IncomeSettings::B2-IncomeSummary::B3)"
	
	set value of cell "A1" of probeDebt to "Debt Metric"
	set value of cell "B1" of probeDebt to "Months"
	set value of cell "A2" of probeDebt to "Base"
	set value of cell "B2" of probeDebt to 29
	set value of cell "A3" of probeDebt to "Accelerated"
	set value of cell "B3" of probeDebt to 16
	set value of cell "A4" of probeDebt to "Saved"
	set value of cell "B4" of probeDebt to 13
	set selection range of probeDebt to range "A1:B4" of probeDebt
	delay 1
	make new chart at end of dash with properties {position:{810, 695}, width:740, height:250}
	delay 1
	set value of cell "B2" of probeDebt to "=IF(ISNUMBER(DebtSummary::B7),DebtSummary::B7,0)"
	set value of cell "B3" of probeDebt to "=IF(ISNUMBER(DebtSummary::B8),DebtSummary::B8,0)"
	set value of cell "B4" of probeDebt to "=MAX(0,DebtSummary::B9)"
	
	set format of range "B2:B6" of probeCash to currency
	set format of range "B2:B6" of probeExpense to currency
	set format of range "B2:B4" of probeIncome to currency
	set format of range "B2:B4" of probeDebt to number
	
	set active sheet of theDoc to dash
	delay 8
	return "v8 built"
end tell
