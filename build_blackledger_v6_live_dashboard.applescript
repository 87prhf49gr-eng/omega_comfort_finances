set docPath to POSIX file "/Users/josal/Documents/New project 5/blackledger_elite_dynamic_v6.numbers"
set pdfPath to POSIX file "/Users/josal/Documents/New project 5/blackledger_elite_dynamic_v6_review.pdf"

set darkBlue to {7000, 15000, 32000}
set darkSlate to {8500, 10000, 12500}
set softRed to {36000, 8000, 7000}
set softGreen to {3500, 28000, 12000}
set whiteText to {62000, 63000, 65000}

tell application "Numbers"
	set theDoc to front document
	
	try
		set engineSheet to sheet "Engine" of theDoc
	on error
		set name of sheet "Dashboard" of theDoc to "Engine"
		set engineSheet to sheet "Engine" of theDoc
	end try
	
	try
		delete sheet "Dashboard" of theDoc
	end try
	
	tell theDoc
		set dash to make new sheet with properties {name:"Dashboard"}
	end tell
	set active sheet of theDoc to dash
	tell dash
		delete every table
	end tell
	
	tell dash
		set tHeader to make new table with properties {name:"LiveHeader", row count:3, column count:4}
		set tKPI to make new table with properties {name:"LiveKPIs", row count:4, column count:4}
		set tCoach to make new table with properties {name:"LiveCoach", row count:7, column count:4}
		set tAlerts to make new table with properties {name:"LiveAlerts", row count:6, column count:2}
		set tSignals to make new table with properties {name:"LiveSignals", row count:6, column count:2}
		set tCash to make new table with properties {name:"LiveChartCashflow", row count:6, column count:2}
		set tIncome to make new table with properties {name:"LiveChartIncome", row count:4, column count:2}
		set tDebt to make new table with properties {name:"LiveChartDebt", row count:4, column count:2}
	end tell
	
	set position of tHeader to {30, 30}
	set position of tKPI to {30, 170}
	set position of tCoach to {30, 710}
	set position of tAlerts to {30, 1040}
	set position of tSignals to {840, 1040}
	set position of tCash to {30, 1370}
	set position of tIncome to {380, 1370}
	set position of tDebt to {730, 1370}
	
	set width of column 1 of tHeader to 220
	set width of column 2 of tHeader to 280
	set width of column 3 of tHeader to 280
	set width of column 4 of tHeader to 420
	
	repeat with c from 1 to 4
		set width of column c of tKPI to 220
	end repeat
	
	set width of column 1 of tCoach to 130
	set width of column 2 of tCoach to 110
	set width of column 3 of tCoach to 320
	set width of column 4 of tCoach to 390
	
	set width of column 1 of tAlerts to 130
	set width of column 2 of tAlerts to 610
	set width of column 1 of tSignals to 130
	set width of column 2 of tSignals to 610
	
	set value of cell "A1" of tHeader to "BLACKLEDGER ELITE V6"
	set value of cell "B1" of tHeader to "Live Dashboard"
	set value of cell "C1" of tHeader to "Charts + AI Status"
	set value of cell "D1" of tHeader to "=AICoach::B2"
	set value of cell "A2" of tHeader to "User-friendly dashboard built for live money decisions."
	set value of cell "B2" of tHeader to "Income, expenses, debt payoff, and financial health."
	set value of cell "C2" of tHeader to "Charts react to the actual numbers in the workbook."
	set value of cell "D2" of tHeader to "=AICoach::D2"
	set value of cell "A3" of tHeader to "Health Score"
	set value of cell "B3" of tHeader to "=AICoach::B6"
	set value of cell "C3" of tHeader to "After-Tax Cushion"
	set value of cell "D3" of tHeader to "=MAX(0,IncomeSummary::B6-ExpenseSummary::B10)"
	
	set value of cell "A1" of tKPI to "Income Collected"
	set value of cell "B1" of tKPI to "Expenses"
	set value of cell "C1" of tKPI to "Total Debt"
	set value of cell "D1" of tKPI to "AI Status"
	set value of cell "A2" of tKPI to "=IncomeSummary::B3"
	set value of cell "B2" of tKPI to "=ExpenseSummary::B10"
	set value of cell "C2" of tKPI to "=DebtSummary::B2"
	set value of cell "D2" of tKPI to "=AICoach::B2"
	set value of cell "A3" of tKPI to "=KPICards::A3"
	set value of cell "B3" of tKPI to "=KPICards::B3"
	set value of cell "C3" of tKPI to "=KPICards::C3"
	set value of cell "D3" of tKPI to "=AICoach::C2"
	set value of cell "A4" of tKPI to ""
	set value of cell "B4" of tKPI to ""
	set value of cell "C4" of tKPI to ""
	set value of cell "D4" of tKPI to ""
	
	set value of cell "A1" of tCoach to "AI Coach"
	set value of cell "B1" of tCoach to "Status"
	set value of cell "C1" of tCoach to "Why"
	set value of cell "D1" of tCoach to "Next Move"
	repeat with r from 2 to 6
		set value of cell ("A" & r) of tCoach to "=AICoach::A" & r
		set value of cell ("B" & r) of tCoach to "=AICoach::B" & r
		set value of cell ("C" & r) of tCoach to "=AICoach::C" & r
		set value of cell ("D" & r) of tCoach to "=AICoach::D" & r
	end repeat
	set value of cell "A7" of tCoach to ""
	set value of cell "B7" of tCoach to ""
	set value of cell "C7" of tCoach to ""
	set value of cell "D7" of tCoach to ""
	
	set value of cell "A1" of tAlerts to "RED ALERTS"
	set value of cell "B1" of tAlerts to "Live warning center"
	repeat with r from 2 to 5
		set value of cell ("A" & r) of tAlerts to "=RedAlerts::A" & r
		set value of cell ("B" & r) of tAlerts to "=RedAlerts::B" & r
	end repeat
	set value of cell "A6" of tAlerts to ""
	set value of cell "B6" of tAlerts to ""
	
	set value of cell "A1" of tSignals to "GREEN SIGNALS"
	set value of cell "B1" of tSignals to "Live healthy signals"
	repeat with r from 2 to 5
		set value of cell ("A" & r) of tSignals to "=GreenSignals::A" & r
		set value of cell ("B" & r) of tSignals to "=GreenSignals::B" & r
	end repeat
	set value of cell "A6" of tSignals to ""
	set value of cell "B6" of tSignals to ""
	
	set value of cell "A1" of tCash to "Metric"
	set value of cell "B1" of tCash to "Value"
	set value of cell "A2" of tCash to "Income"
	set value of cell "B2" of tCash to "=IncomeSummary::B3"
	set value of cell "A3" of tCash to "Taxes"
	set value of cell "B3" of tCash to "=MAX(0,IncomeSummary::B5)"
	set value of cell "A4" of tCash to "Expenses"
	set value of cell "B4" of tCash to "=MAX(0,ExpenseSummary::B10)"
	set value of cell "A5" of tCash to "Extra Debt"
	set value of cell "B5" of tCash to "=MAX(0,DebtSummary::B4)"
	set value of cell "A6" of tCash to "Free Cash"
	set value of cell "B6" of tCash to "=MAX(0,IncomeSummary::B6-ExpenseSummary::B10-DebtSummary::B4)"
	
	set value of cell "A1" of tIncome to "Income Metric"
	set value of cell "B1" of tIncome to "Value"
	set value of cell "A2" of tIncome to "Received"
	set value of cell "B2" of tIncome to "=IncomeSummary::B3"
	set value of cell "A3" of tIncome to "Outstanding"
	set value of cell "B3" of tIncome to "=IncomeSummary::B4"
	set value of cell "A4" of tIncome to "Target Gap"
	set value of cell "B4" of tIncome to "=MAX(0,IncomeSettings::B2-IncomeSummary::B3)"
	
	set value of cell "A1" of tDebt to "Debt Metric"
	set value of cell "B1" of tDebt to "Months"
	set value of cell "A2" of tDebt to "Base"
	set value of cell "B2" of tDebt to "=IF(ISNUMBER(DebtSummary::B7),DebtSummary::B7,0)"
	set value of cell "A3" of tDebt to "Accelerated"
	set value of cell "B3" of tDebt to "=IF(ISNUMBER(DebtSummary::B8),DebtSummary::B8,0)"
	set value of cell "A4" of tDebt to "Saved"
	set value of cell "B4" of tDebt to "=MAX(0,DebtSummary::B9)"
	
	set background color of range "A1:D2" of tHeader to darkBlue
	set text color of range "A1:D2" of tHeader to whiteText
	set background color of range "A3:D3" of tHeader to darkSlate
	set text color of range "A3:D3" of tHeader to whiteText
	set font size of range "A1:D2" of tHeader to 14
	set font size of range "A3:D3" of tHeader to 13
	
	set background color of range "A1:D1" of tKPI to darkSlate
	set text color of range "A1:D1" of tKPI to whiteText
	set font size of range "A1:D1" of tKPI to 13
	set font size of range "A2:D2" of tKPI to 16
	
	set background color of range "A1:D1" of tCoach to darkBlue
	set text color of range "A1:D1" of tCoach to whiteText
	set font size of range "A1:D1" of tCoach to 13
	
	set background color of range "A1:B1" of tAlerts to softRed
	set text color of range "A1:B1" of tAlerts to whiteText
	set background color of range "A1:B1" of tSignals to softGreen
	set text color of range "A1:B1" of tSignals to whiteText
	
	try
		delete every chart of dash
	end try
	delay 1
	
	set selection range of tCash to range "A1:B6" of tCash
	delay 1
	make new chart at end of dash with properties {position:{30, 400}, width:500, height:280}
	
	set selection range of tIncome to range "A1:B4" of tIncome
	delay 1
	make new chart at end of dash with properties {position:{550, 400}, width:500, height:280}
	
	set selection range of tDebt to range "A1:B4" of tDebt
	delay 1
	make new chart at end of dash with properties {position:{1070, 400}, width:500, height:280}
	
	set active sheet of theDoc to dash
	save theDoc in docPath
	export theDoc to pdfPath as PDF
	
	set reportText to "ActiveSheet=" & name of active sheet of theDoc & linefeed
	set reportText to reportText & "Charts=" & (count charts of dash) & linefeed
	set reportText to reportText & "Overall=" & (formatted value of cell "D2" of tKPI as string) & linefeed
	set reportText to reportText & "HealthScore=" & (formatted value of cell "B3" of tHeader as string)
	return reportText
end tell
