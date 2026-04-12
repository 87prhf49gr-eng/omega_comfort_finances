set q to quote

set deepNavy to {3500, 7000, 16000}
set panel to {7000, 9500, 12500}
set panel2 to {9000, 12000, 16000}
set blueAccent to {5000, 18000, 35000}
set greenAccent to {7000, 28000, 14000}
set redAccent to {35000, 8000, 6000}
set goldAccent to {42000, 32000, 9000}
set whiteText to {62000, 63000, 65000}
set mutedText to {43000, 46000, 50000}

tell application "Numbers"
	set theDoc to front document
	set dash to sheet "Dashboard" of theDoc
	set active sheet of theDoc to dash
	
	repeat with tableName in {"LiveHeader", "LiveKPIs", "LiveCoach", "LiveAlerts", "LiveSignals", "ChartProbe", "HeroPanel", "CardIncome", "CardExpenses", "CardDebt", "CardCash", "TitleCashflow", "TitleIncome", "TitleDebt", "CoachPanel", "AlertPanel", "SignalPanel"}
		try
			delete table tableName of dash
		end try
	end repeat
	
	tell dash
		set hero to make new table with properties {name:"HeroPanel", row count:3, column count:6, header row count:0, header column count:0}
		set cIncome to make new table with properties {name:"CardIncome", row count:3, column count:2, header row count:0, header column count:0}
		set cExpenses to make new table with properties {name:"CardExpenses", row count:3, column count:2, header row count:0, header column count:0}
		set cDebt to make new table with properties {name:"CardDebt", row count:3, column count:2, header row count:0, header column count:0}
		set cCash to make new table with properties {name:"CardCash", row count:3, column count:2, header row count:0, header column count:0}
		set tCash to make new table with properties {name:"TitleCashflow", row count:2, column count:2, header row count:0, header column count:0}
		set tIncome to make new table with properties {name:"TitleIncome", row count:2, column count:2, header row count:0, header column count:0}
		set tDebt to make new table with properties {name:"TitleDebt", row count:2, column count:2, header row count:0, header column count:0}
		set coach to make new table with properties {name:"CoachPanel", row count:6, column count:4, header row count:0, header column count:0}
		set alerts to make new table with properties {name:"AlertPanel", row count:5, column count:2, header row count:0, header column count:0}
		set signals to make new table with properties {name:"SignalPanel", row count:5, column count:2, header row count:0, header column count:0}
	end tell
	
	set position of hero to {30, 30}
	set position of cIncome to {30, 185}
	set position of cExpenses to {420, 185}
	set position of cDebt to {810, 185}
	set position of cCash to {1200, 185}
	set position of tCash to {30, 330}
	set position of tIncome to {550, 330}
	set position of tDebt to {1070, 330}
	set position of coach to {30, 730}
	set position of alerts to {30, 990}
	set position of signals to {810, 990}
	
	repeat with c from 1 to 6
		set width of column c of hero to 250
	end repeat
	set height of row 1 of hero to 40
	set height of row 2 of hero to 44
	set height of row 3 of hero to 34
	merge range "A1:C1" of hero
	merge range "A2:C2" of hero
	merge range "D1:F1" of hero
	merge range "D2:F2" of hero
	merge range "A3:B3" of hero
	merge range "C3:D3" of hero
	merge range "E3:F3" of hero
	
	repeat with cardTable in {cIncome, cExpenses, cDebt, cCash}
		set width of column 1 of cardTable to 170
		set width of column 2 of cardTable to 170
		set height of row 1 of cardTable to 28
		set height of row 2 of cardTable to 42
		set height of row 3 of cardTable to 26
		merge range "A1:B1" of cardTable
		merge range "A2:B2" of cardTable
		merge range "A3:B3" of cardTable
	end repeat
	
	repeat with titleTable in {tCash, tIncome, tDebt}
		set width of column 1 of titleTable to 240
		set width of column 2 of titleTable to 240
		set height of row 1 of titleTable to 28
		set height of row 2 of titleTable to 24
		merge range "A1:B1" of titleTable
		merge range "A2:B2" of titleTable
	end repeat
	
	set width of column 1 of coach to 170
	set width of column 2 of coach to 120
	set width of column 3 of coach to 470
	set width of column 4 of coach to 740
	repeat with r from 1 to 6
		set height of row r of coach to 32
	end repeat
	
	set width of column 1 of alerts to 140
	set width of column 2 of alerts to 620
	set width of column 1 of signals to 140
	set width of column 2 of signals to 620
	
	set value of cell "A1" of hero to "BLACKLEDGER ELITE V7"
	set value of cell "A2" of hero to "Elegant finance dashboard for freelancers and creators."
	set value of cell "D1" of hero to "=AICoach::B2"
	set value of cell "D2" of hero to "=AICoach::C2"
	set value of cell "A3" of hero to "=" & q & "HEALTH SCORE  " & q & "&AICoach::B6&" & q & "/100" & q
	set value of cell "C3" of hero to "=" & q & "AFTER-TAX CUSHION  " & q & "&ROUND(MAX(0,IncomeSummary::B6-ExpenseSummary::B10),0)"
	set value of cell "E3" of hero to "=" & q & "MONTHS SAVED  " & q & "&MAX(0,DebtSummary::B9)"
	
	set value of cell "A1" of cIncome to "INCOME COLLECTED"
	set value of cell "A2" of cIncome to "=IncomeSummary::B3"
	set value of cell "A3" of cIncome to "=IF(IncomeSummary::B3>=IncomeSettings::B2," & q & "Target reached" & q & ",IF(IncomeSummary::B3>=IncomeSettings::B2*0.8," & q & "Near target" & q & "," & q & "Below target" & q & "))"
	
	set value of cell "A1" of cExpenses to "TOTAL EXPENSES"
	set value of cell "A2" of cExpenses to "=ExpenseSummary::B10"
	set value of cell "A3" of cExpenses to "=IF(ExpenseSummary::B10>IncomeSummary::B3," & q & "Overspending" & q & ",IF(ExpenseSummary::B10>IncomeSummary::B3*0.85," & q & "Tight margin" & q & "," & q & "Under control" & q & "))"
	
	set value of cell "A1" of cDebt to "TOTAL DEBT"
	set value of cell "A2" of cDebt to "=DebtSummary::B2"
	set value of cell "A3" of cDebt to "=IF(DebtSummary::B9>0," & q & "Accelerated payoff" & q & "," & q & "Minimum pace" & q & ")"
	
	set value of cell "A1" of cCash to "FREE CASH"
	set value of cell "A2" of cCash to "=MAX(0,IncomeSummary::B6-ExpenseSummary::B10-DebtSummary::B4)"
	set value of cell "A3" of cCash to "=IF(IncomeSummary::B6-ExpenseSummary::B10-DebtSummary::B4<0," & q & "Pressure on cashflow" & q & ",IF(IncomeSummary::B6-ExpenseSummary::B10-DebtSummary::B4<IncomeSettings::B5*0.5," & q & "Low cushion" & q & "," & q & "Healthy cushion" & q & "))"
	
	set value of cell "A1" of tCash to "Cashflow Breakdown"
	set value of cell "A2" of tCash to "Income, taxes, expenses, debt, and free cash."
	set value of cell "A1" of tIncome to "Income Pipeline"
	set value of cell "A2" of tIncome to "Received vs outstanding vs target gap."
	set value of cell "A1" of tDebt to "Debt Payoff Speed"
	set value of cell "A2" of tDebt to "Base timeline vs accelerated plan."
	
	set value of cell "A1" of coach to "AI Coach"
	set value of cell "B1" of coach to "Status"
	set value of cell "C1" of coach to "Why"
	set value of cell "D1" of coach to "Next Move"
	repeat with r from 2 to 6
		set value of cell ("A" & r) of coach to "=AICoach::A" & r
		set value of cell ("B" & r) of coach to "=AICoach::B" & r
		set value of cell ("C" & r) of coach to "=AICoach::C" & r
		set value of cell ("D" & r) of coach to "=AICoach::D" & r
	end repeat
	
	set value of cell "A1" of alerts to "RED ALERTS"
	set value of cell "B1" of alerts to "What needs attention now"
	repeat with r from 2 to 5
		set value of cell ("A" & r) of alerts to "=RedAlerts::A" & r
		set value of cell ("B" & r) of alerts to "=RedAlerts::B" & r
	end repeat
	
	set value of cell "A1" of signals to "GREEN SIGNALS"
	set value of cell "B1" of signals to "What is working well"
	repeat with r from 2 to 5
		set value of cell ("A" & r) of signals to "=GreenSignals::A" & r
		set value of cell ("B" & r) of signals to "=GreenSignals::B" & r
	end repeat
	
	set format of cell "A2" of cIncome to currency
	set format of cell "A2" of cExpenses to currency
	set format of cell "A2" of cDebt to currency
	set format of cell "A2" of cCash to currency
	
	set format of range "B2:B6" of table "CashflowProbe" of dash to currency
	set format of range "B2:B4" of table "IncomeProbe" of dash to currency
	set format of range "B2:B4" of table "DebtProbe" of dash to number
	
	set background color of range "A1:C1" of hero to deepNavy
	set background color of range "A2:C2" of hero to panel
	set background color of range "D1:F1" of hero to blueAccent
	set background color of range "D2:F2" of hero to panel2
	set background color of range "A3:B3" of hero to panel2
	set background color of range "C3:D3" of hero to panel2
	set background color of range "E3:F3" of hero to panel2
	set text color of range "A1:F3" of hero to whiteText
	set font size of cell "A1" of hero to 22
	set font size of cell "A2" of hero to 13
	set font size of cell "D1" of hero to 18
	set font size of cell "D2" of hero to 12
	set font size of range "A3:F3" of hero to 12
	set alignment of range "A1:F3" of hero to left
	set text wrap of range "A1:F3" of hero to true
	
	set background color of range "A1:B1" of cIncome to greenAccent
	set background color of range "A2:B2" of cIncome to panel
	set background color of range "A3:B3" of cIncome to panel2
	set background color of range "A1:B1" of cExpenses to redAccent
	set background color of range "A2:B2" of cExpenses to panel
	set background color of range "A3:B3" of cExpenses to panel2
	set background color of range "A1:B1" of cDebt to blueAccent
	set background color of range "A2:B2" of cDebt to panel
	set background color of range "A3:B3" of cDebt to panel2
	set background color of range "A1:B1" of cCash to goldAccent
	set background color of range "A2:B2" of cCash to panel
	set background color of range "A3:B3" of cCash to panel2
	repeat with cardTable in {cIncome, cExpenses, cDebt, cCash}
		set text color of range "A1:B3" of cardTable to whiteText
		set font size of cell "A1" of cardTable to 12
		set font size of cell "A2" of cardTable to 18
		set font size of cell "A3" of cardTable to 11
		set alignment of range "A1:B3" of cardTable to left
		set text wrap of range "A1:B3" of cardTable to true
	end repeat
	
	repeat with titleTable in {tCash, tIncome, tDebt}
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
	
	set background color of range "A1:B1" of alerts to redAccent
	set background color of range "A2:B5" of alerts to panel
	set text color of range "A1:B5" of alerts to whiteText
	set font size of range "A1:B5" of alerts to 11
	set text wrap of range "A1:B5" of alerts to true
	
	set background color of range "A1:B1" of signals to greenAccent
	set background color of range "A2:B5" of signals to panel
	set text color of range "A1:B5" of signals to whiteText
	set font size of range "A1:B5" of signals to 11
	set text wrap of range "A1:B5" of signals to true
	
	set position of table "CashflowProbe" of dash to {30, 1700}
	set position of table "IncomeProbe" of dash to {380, 1700}
	set position of table "DebtProbe" of dash to {730, 1700}
	
	set position of chart 1 of dash to {30, 410}
	set width of chart 1 of dash to 500
	set height of chart 1 of dash to 285
	set position of chart 2 of dash to {550, 410}
	set width of chart 2 of dash to 500
	set height of chart 2 of dash to 285
	set position of chart 3 of dash to {1070, 410}
	set width of chart 3 of dash to 500
	set height of chart 3 of dash to 285
	
	delay 6
	return "v7 luxe dashboard updated"
end tell
