tell application "Numbers"
	set theDoc to front document
	set dash to sheet "Dashboard" of theDoc
	set active sheet of theDoc to dash
	
	try
		delete every chart of dash
	end try
	try
		delete table "ChartCheck" of dash
	end try
	
	repeat with tableName in {"CashflowProbe", "TrendProbe", "ExpenseProbe", "IncomeProbe", "DebtProbe"}
		try
			delete table tableName of dash
		end try
	end repeat
	
	tell dash
		set probeCash to make new table with properties {name:"CashflowProbe", row count:6, column count:2, header row count:0, header column count:0}
		set position of probeCash to {30, 1790}
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
		
		set probeTrend to make new table with properties {name:"TrendProbe", row count:6, column count:2, header row count:0, header column count:0}
		set position of probeTrend to {320, 1790}
		set value of cell "A1" of probeTrend to "Month"
		set value of cell "B1" of probeTrend to "Net Cashflow"
		set value of cell "A2" of probeTrend to "Jan"
		set value of cell "B2" of probeTrend to 750
		set value of cell "A3" of probeTrend to "Feb"
		set value of cell "B3" of probeTrend to 4750
		set value of cell "A4" of probeTrend to "Mar"
		set value of cell "B4" of probeTrend to 8440
		set value of cell "A5" of probeTrend to "Apr"
		set value of cell "B5" of probeTrend to 2000
		set value of cell "A6" of probeTrend to "May"
		set value of cell "B6" of probeTrend to 0
		set selection range of probeTrend to range "A1:B6" of probeTrend
		delay 1
		make new chart at end of dash with properties {position:{810, 360}, width:740, height:250}
		delay 1
		set value of cell "A2" of probeTrend to "=MonthlyHistory::A2"
		set value of cell "B2" of probeTrend to "=MonthlyHistory::F2"
		set value of cell "A3" of probeTrend to "=MonthlyHistory::A3"
		set value of cell "B3" of probeTrend to "=MonthlyHistory::F3"
		set value of cell "A4" of probeTrend to "=MonthlyHistory::A4"
		set value of cell "B4" of probeTrend to "=MonthlyHistory::F4"
		set value of cell "A5" of probeTrend to "=MonthlyHistory::A5"
		set value of cell "B5" of probeTrend to "=MonthlyHistory::F5"
		set value of cell "A6" of probeTrend to "=MonthlyHistory::A6"
		set value of cell "B6" of probeTrend to "=MonthlyHistory::F6"
		
		set probeExpense to make new table with properties {name:"ExpenseProbe", row count:6, column count:2, header row count:0, header column count:0}
		set position of probeExpense to {610, 1790}
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
		make new chart at end of dash with properties {position:{30, 695}, width:480, height:230}
		delay 1
		set value of cell "B2" of probeExpense to "=ExpenseSummary::B2"
		set value of cell "B3" of probeExpense to "=ExpenseSummary::B3"
		set value of cell "B4" of probeExpense to "=ExpenseSummary::B4"
		set value of cell "B5" of probeExpense to "=ExpenseSummary::B6"
		set value of cell "B6" of probeExpense to "=ExpenseSummary::B8"
		
		set probeIncome to make new table with properties {name:"IncomeProbe", row count:4, column count:2, header row count:0, header column count:0}
		set position of probeIncome to {900, 1790}
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
		make new chart at end of dash with properties {position:{540, 695}, width:480, height:230}
		delay 1
		set value of cell "B2" of probeIncome to "=IncomeSummary::B3"
		set value of cell "B3" of probeIncome to "=IncomeSummary::B4"
		set value of cell "B4" of probeIncome to "=MAX(0,IncomeSettings::B2-IncomeSummary::B3)"
		
		set probeDebt to make new table with properties {name:"DebtProbe", row count:4, column count:2, header row count:0, header column count:0}
		set position of probeDebt to {1190, 1790}
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
		make new chart at end of dash with properties {position:{1050, 695}, width:480, height:230}
		delay 1
		set value of cell "B2" of probeDebt to "=IF(ISNUMBER(DebtSummary::B7),DebtSummary::B7,0)"
		set value of cell "B3" of probeDebt to "=IF(ISNUMBER(DebtSummary::B8),DebtSummary::B8,0)"
		set value of cell "B4" of probeDebt to "=MAX(0,DebtSummary::B9)"
	end tell
	
	set format of range "B2:B6" of table "CashflowProbe" of dash to currency
	set format of range "B2:B6" of table "TrendProbe" of dash to currency
	set format of range "B2:B6" of table "ExpenseProbe" of dash to currency
	set format of range "B2:B4" of table "IncomeProbe" of dash to currency
	set format of range "B2:B4" of table "DebtProbe" of dash to number
	
	delay 10
	return count charts of dash
end tell
