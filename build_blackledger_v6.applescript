set q to quote
set docPath to POSIX file "/Users/josal/Documents/New project 5/blackledger_elite_dynamic_v6.numbers"
set pdfPath to POSIX file "/Users/josal/Documents/New project 5/blackledger_elite_dynamic_v6_review.pdf"

tell application "Numbers"
	close every document saving no
	set theDoc to open docPath
	delay 2
	set active sheet of theDoc to sheet "Dashboard" of theDoc
	set sh to sheet "Dashboard" of theDoc
	
	set position of table "ProHeader" of sh to {30, 30}
	set position of table "KPICards" of sh to {30, 160}
	set position of table "AICoach" of sh to {30, 340}
	set position of table "RedAlerts" of sh to {30, 610}
	set position of table "GreenSignals" of sh to {810, 610}
	set position of table "DynamicBars" of sh to {30, 1180}
	set position of table "ChartDataCashflow" of sh to {30, 1510}
	set position of table "ChartDataDebt" of sh to {420, 1510}
	
	try
		set tIncomeChart to table "ChartDataIncome" of sh
	on error
		tell sh
			set tIncomeChart to make new table with properties {name:"ChartDataIncome", row count:4, column count:2}
		end tell
	end try
	set position of tIncomeChart to {810, 1510}
	
	set value of cell "A1" of table "ProHeader" of sh to "BLACKLEDGER ELITE V6"
	set value of cell "B1" of table "ProHeader" of sh to "Reactive Finance Dashboard"
	set value of cell "C1" of table "ProHeader" of sh to "Income + Expenses + Debt"
	set value of cell "A2" of table "ProHeader" of sh to "Live dashboard that reacts to real cashflow."
	set value of cell "B2" of table "ProHeader" of sh to "Charts update from income, expenses, and debt data."
	set value of cell "C2" of table "ProHeader" of sh to "AI status switches between warning, watch, and healthy."
	set value of cell "D1" of table "ProHeader" of sh to "=AICoach::B2"
	set value of cell "D2" of table "ProHeader" of sh to "=AICoach::D2"
	
	set tIncome to table "IncomeTracker" of sheet "Income" of theDoc
	repeat with r from 2 to 14
		set value of cell ("G" & r) of tIncome to "=IF(AND(E" & r & "=" & q & q & ",F" & r & "=" & q & q & ")," & q & q & ",MAX(0,E" & r & "-F" & r & "))"
		set value of cell ("H" & r) of tIncome to "=IF(G" & r & "=" & q & q & "," & q & q & ",IF(G" & r & "=0," & q & "Paid" & q & ",IF(F" & r & "=0," & q & "Pending" & q & "," & q & "Partial" & q & ")))"
	end repeat
	
	set tExpenseSummary to table "ExpenseSummary" of sheet "Expenses" of theDoc
	set value of cell "B2" of tExpenseSummary to "=SUMIFS(ExpenseTracker::D2:D18,ExpenseTracker::C2:C18," & q & "*Housing*" & q & ")"
	set value of cell "B3" of tExpenseSummary to "=SUMIFS(ExpenseTracker::D2:D18,ExpenseTracker::C2:C18," & q & "*Food*" & q & ")"
	set value of cell "B4" of tExpenseSummary to "=SUMIFS(ExpenseTracker::D2:D18,ExpenseTracker::C2:C18," & q & "*Transport*" & q & ")"
	set value of cell "B5" of tExpenseSummary to "=SUMIFS(ExpenseTracker::D2:D18,ExpenseTracker::C2:C18," & q & "*Business*" & q & ")"
	set value of cell "B6" of tExpenseSummary to "=SUMIFS(ExpenseTracker::D2:D18,ExpenseTracker::C2:C18," & q & "*Shopping*" & q & ")"
	set value of cell "B7" of tExpenseSummary to "=SUMIFS(ExpenseTracker::D2:D18,ExpenseTracker::C2:C18," & q & "*Health*" & q & ")"
	set value of cell "B8" of tExpenseSummary to "=SUMIFS(ExpenseTracker::D2:D18,ExpenseTracker::C2:C18," & q & "*Subscr*" & q & ")"
	set value of cell "B9" of tExpenseSummary to "=SUMIFS(ExpenseTracker::D2:D18,ExpenseTracker::C2:C18," & q & "*Other*" & q & ")"
	set value of cell "B10" of tExpenseSummary to "=SUM(ExpenseTracker::D2:D18)"
	set value of cell "C10" of tExpenseSummary to "Feeds the live dashboard and AI warning logic."
	
	set tDebtSummary to table "DebtSummary" of sheet "DebtPlanner" of theDoc
	set value of cell "B7" of tDebtSummary to "=IF(B2<=0,0,IF(B6=0,CEILING(B2/MAX(1,B3),1),IF(B3<=B2*B6/12," & q & "Increase" & q & ",CEILING(-LN(1-(B2*B6/12)/B3)/LN(1+B6/12),1))))"
	set value of cell "B8" of tDebtSummary to "=IF(B2<=0,0,IF(B6=0,CEILING(B2/MAX(1,B5),1),IF(B5<=B2*B6/12," & q & "Increase" & q & ",CEILING(-LN(1-(B2*B6/12)/B5)/LN(1+B6/12),1))))"
	set value of cell "B9" of tDebtSummary to "=IF(AND(ISNUMBER(B7),ISNUMBER(B8)),MAX(0,B7-B8),0)"
	set value of cell "B10" of tDebtSummary to "=IF(AND(ISNUMBER(B7),ISNUMBER(B8)),MAX(0,(B3*B7-B2)-(B5*B8-B2)),0)"
	
	set tKPI to table "KPICards" of sh
	set value of cell "A2" of tKPI to "=IncomeSummary::B3"
	set value of cell "B2" of tKPI to "=ExpenseSummary::B10"
	set value of cell "C2" of tKPI to "=DebtSummary::B2"
	set value of cell "D2" of tKPI to "=AICoach::B2"
	set value of cell "A3" of tKPI to "=IF(IncomeSummary::B3>=IncomeSettings::B2," & q & "On target" & q & ",IF(IncomeSummary::B3>=IncomeSettings::B2*0.8," & q & "Near target" & q & "," & q & "Below target" & q & "))"
	set value of cell "B3" of tKPI to "=IF(ExpenseSummary::B10>IncomeSummary::B3," & q & "Overspending" & q & ",IF(ExpenseSummary::B10>IncomeSummary::B3*0.85," & q & "Tight margin" & q & "," & q & "Under control" & q & "))"
	set value of cell "C3" of tKPI to "=IF(DebtSummary::B9>0," & q & "Accelerated" & q & "," & q & "Minimum pace" & q & ")"
	set value of cell "D3" of tKPI to "=AICoach::C2"
	
	set tAI to table "AICoach" of sh
	set value of cell "A1" of tAI to "AI Coach"
	set value of cell "B1" of tAI to "Status"
	set value of cell "C1" of tAI to "Why"
	set value of cell "D1" of tAI to "Next Move"
	set value of cell "A2" of tAI to "Overall"
	set value of cell "B2" of tAI to "=IF(OR(IncomeSummary::B3<=0,IncomeSummary::B6-ExpenseSummary::B10<0,IncomeSummary::B6-ExpenseSummary::B10-DebtSummary::B4<0)," & q & "WARNING" & q & ",IF(OR(IncomeSummary::B3<IncomeSettings::B2,ExpenseSummary::B10>IncomeSummary::B3*0.85,DebtSummary::B9<=0)," & q & "WATCH" & q & "," & q & "HEALTHY" & q & "))"
	set value of cell "C2" of tAI to "=IF(B2=" & q & "WARNING" & q & ",IF(IncomeSummary::B6-ExpenseSummary::B10<0," & q & "After-tax cashflow is negative after expenses." & q & ",IF(IncomeSummary::B6-ExpenseSummary::B10-DebtSummary::B4<0," & q & "Extra debt payments are too aggressive for current cashflow." & q & "," & q & "Collected income is too low for the current plan." & q & ")),IF(B2=" & q & "WATCH" & q & ",IF(IncomeSummary::B3<IncomeSettings::B2," & q & "Income is below target, so the account stays in watch mode." & q & "," & q & "Cashflow is positive, but the safety margin is getting tight." & q & ")," & q & "Cashflow, taxes, and debt pace are aligned." & q & "))"
	set value of cell "D2" of tAI to "=IF(B2=" & q & "WARNING" & q & ",IF(IncomeSummary::B4>0," & q & "Collect outstanding invoices before sending more extra debt." & q & "," & q & "Cut flexible spending and reduce extra debt this month." & q & "),IF(B2=" & q & "WATCH" & q & ",IF(IncomeSummary::B3<IncomeSettings::B2," & q & "Protect cash first and follow up on unpaid work." & q & "," & q & "Trim flexible costs before increasing debt payments." & q & ")," & q & "Keep attacking the highest APR debt." & q & "))"
	set value of cell "A3" of tAI to "Spending"
	set value of cell "B3" of tAI to "=IF(ExpenseSummary::B10>IncomeSummary::B3," & q & "WARNING" & q & ",IF(ExpenseSummary::B10>IncomeSummary::B3*0.85," & q & "WATCH" & q & "," & q & "HEALTHY" & q & "))"
	set value of cell "C3" of tAI to "=IF(B3=" & q & "WARNING" & q & "," & q & "Expenses are above collected income." & q & ",IF(B3=" & q & "WATCH" & q & "," & q & "Expenses are using most of collected income." & q & "," & q & "Spending is still under control." & q & "))"
	set value of cell "D3" of tAI to "=IF(B3=" & q & "WARNING" & q & "," & q & "Cut wants and pause non-essential purchases." & q & ",IF(B3=" & q & "WATCH" & q & "," & q & "Trim flexible categories before income drops." & q & "," & q & "Current spending supports the plan." & q & "))"
	set value of cell "A4" of tAI to "Income"
	set value of cell "B4" of tAI to "=IF(IncomeSummary::B3<=0," & q & "WARNING" & q & ",IF(IncomeSummary::B3<IncomeSettings::B2," & q & "WATCH" & q & "," & q & "HEALTHY" & q & "))"
	set value of cell "C4" of tAI to "=IF(B4=" & q & "WARNING" & q & "," & q & "No collected income is supporting the current plan." & q & ",IF(B4=" & q & "WATCH" & q & "," & q & "Income target is not reached yet." & q & "," & q & "Income target is reached or exceeded." & q & "))"
	set value of cell "D4" of tAI to "=IF(B4=" & q & "WARNING" & q & "," & q & "Collect invoices before making bigger money moves." & q & ",IF(B4=" & q & "WATCH" & q & "," & q & "Follow up on pending invoices." & q & "," & q & "Use any surplus intentionally." & q & "))"
	set value of cell "A5" of tAI to "Debt"
	set value of cell "B5" of tAI to "=IF(OR(DebtSummary::B7=" & q & "Increase" & q & ",DebtSummary::B8=" & q & "Increase" & q & ")," & q & "WARNING" & q & ",IF(DebtSummary::B9<=0," & q & "WATCH" & q & "," & q & "HEALTHY" & q & "))"
	set value of cell "C5" of tAI to "=IF(B5=" & q & "WARNING" & q & "," & q & "Current payments are too low for the balances and APR." & q & ",IF(B5=" & q & "WATCH" & q & "," & q & "Extra payments are not shortening payoff enough." & q & "," & q & "Extra payments are shortening the payoff timeline." & q & "))"
	set value of cell "D5" of tAI to "=IF(B5=" & q & "WARNING" & q & "," & q & "Raise payments above monthly interest as soon as cashflow allows." & q & ",IF(B5=" & q & "WATCH" & q & "," & q & "Redirect safe surplus to the highest APR debt." & q & "," & q & "Continue the avalanche strategy." & q & "))"
	set value of cell "A6" of tAI to "Health Score"
	set value of cell "B6" of tAI to "=MAX(0,MIN(100,100-IF(IncomeSummary::B3<=0,40,IF(IncomeSummary::B3<IncomeSettings::B2*0.8,25,IF(IncomeSummary::B3<IncomeSettings::B2,15,0)))-IF(ExpenseSummary::B10>IncomeSummary::B3,30,IF(ExpenseSummary::B10>IncomeSummary::B3*0.85,15,0))-IF(IncomeSummary::B6-ExpenseSummary::B10<0,20,0)-IF(IncomeSummary::B6-ExpenseSummary::B10-DebtSummary::B4<0,15,0)-IF(DebtSummary::B9<=0,10,0)+MIN(3,MAX(0,DebtSummary::B9))))"
	set value of cell "C6" of tAI to "Score reacts to cashflow, taxes, and debt pace."
	set value of cell "D6" of tAI to "=IF(B6<60," & q & "Warning zone." & q & ",IF(B6<80," & q & "Watch zone." & q & "," & q & "Healthy zone." & q & "))"
	
	set tRed to table "RedAlerts" of sh
	if (row count of tRed) < 6 then set row count of tRed to 6
	set value of cell "A1" of tRed to "RED ALERTS"
	set value of cell "B1" of tRed to "Live warning center"
	set value of cell "A2" of tRed to "Spending"
	set value of cell "B2" of tRed to "=IF(AICoach::B3=" & q & "WARNING" & q & "," & q & "WARNING: expenses are above collected income." & q & ",IF(AICoach::B3=" & q & "WATCH" & q & "," & q & "WATCH: spending is using most of collected income." & q & "," & q & "No spending warning" & q & "))"
	set value of cell "A3" of tRed to "Income"
	set value of cell "B3" of tRed to "=IF(AICoach::B4=" & q & "WARNING" & q & "," & q & "WARNING: no collected income is supporting the plan." & q & ",IF(AICoach::B4=" & q & "WATCH" & q & "," & q & "WATCH: income target is not reached yet." & q & "," & q & "No income warning" & q & "))"
	set value of cell "A4" of tRed to "Debt"
	set value of cell "B4" of tRed to "=IF(AICoach::B5=" & q & "WARNING" & q & "," & q & "WARNING: debt payment pace is too weak for the balances/APR." & q & ",IF(AICoach::B5=" & q & "WATCH" & q & "," & q & "WATCH: extra payments are not accelerating payoff enough." & q & "," & q & "No debt warning" & q & "))"
	set value of cell "A5" of tRed to "Cashflow"
	set value of cell "B5" of tRed to "=IF(AICoach::B2=" & q & "WARNING" & q & "," & q & "WARNING: after-tax cashflow is negative or debt is too aggressive." & q & ",IF(AICoach::B2=" & q & "WATCH" & q & "," & q & "WATCH: cash cushion is thinner than ideal." & q & "," & q & "No cashflow warning" & q & "))"
	
	set tGreen to table "GreenSignals" of sh
	if (row count of tGreen) < 6 then set row count of tGreen to 6
	set value of cell "A1" of tGreen to "GREEN SIGNALS"
	set value of cell "B1" of tGreen to "Live healthy signals"
	set value of cell "A2" of tGreen to "Cashflow"
	set value of cell "B2" of tGreen to "=IF(AICoach::B2=" & q & "HEALTHY" & q & "," & q & "HEALTHY: after-tax cashflow stays positive." & q & "," & q & "Waiting for improvement" & q & ")"
	set value of cell "A3" of tGreen to "Income"
	set value of cell "B3" of tGreen to "=IF(AICoach::B4=" & q & "HEALTHY" & q & "," & q & "HEALTHY: income target is reached." & q & "," & q & "Waiting for target hit" & q & ")"
	set value of cell "A4" of tGreen to "Debt"
	set value of cell "B4" of tGreen to "=IF(AICoach::B5=" & q & "HEALTHY" & q & "," & q & "HEALTHY: extra payments are shortening payoff." & q & "," & q & "Waiting for stronger acceleration" & q & ")"
	set value of cell "A5" of tGreen to "Score"
	set value of cell "B5" of tGreen to "=IF(AICoach::B6>=80," & q & "HEALTHY: health score is strong." & q & "," & q & "Monitor score" & q & ")"
	
	set tBars to table "DynamicBars" of sh
	set value of cell "A1" of tBars to "Quick Signals"
	set value of cell "B1" of tBars to "Actual"
	set value of cell "C1" of tBars to "Target"
	set value of cell "D1" of tBars to "Dynamic Bar"
	set value of cell "E1" of tBars to "Signal"
	set value of cell "A2" of tBars to "Income Target"
	set value of cell "B2" of tBars to "=IncomeSummary::B3"
	set value of cell "C2" of tBars to "=IncomeSettings::B2"
	set value of cell "D2" of tBars to "=REPT(" & q & "=" & q & ",MAX(1,MIN(50,ROUND(B2/MAX(1,C2)*50,0))))"
	set value of cell "E2" of tBars to "=AICoach::B4"
	set value of cell "A3" of tBars to "Expense Load"
	set value of cell "B3" of tBars to "=ExpenseSummary::B10"
	set value of cell "C3" of tBars to "=IncomeSummary::B3"
	set value of cell "D3" of tBars to "=REPT(" & q & "=" & q & ",MAX(1,MIN(50,ROUND(B3/MAX(1,C3)*50,0))))"
	set value of cell "E3" of tBars to "=AICoach::B3"
	set value of cell "A4" of tBars to "After-Tax Cushion"
	set value of cell "B4" of tBars to "=MAX(0,IncomeSummary::B6-ExpenseSummary::B10)"
	set value of cell "C4" of tBars to "=IncomeSettings::B5"
	set value of cell "D4" of tBars to "=REPT(" & q & "=" & q & ",MAX(1,MIN(50,ROUND(B4/MAX(1,C4)*50,0))))"
	set value of cell "E4" of tBars to "=IF(IncomeSummary::B6-ExpenseSummary::B10<0," & q & "WARNING" & q & ",IF(IncomeSummary::B6-ExpenseSummary::B10<IncomeSettings::B5," & q & "WATCH" & q & "," & q & "HEALTHY" & q & "))"
	set value of cell "A5" of tBars to "Cash After Debt"
	set value of cell "B5" of tBars to "=MAX(0,IncomeSummary::B6-ExpenseSummary::B10-DebtSummary::B4)"
	set value of cell "C5" of tBars to "=MAX(1,IncomeSettings::B5*0.5)"
	set value of cell "D5" of tBars to "=REPT(" & q & "=" & q & ",MAX(1,MIN(50,ROUND(B5/MAX(1,C5)*50,0))))"
	set value of cell "E5" of tBars to "=IF(IncomeSummary::B6-ExpenseSummary::B10-DebtSummary::B4<0," & q & "WARNING" & q & ",IF(IncomeSummary::B6-ExpenseSummary::B10-DebtSummary::B4<IncomeSettings::B5*0.5," & q & "WATCH" & q & "," & q & "HEALTHY" & q & "))"
	set value of cell "A6" of tBars to "Health Score"
	set value of cell "B6" of tBars to "=AICoach::B6"
	set value of cell "C6" of tBars to "80"
	set value of cell "D6" of tBars to "=REPT(" & q & "=" & q & ",MAX(1,MIN(50,ROUND(B6/MAX(1,C6)*50,0))))"
	set value of cell "E6" of tBars to "=IF(B6<60," & q & "WARNING" & q & ",IF(B6<80," & q & "WATCH" & q & "," & q & "HEALTHY" & q & "))"
	set value of cell "A7" of tBars to ""
	set value of cell "B7" of tBars to ""
	set value of cell "C7" of tBars to ""
	set value of cell "D7" of tBars to ""
	set value of cell "E7" of tBars to ""
	
	set tCash to table "ChartDataCashflow" of sh
	if (row count of tCash) < 6 then set row count of tCash to 6
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
	
	set value of cell "A1" of tIncomeChart to "Income Metric"
	set value of cell "B1" of tIncomeChart to "Value"
	set value of cell "A2" of tIncomeChart to "Received"
	set value of cell "B2" of tIncomeChart to "=IncomeSummary::B3"
	set value of cell "A3" of tIncomeChart to "Outstanding"
	set value of cell "B3" of tIncomeChart to "=IncomeSummary::B4"
	set value of cell "A4" of tIncomeChart to "Target Gap"
	set value of cell "B4" of tIncomeChart to "=MAX(0,IncomeSettings::B2-IncomeSummary::B3)"
	
	set tDebtChart to table "ChartDataDebt" of sh
	set value of cell "A1" of tDebtChart to "Debt Metric"
	set value of cell "B1" of tDebtChart to "Months"
	set value of cell "A2" of tDebtChart to "Base"
	set value of cell "B2" of tDebtChart to "=IF(ISNUMBER(DebtSummary::B7),DebtSummary::B7,0)"
	set value of cell "A3" of tDebtChart to "Accelerated"
	set value of cell "B3" of tDebtChart to "=IF(ISNUMBER(DebtSummary::B8),DebtSummary::B8,0)"
	set value of cell "A4" of tDebtChart to "Saved"
	set value of cell "B4" of tDebtChart to "=MAX(0,DebtSummary::B9)"
	
	try
		delete every chart of sh
	end try
	delay 1
	
	set selection range of tCash to range "A1:B6" of tCash
	delay 1
	set cashChart to make new chart at end of sh with properties {position:{30, 860}, width:500, height:280}
	
	set selection range of tIncomeChart to range "A1:B4" of tIncomeChart
	delay 1
	set incomeChart to make new chart at end of sh with properties {position:{550, 860}, width:500, height:280}
	
	set selection range of tDebtChart to range "A1:B4" of tDebtChart
	delay 1
	set debtChart to make new chart at end of sh with properties {position:{1070, 860}, width:500, height:280}
	
	save theDoc in docPath
	export theDoc to pdfPath as PDF
	
	set reportText to "Overall=" & (formatted value of cell "B2" of tAI as string) & linefeed
	set reportText to reportText & "Reason=" & (formatted value of cell "C2" of tAI as string) & linefeed
	set reportText to reportText & "HealthScore=" & (formatted value of cell "B6" of tAI as string) & linefeed
	set reportText to reportText & "Charts=" & (count charts of sh as string)
	return reportText
end tell
