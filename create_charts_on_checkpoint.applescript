set docPath to POSIX file "/Users/josal/Documents/New project 5/blackledger_elite_dynamic_v6_checkpoint.numbers"

tell application "Numbers"
	set theDoc to open docPath
	delay 2
	set dash to sheet "Dashboard" of theDoc
	set active sheet of theDoc to dash
	
	try
		delete every chart of dash
	end try
	
	repeat with tableName in {"CashflowProbe", "IncomeProbe", "DebtProbe"}
		try
			delete table tableName of dash
		end try
	end repeat
	
	tell dash
		set tCash to make new table with properties {name:"CashflowProbe", row count:6, column count:2}
		set position of tCash to {30, 1370}
		set value of cell "A1" of tCash to "Metric"
		set value of cell "B1" of tCash to "Value"
		set value of cell "A2" of tCash to "Income"
		set value of cell "B2" of tCash to 5650
		set value of cell "A3" of tCash to "Taxes"
		set value of cell "B3" of tCash to 1412.5
		set value of cell "A4" of tCash to "Expenses"
		set value of cell "B4" of tCash to 3170
		set value of cell "A5" of tCash to "Extra Debt"
		set value of cell "B5" of tCash to 687
		set value of cell "A6" of tCash to "Free Cash"
		set value of cell "B6" of tCash to 380.5
		set selection range of tCash to range "A1:B6" of tCash
		delay 1
		make new chart at end of dash with properties {position:{30, 400}, width:500, height:280}
		delay 1
		set value of cell "B2" of tCash to "=IncomeSummary::B3"
		set value of cell "B3" of tCash to "=MAX(0,IncomeSummary::B5)"
		set value of cell "B4" of tCash to "=MAX(0,ExpenseSummary::B10)"
		set value of cell "B5" of tCash to "=MAX(0,DebtSummary::B4)"
		set value of cell "B6" of tCash to "=MAX(0,IncomeSummary::B6-ExpenseSummary::B10-DebtSummary::B4)"
		
		set tIncome to make new table with properties {name:"IncomeProbe", row count:4, column count:2}
		set position of tIncome to {380, 1370}
		set value of cell "A1" of tIncome to "Income Metric"
		set value of cell "B1" of tIncome to "Value"
		set value of cell "A2" of tIncome to "Received"
		set value of cell "B2" of tIncome to 5650
		set value of cell "A3" of tIncome to "Outstanding"
		set value of cell "B3" of tIncome to 4730
		set value of cell "A4" of tIncome to "Target Gap"
		set value of cell "B4" of tIncome to 4350
		set selection range of tIncome to range "A1:B4" of tIncome
		delay 1
		make new chart at end of dash with properties {position:{550, 400}, width:500, height:280}
		delay 1
		set value of cell "B2" of tIncome to "=IncomeSummary::B3"
		set value of cell "B3" of tIncome to "=IncomeSummary::B4"
		set value of cell "B4" of tIncome to "=MAX(0,IncomeSettings::B2-IncomeSummary::B3)"
		
		set tDebt to make new table with properties {name:"DebtProbe", row count:4, column count:2}
		set position of tDebt to {730, 1370}
		set value of cell "A1" of tDebt to "Debt Metric"
		set value of cell "B1" of tDebt to "Months"
		set value of cell "A2" of tDebt to "Base"
		set value of cell "B2" of tDebt to 29
		set value of cell "A3" of tDebt to "Accelerated"
		set value of cell "B3" of tDebt to 16
		set value of cell "A4" of tDebt to "Saved"
		set value of cell "B4" of tDebt to 13
		set selection range of tDebt to range "A1:B4" of tDebt
		delay 1
		make new chart at end of dash with properties {position:{1070, 400}, width:500, height:280}
		delay 1
		set value of cell "B2" of tDebt to "=IF(ISNUMBER(DebtSummary::B7),DebtSummary::B7,0)"
		set value of cell "B3" of tDebt to "=IF(ISNUMBER(DebtSummary::B8),DebtSummary::B8,0)"
		set value of cell "B4" of tDebt to "=MAX(0,DebtSummary::B9)"
	end tell
	
	delay 20
	return count charts of dash
end tell
